import { Router, Response } from 'express';
import { requireAuth, AuthRequest, logAudit } from '../middleware/auth';
import { query } from '../db/pool';
import { z } from 'zod';

const router = Router();

// ─── POST /auth/verify-token ──────────────────────────────────
// Called by client after Firebase auth to create/fetch the user in PostgreSQL

router.post('/verify-token', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { name, phone, email, language_pref, city_id } = req.body;
    const user = req.user!;

    // Update profile data if provided
    if (name || phone || email || language_pref || city_id) {
      const updates: string[] = [];
      const params: unknown[] = [];
      let p = 1;

      if (name) { updates.push(`name = $${p++}`); params.push(name); }
      if (phone) { updates.push(`phone = $${p++}`); params.push(phone); }
      if (email) { updates.push(`email = $${p++}`); params.push(email); }
      if (language_pref) { updates.push(`language_pref = $${p++}`); params.push(language_pref); }
      if (city_id) { updates.push(`city_id = $${p++}`); params.push(city_id); }

      await query(
        `UPDATE users SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${p}`,
        [...params, user.id]
      );
    }

    const result = await query(
      `SELECT u.*, 
        c.name as city_name,
        w.name as ward_name,
        (SELECT COUNT(*) FROM reports WHERE user_id = u.id) as report_count,
        (SELECT COUNT(*) FROM demand_supporters WHERE user_id = u.id) as demands_supported,
        (SELECT json_agg(json_build_object('code', b.code, 'name', b.name, 'icon', b.icon, 'earned_at', ub.earned_at))
         FROM user_badges ub JOIN badges b ON ub.badge_id = b.id WHERE ub.user_id = u.id) as badges
       FROM users u
       LEFT JOIN cities c ON u.city_id = c.id
       LEFT JOIN wards w ON u.jurisdiction_id = w.id
       WHERE u.id = $1`,
      [user.id]
    );

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to verify token' });
  }
});

// ─── GET /auth/me ─────────────────────────────────────────────

router.get('/me', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      `SELECT u.*,
        c.name as city_name,
        (SELECT COUNT(*) FROM reports WHERE user_id = u.id) as report_count,
        (SELECT COUNT(*) FROM demand_supporters WHERE user_id = u.id) as demands_supported,
        (SELECT COUNT(*) FROM resolution_verifications WHERE user_id = u.id) as verifications_done,
        (SELECT json_agg(json_build_object('code', b.code, 'name', b.name, 'icon', b.icon, 'earned_at', ub.earned_at))
         FROM user_badges ub JOIN badges b ON ub.badge_id = b.id WHERE ub.user_id = u.id) as badges
       FROM users u
       LEFT JOIN cities c ON u.city_id = c.id
       WHERE u.id = $1`,
      [req.user!.id]
    );

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch user' });
  }
});

// ─── PATCH /auth/me ───────────────────────────────────────────

router.patch('/me', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { name, bio, avatar_url, language_pref, privacy_level, notification_pref, city_id } = req.body;
    const updates: string[] = [];
    const params: unknown[] = [];
    let p = 1;

    if (name) { updates.push(`name = $${p++}`); params.push(name); }
    if (bio !== undefined) { updates.push(`bio = $${p++}`); params.push(bio); }
    if (avatar_url) { updates.push(`avatar_url = $${p++}`); params.push(avatar_url); }
    if (language_pref) { updates.push(`language_pref = $${p++}`); params.push(language_pref); }
    if (privacy_level) { updates.push(`privacy_level = $${p++}`); params.push(privacy_level); }
    if (notification_pref) { updates.push(`notification_pref = $${p++}`); params.push(notification_pref); }
    if (city_id) { updates.push(`city_id = $${p++}`); params.push(city_id); }

    if (!updates.length) {
      res.status(400).json({ success: false, error: 'No updates provided' });
      return;
    }

    const result = await query(
      `UPDATE users SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${p} RETURNING *`,
      [...params, req.user!.id]
    );

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to update profile' });
  }
});

// ─── POST /auth/request-verification ─────────────────────────

router.post('/request-verification', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { role_applied, documents } = req.body;

    if (!role_applied || !documents?.length) {
      res.status(400).json({ success: false, error: 'role_applied and documents required' });
      return;
    }

    const result = await query(
      `INSERT INTO verification_requests (user_id, role_applied, documents)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [req.user!.id, role_applied, JSON.stringify(documents)]
    );

    // Update user status to pending
    await query(
      `UPDATE users SET verification_status = 'pending' WHERE id = $1`,
      [req.user!.id]
    );

    await logAudit(req.user!.id, 'verification_requested', 'verification_request', result.rows[0].id, { role_applied });

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to submit verification request' });
  }
});

// ─── GET /auth/verified-directory ─────────────────────────────

router.get('/verified-directory', async (req, res) => {
  try {
    const { role, city_id, search, page = '1', limit = '20' } = req.query as Record<string, string>;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const conditions = [`u.verification_status = 'verified' AND u.badge_type != 'none'`];
    const params: unknown[] = [];
    let p = 1;

    if (role) { conditions.push(`u.role = $${p++}`); params.push(role); }
    if (city_id) { conditions.push(`u.city_id = $${p++}`); params.push(city_id); }
    if (search) {
      conditions.push(`u.name ILIKE $${p++}`);
      params.push(`%${search}%`);
    }

    const result = await query(
      `SELECT u.id, u.name, u.role, u.badge_type, u.bio, u.avatar_url, u.civic_impact_score,
        c.name as city_name
       FROM users u
       LEFT JOIN cities c ON u.city_id = c.id
       WHERE ${conditions.join(' AND ')}
       ORDER BY u.civic_impact_score DESC
       LIMIT $${p++} OFFSET $${p++}`,
      [...params, parseInt(limit), offset]
    );

    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch directory' });
  }
});

export { router as authRouter };
