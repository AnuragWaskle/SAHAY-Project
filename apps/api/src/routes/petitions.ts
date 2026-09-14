import { Router, Response } from 'express';
import { requireAuth, optionalAuth, AuthRequest } from '../middleware/auth';
import { query, transaction } from '../db/pool';

const router = Router();

// ─── GET /petitions ───────────────────────────────────────────
router.get('/', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { city_id, demand_id } = req.query as Record<string, string>;
    const params: unknown[] = [];
    const conditions: string[] = [];
    let p = 2;

    if (city_id) {
      conditions.push(`p.city_id = $${p++}`);
      params.push(city_id);
    }
    if (demand_id) {
      conditions.push(`p.demand_id = $${p++}`);
      params.push(demand_id);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const userId = req.user?.id || null;

    const result = await query(
      `SELECT p.*,
        c.name as city_name,
        cd.title as demand_title,
        (CASE WHEN $1::uuid IS NOT NULL THEN EXISTS (
          SELECT 1 FROM petition_signatures WHERE petition_id = p.id AND user_id = $1
        ) ELSE FALSE END) as is_signed
       FROM petitions p
       LEFT JOIN cities c ON p.city_id = c.id
       LEFT JOIN civic_demands cd ON p.demand_id = cd.id
       ${where}
       ORDER BY p.signature_count DESC, p.created_at DESC`,
      [userId, ...params]
    );

    res.json({ success: true, data: result.rows });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch petitions' });
  }
});

// ─── GET /petitions/:id ────────────────────────────────────────
router.get('/:id', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id || null;
    const petitionRes = await query(
      `SELECT p.*,
        c.name as city_name,
        cd.title as demand_title,
        (CASE WHEN $2::uuid IS NOT NULL THEN EXISTS (
          SELECT 1 FROM petition_signatures WHERE petition_id = p.id AND user_id = $2
        ) ELSE FALSE END) as is_signed
       FROM petitions p
       LEFT JOIN cities c ON p.city_id = c.id
       LEFT JOIN civic_demands cd ON p.demand_id = cd.id
       WHERE p.id = $1`,
      [req.params.id, userId]
    );

    if (petitionRes.rowCount === 0) {
      res.status(404).json({ success: false, error: 'Petition not found' });
      return;
    }

    const signaturesRes = await query(
      `SELECT ps.signed_at, u.id as user_id, u.name, u.avatar_url, u.badge_type
       FROM petition_signatures ps
       JOIN users u ON ps.user_id = u.id
       WHERE ps.petition_id = $1
       ORDER BY ps.signed_at DESC
       LIMIT 50`,
      [req.params.id]
    );

    res.json({
      success: true,
      data: {
        ...petitionRes.rows[0],
        signatures: signaturesRes.rows
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch petition' });
  }
});

// ─── POST /petitions ──────────────────────────────────────────
router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { title, description, demand_id, target_entity, city_id } = req.body;
    if (!title || !description || !city_id) {
      res.status(400).json({ success: false, error: 'Title, description, and city_id are required' });
      return;
    }

    const result = await transaction(async (q) => {
      const petitionRes = await q(
        `INSERT INTO petitions (demand_id, title, description, created_by, target_entity, city_id)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [demand_id || null, title, description, req.user!.id, target_entity || null, city_id]
      );
      const petition = petitionRes.rows[0];

      // Auto-sign creator's own petition
      await q(
        `INSERT INTO petition_signatures (petition_id, user_id)
         VALUES ($1, $2)`,
        [petition.id, req.user!.id]
      );

      // Increment count to 1
      await q(
        `UPDATE petitions SET signature_count = 1 WHERE id = $1`,
        [petition.id]
      );

      petition.signature_count = 1;
      return petition;
    });

    res.status(201).json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to create petition' });
  }
});

// ─── POST /petitions/:id/sign ─────────────────────────────────
router.post('/:id/sign', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const petitionId = req.params.id;
    const userId = req.user!.id;

    await transaction(async (q) => {
      // Check if petition exists and is active
      const petitionCheck = await q('SELECT status FROM petitions WHERE id = $1', [petitionId]);
      if (petitionCheck.rowCount === 0) {
        throw new Error('Petition not found');
      }
      if (petitionCheck.rows[0].status !== 'active') {
        throw new Error('Petition is no longer active');
      }

      // Check if already signed
      const signatureCheck = await q('SELECT 1 FROM petition_signatures WHERE petition_id = $1 AND user_id = $2', [petitionId, userId]);
      if (signatureCheck.rowCount > 0) {
        return; // Already signed
      }

      await q('INSERT INTO petition_signatures (petition_id, user_id) VALUES ($1, $2)', [petitionId, userId]);
      await q('UPDATE petitions SET signature_count = signature_count + 1 WHERE id = $1', [petitionId]);
    });

    res.json({ success: true, message: 'Signed petition successfully' });
  } catch (err: any) {
    const statusCode = ['Petition not found', 'Petition is no longer active'].includes(err.message) ? 400 : 500;
    res.status(statusCode).json({ success: false, error: err.message || 'Failed to sign petition' });
  }
});

export const petitionsRouter = router;
