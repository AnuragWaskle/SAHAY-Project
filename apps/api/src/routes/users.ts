import { Router, Response } from 'express';
import { requireAuth, optionalAuth, AuthRequest, requireRole } from '../middleware/auth';
import { query } from '../db/pool';

const router = Router();

// ─── GET /users (admin: list all users) ─────────────────────────
router.get('/', requireAuth, requireRole('sub_admin', 'super_admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { role, search, page = '1', limit = '20' } = req.query as Record<string, string>;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const conditions: string[] = [];
    const params: unknown[] = [];
    let p = 1;

    if (role) { conditions.push(`u.role = $${p++}`); params.push(role); }
    if (search) { conditions.push(`u.name ILIKE $${p++}`); params.push(`%${search}%`); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [data, count] = await Promise.all([
      query(
        `SELECT u.id, u.name, u.email, u.phone, u.role, u.verification_status, u.badge_type,
          u.civic_impact_score, u.level, u.created_at,
          c.name as city_name
         FROM users u
         LEFT JOIN cities c ON u.city_id = c.id
         ${where}
         ORDER BY u.created_at DESC
         LIMIT $${p++} OFFSET $${p++}`,
        [...params, parseInt(limit), offset]
      ),
      query(`SELECT COUNT(*) FROM users u ${where}`, params),
    ]);

    res.json({
      success: true,
      data: {
        items: data.rows,
        total: parseInt(count.rows[0].count),
        page: parseInt(page),
        limit: parseInt(limit),
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch users' });
  }
});

// ─── GET /users/me ────────────────────────────────────────────
// Fetch currently logged in user profile (called by mobile client)
router.get('/me', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      `SELECT u.id, u.name, u.civic_impact_score, u.level, u.badge_type, u.avatar_url, u.role, u.verification_status,
        (SELECT COUNT(*) FROM reports WHERE user_id = u.id) as report_count,
        (SELECT COUNT(*) FROM resolution_verifications WHERE user_id = u.id) as resolved_count
       FROM users u
       WHERE u.id = $1`,
      [req.user!.id]
    );

    if (result.rowCount === 0) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch profile' });
  }
});

// ─── GET /users/:id ───────────────────────────────────────────
// Fetch public profile info by ID
router.get('/:id', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      `SELECT u.id, u.name, u.civic_impact_score, u.level, u.badge_type, u.avatar_url, u.role, u.bio,
        (SELECT COUNT(*) FROM reports WHERE user_id = u.id) as report_count,
        (SELECT COUNT(*) FROM resolution_verifications WHERE user_id = u.id) as resolved_count
       FROM users u
       WHERE u.id = $1`,
      [req.params.id]
    );

    if (result.rowCount === 0) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch user profile' });
  }
});

export const userRouter = router;
