import { Router, Response } from 'express';
import { requireAuth, optionalAuth, AuthRequest, requireRole } from '../middleware/auth';
import { query } from '../db/pool';

const router = Router();

// ─── GET /users (admin: list all users) ─────────────────────────
router.get('/', requireAuth, requireRole('municipal_officer', 'sub_admin', 'super_admin'), async (req: AuthRequest, res: Response) => {
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
      `SELECT u.id, u.name, u.bio, u.civic_impact_score, u.level, u.badge_type, u.avatar_url, u.role, u.verification_status,
        u.privacy_level, u.notification_pref, u.language_pref, u.phone, u.email,
        u.civic_credits, u.trust_score, u.referral_code,
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

// ─── PATCH /users/me ─────────────────────────────────────────
router.patch('/me', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { name, phone, email, bio, avatar_url, preferred_language, language_pref, city_id, privacy_level, notification_pref } = req.body;
    const updates: string[] = [];
    const params: unknown[] = [];
    let p = 1;

    if (name !== undefined) { updates.push(`name = $${p++}`); params.push(name); }
    if (phone !== undefined) { updates.push(`phone = $${p++}`); params.push(phone); }
    if (email !== undefined) { updates.push(`email = $${p++}`); params.push(email); }
    if (bio !== undefined) { updates.push(`bio = $${p++}`); params.push(bio); }
    if (avatar_url !== undefined) { updates.push(`avatar_url = $${p++}`); params.push(avatar_url); }
    if (preferred_language !== undefined || language_pref !== undefined) { updates.push(`language_pref = $${p++}`); params.push(language_pref || preferred_language); }
    if (city_id !== undefined) { updates.push(`city_id = $${p++}`); params.push(city_id || null); }
    if (privacy_level !== undefined) { updates.push(`privacy_level = $${p++}`); params.push(privacy_level); }
    if (notification_pref !== undefined) { updates.push(`notification_pref = $${p++}`); params.push(notification_pref); }

    if (!updates.length) {
      res.status(400).json({ success: false, error: 'No fields to update' });
      return;
    }

    updates.push(`updated_at = NOW()`);

    const result = await query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${p} RETURNING id, name, email, phone, bio, avatar_url, language_pref, city_id, role, civic_impact_score, level, badge_type`,
      [...params, req.user!.id]
    );

    res.json({ success: true, data: result.rows[0] });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to update profile' });
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
