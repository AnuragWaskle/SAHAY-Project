import { Router, Response } from 'express';
import { requireAuth, optionalAuth, AuthRequest } from '../middleware/auth';
import { query, transaction } from '../db/pool';

const router = Router();

// ─── GET /initiatives ─────────────────────────────────────────
router.get('/', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { organization_id, incident_id, status } = req.query as Record<string, string>;
    const params: unknown[] = [];
    const conditions: string[] = [];
    let p = 1;

    if (organization_id) {
      conditions.push(`i.organization_id = $${p++}`);
      params.push(organization_id);
    }
    if (incident_id) {
      conditions.push(`i.incident_id = $${p++}`);
      params.push(incident_id);
    }
    if (status) {
      conditions.push(`i.status = $${p++}`);
      params.push(status);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await query(
      `SELECT i.*, 
        o.name as organization_name, o.logo_url as organization_logo,
        ci.title as incident_title
       FROM initiatives i
       JOIN organizations o ON i.organization_id = o.id
       LEFT JOIN civic_incidents ci ON i.incident_id = ci.id
       ${where}
       ORDER BY i.created_at DESC`,
      params
    );

    res.json({ success: true, data: result.rows });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch initiatives' });
  }
});

// ─── GET /initiatives/:id ─────────────────────────────────────
router.get('/:id', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const initRes = await query(
      `SELECT i.*, 
        o.name as organization_name, o.logo_url as organization_logo, o.description as organization_desc,
        ci.title as incident_title
       FROM initiatives i
       JOIN organizations o ON i.organization_id = o.id
       LEFT JOIN civic_incidents ci ON i.incident_id = ci.id
       WHERE i.id = $1`,
      [req.params.id]
    );

    if (initRes.rowCount === 0) {
      res.status(404).json({ success: false, error: 'Initiative not found' });
      return;
    }

    const contributionsRes = await query(
      `SELECT c.id, c.type, c.amount_hidden, c.created_at, c.note,
        (CASE WHEN c.amount_hidden = TRUE THEN NULL ELSE c.amount END) as amount,
        c.hours,
        u.name as contributor_name, u.avatar_url as contributor_avatar
       FROM contributions c
       JOIN users u ON c.user_id = u.id
       WHERE c.initiative_id = $1
       ORDER BY c.created_at DESC`,
      [req.params.id]
    );

    res.json({
      success: true,
      data: {
        ...initRes.rows[0],
        contributions: contributionsRes.rows
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch initiative' });
  }
});

// ─── POST /initiatives ────────────────────────────────────────
router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { title, description, type, goal_amount, volunteer_target, incident_id, start_date, end_date } = req.body;

    if (!title || !description || !type) {
      res.status(400).json({ success: false, error: 'Title, description, and type are required' });
      return;
    }

    // Check if user owns an organization
    const orgRes = await query(
      `SELECT id, verification_status FROM organizations WHERE owner_user_id = $1`,
      [req.user!.id]
    );

    if (orgRes.rowCount === 0) {
      res.status(403).json({ success: false, error: 'Only registered organizations can create initiatives.' });
      return;
    }

    const org = orgRes.rows[0];
    if (org.verification_status !== 'verified') {
      res.status(403).json({ success: false, error: 'Your organization must be verified to post initiatives.' });
      return;
    }

    const result = await query(
      `INSERT INTO initiatives (organization_id, incident_id, title, description, type, goal_amount, volunteer_target, start_date, end_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        org.id,
        incident_id || null,
        title,
        description,
        type,
        goal_amount ? parseFloat(goal_amount) : null,
        volunteer_target ? parseInt(volunteer_target) : null,
        start_date || null,
        end_date || null
      ]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to create initiative' });
  }
});

// ─── POST /initiatives/:id/contribute ─────────────────────────
router.post('/:id/contribute', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const initiativeId = req.params.id;
    const userId = req.user!.id;
    const { type, amount, hours, amount_hidden = true, note } = req.body;

    if (!type) {
      res.status(400).json({ success: false, error: 'Contribution type is required' });
      return;
    }

    const result = await transaction(async (q) => {
      // Get initiative status
      const initCheck = await q('SELECT * FROM initiatives WHERE id = $1', [initiativeId]);
      if (initCheck.rowCount === 0) {
        throw new Error('Initiative not found');
      }

      const initiative = initCheck.rows[0];
      if (initiative.status !== 'active') {
        throw new Error('Initiative is no longer active');
      }

      // Create contribution
      const contribRes = await q(
        `INSERT INTO contributions (initiative_id, user_id, type, amount_hidden, amount, hours, note)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
          initiativeId,
          userId,
          type,
          amount_hidden,
          amount ? parseFloat(amount) : null,
          hours ? parseFloat(hours) : null,
          note || null
        ]
      );

      // Update initiative aggregate stats
      let updates = 'contributor_count = contributor_count + 1';
      const params = [initiativeId];

      if (type === 'fund' && amount) {
        updates += `, raised_amount = raised_amount + $2`;
        params.push(amount);
      } else if (type === 'volunteer') {
        updates += `, volunteer_count = volunteer_count + 1`;
      }

      await q(`UPDATE initiatives SET ${updates} WHERE id = $1`, params);

      // Reward civic impact score
      let impactReward = 5; // Base reward
      if (type === 'fund') impactReward = 15;
      if (type === 'volunteer') impactReward = 25;

      await q(
        `UPDATE users SET civic_impact_score = civic_impact_score + $1, 
          level = CASE 
            WHEN civic_impact_score + $1 >= 5000 THEN 5
            WHEN civic_impact_score + $1 >= 2000 THEN 4
            WHEN civic_impact_score + $1 >= 500 THEN 3
            WHEN civic_impact_score + $1 >= 100 THEN 2
            ELSE 1 
          END,
          updated_at = NOW()
         WHERE id = $2`,
        [impactReward, userId]
      );

      return contribRes.rows[0];
    });

    res.json({ success: true, data: result, message: 'Contribution recorded! Thank you for supporting your city.' });
  } catch (err: any) {
    const statusCode = ['Initiative not found', 'Initiative is no longer active'].includes(err.message) ? 400 : 500;
    res.status(statusCode).json({ success: false, error: err.message || 'Contribution failed' });
  }
});

export const initiativesRouter = router;
