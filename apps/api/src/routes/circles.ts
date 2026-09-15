import { Router, Response } from 'express';
import { requireAuth, optionalAuth, AuthRequest } from '../middleware/auth';
import { query, transaction } from '../db/pool';

const router = Router();

// ─── GET /circles ─────────────────────────────────────────────
router.get('/', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { city_id, ward_id, search } = req.query as Record<string, string>;
    const params: unknown[] = [];
    const conditions: string[] = [];
    let p = 2;

    if (city_id) {
      conditions.push(`c.city_id = $${p++}`);
      params.push(city_id);
    }
    if (ward_id) {
      conditions.push(`c.ward_id = $${p++}`);
      params.push(ward_id);
    }
    if (search) {
      conditions.push(`c.name ILIKE $${p++}`);
      params.push(`%${search}%`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const userId = req.user?.id || null;

    const result = await query(
      `SELECT c.*,
        w.name as ward_name,
        ci.name as city_name,
        (CASE WHEN $1::uuid IS NOT NULL THEN EXISTS (
          SELECT 1 FROM circle_members WHERE circle_id = c.id AND user_id = $1
        ) ELSE FALSE END) as is_member
       FROM circles c
       LEFT JOIN wards w ON c.ward_id = w.id
       LEFT JOIN cities ci ON c.city_id = ci.id
       ${where}
       ORDER BY c.member_count DESC, c.name ASC`,
      [userId, ...params]
    );

    res.json({ success: true, data: result.rows });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch circles' });
  }
});

// ─── GET /circles/:id ──────────────────────────────────────────
router.get('/:id', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id || null;
    const circleRes = await query(
      `SELECT c.*,
        w.name as ward_name,
        ci.name as city_name,
        (CASE WHEN $2::uuid IS NOT NULL THEN EXISTS (
          SELECT 1 FROM circle_members WHERE circle_id = c.id AND user_id = $2
        ) ELSE FALSE END) as is_member
       FROM circles c
       LEFT JOIN wards w ON c.ward_id = w.id
       LEFT JOIN cities ci ON c.city_id = ci.id
       WHERE c.id = $1`,
      [req.params.id, userId]
    );

    if (circleRes.rowCount === 0) {
      res.status(404).json({ success: false, error: 'Circle not found' });
      return;
    }

    const membersRes = await query(
      `SELECT cm.joined_at, cm.role, u.id as user_id, u.name, u.avatar_url, u.role as user_role, u.badge_type
       FROM circle_members cm
       JOIN users u ON cm.user_id = u.id
       WHERE cm.circle_id = $1
       ORDER BY cm.joined_at ASC`,
      [req.params.id]
    );

    res.json({
      success: true,
      data: {
        ...circleRes.rows[0],
        members: membersRes.rows
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch circle' });
  }
});

// ─── POST /circles ────────────────────────────────────────────
router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { name, type, description, city_id, ward_id, avatar_url } = req.body;
    if (!name || !city_id) {
      res.status(400).json({ success: false, error: 'Name and city_id are required' });
      return;
    }

    const result = await transaction(async (q) => {
      const circleRes = await q(
        `INSERT INTO circles (name, type, description, city_id, ward_id, avatar_url, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [name, type || 'general', description || null, city_id, ward_id || null, avatar_url || null, req.user!.id]
      );
      const circle = circleRes.rows[0];

      // Auto-add creator as admin member
      await q(
        `INSERT INTO circle_members (circle_id, user_id, role)
         VALUES ($1, $2, 'admin')`,
        [circle.id, req.user!.id]
      );

      // Set member count to 1
      await q(
        `UPDATE circles SET member_count = 1 WHERE id = $1`,
        [circle.id]
      );

      circle.member_count = 1;
      return circle;
    });

    res.status(201).json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to create circle' });
  }
});

// ─── POST /circles/:id/join ───────────────────────────────────
router.post('/:id/join', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const circleId = req.params.id;
    const userId = req.user!.id;

    await transaction(async (q) => {
      // Check if circle exists
      const circleCheck = await q('SELECT id FROM circles WHERE id = $1', [circleId]);
      if (circleCheck.rowCount === 0) {
        throw new Error('Circle not found');
      }

      // Check if already a member
      const memberCheck = await q('SELECT 1 FROM circle_members WHERE circle_id = $1 AND user_id = $2', [circleId, userId]);
      if (memberCheck.rowCount > 0) {
        return; // Already a member
      }

      await q('INSERT INTO circle_members (circle_id, user_id) VALUES ($1, $2)', [circleId, userId]);
      await q('UPDATE circles SET member_count = member_count + 1 WHERE id = $1', [circleId]);
    });

    res.json({ success: true, message: 'Joined circle successfully' });
  } catch (err: any) {
    const statusCode = err.message === 'Circle not found' ? 404 : 500;
    res.status(statusCode).json({ success: false, error: err.message || 'Failed to join circle' });
  }
});

// ─── POST /circles/:id/leave ──────────────────────────────────
router.post('/:id/leave', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const circleId = req.params.id;
    const userId = req.user!.id;

    await transaction(async (q) => {
      // Check if circle exists
      const circleCheck = await q('SELECT id FROM circles WHERE id = $1', [circleId]);
      if (circleCheck.rowCount === 0) {
        throw new Error('Circle not found');
      }

      // Delete member
      const delRes = await q('DELETE FROM circle_members WHERE circle_id = $1 AND user_id = $2', [circleId, userId]);
      if (delRes.rowCount > 0) {
        await q('UPDATE circles SET member_count = GREATEST(0, member_count - 1) WHERE id = $1', [circleId]);
      }
    });

    res.json({ success: true, message: 'Left circle successfully' });
  } catch (err: any) {
    const statusCode = err.message === 'Circle not found' ? 404 : 500;
    res.status(statusCode).json({ success: false, error: err.message || 'Failed to leave circle' });
  }
});

// ─── GET /circles/:id/messages (fetch circle discussion thread) ──
router.get('/:id/messages', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const circleId = req.params.id;
    const memberCheck = await query(
      'SELECT 1 FROM circle_members WHERE circle_id = $1 AND user_id = $2',
      [circleId, req.user!.id]
    );
    if (memberCheck.rowCount === 0) {
      res.status(403).json({ success: false, error: 'You must join this circle to view messages' });
      return;
    }

    const messages = await query(
      `SELECT cm.*, u.name as user_name, u.avatar_url
       FROM circle_messages cm
       JOIN users u ON cm.user_id = u.id
       WHERE cm.circle_id = $1
       ORDER BY cm.created_at ASC LIMIT 100`,
      [circleId]
    );
    res.json({ success: true, data: messages.rows });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch messages' });
  }
});

// ─── POST /circles/:id/messages (post message to circle) ──────────
router.post('/:id/messages', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const circleId = req.params.id;
    const { message } = req.body;
    if (!message?.trim()) {
      res.status(400).json({ success: false, error: 'Message content required' });
      return;
    }

    const memberCheck = await query(
      'SELECT 1 FROM circle_members WHERE circle_id = $1 AND user_id = $2',
      [circleId, req.user!.id]
    );
    if (memberCheck.rowCount === 0) {
      res.status(403).json({ success: false, error: 'You must join this circle to post messages' });
      return;
    }

    const result = await query(
      `INSERT INTO circle_messages (circle_id, user_id, message)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [circleId, req.user!.id, message.trim()]
    );
    
    const msg = {
      ...result.rows[0],
      user_name: req.user!.name,
      avatar_url: (req.user as any).avatar_url || null
    };

    res.status(201).json({ success: true, data: msg });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to post message' });
  }
});

export const circlesRouter = router;
