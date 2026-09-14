import { Router, Response } from 'express';
import { requireAuth, optionalAuth, AuthRequest, logAudit } from '../middleware/auth';
import { query, transaction } from '../db/pool';
import { createNotification } from './notifications';
import { awardCredits } from './credits';

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
        o.id as org_id, o.owner_user_id,
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

    const [contributionsRes, volunteersRes] = await Promise.all([
      query(
        `SELECT c.id, c.type, c.amount_hidden, c.created_at, c.note,
          (CASE WHEN c.amount_hidden = TRUE THEN NULL ELSE c.amount END) as amount,
          c.hours,
          u.name as contributor_name, u.avatar_url as contributor_avatar
         FROM contributions c
         JOIN users u ON c.user_id = u.id
         WHERE c.initiative_id = $1
         ORDER BY c.created_at DESC`,
        [req.params.id]
      ),
      query(
        `SELECT vp.*, u.name as volunteer_name, u.avatar_url
         FROM volunteer_participations vp
         JOIN users u ON vp.user_id = u.id
         WHERE vp.initiative_id = $1
         ORDER BY vp.applied_at DESC`,
        [req.params.id]
      ),
    ]);

    // Check if current user has volunteered
    let user_volunteer_status = null;
    if (req.user) {
      const vpCheck = await query(
        'SELECT status FROM volunteer_participations WHERE initiative_id = $1 AND user_id = $2',
        [req.params.id, req.user.id]
      );
      user_volunteer_status = vpCheck.rows[0]?.status || null;
    }

    res.json({
      success: true,
      data: {
        ...initRes.rows[0],
        contributions: contributionsRes.rows,
        volunteers: volunteersRes.rows,
        user_volunteer_status,
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

// ─── PATCH /initiatives/:id (org owner only) ─────────────────
router.patch('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const initRes = await query(
      `SELECT i.*, o.owner_user_id
       FROM initiatives i
       JOIN organizations o ON i.organization_id = o.id
       WHERE i.id = $1`,
      [req.params.id]
    );

    if (initRes.rowCount === 0) {
      res.status(404).json({ success: false, error: 'Initiative not found' });
      return;
    }

    if (initRes.rows[0].owner_user_id !== req.user!.id && !['super_admin', 'sub_admin'].includes(req.user!.role)) {
      res.status(403).json({ success: false, error: 'Only the organization owner can update this initiative' });
      return;
    }

    const { title, description, status, goal_amount, volunteer_target, start_date, end_date } = req.body;
    const updates: string[] = [];
    const params: unknown[] = [];
    let p = 1;

    if (title !== undefined) { updates.push(`title = $${p++}`); params.push(title); }
    if (description !== undefined) { updates.push(`description = $${p++}`); params.push(description); }
    if (status !== undefined) { updates.push(`status = $${p++}`); params.push(status); }
    if (goal_amount !== undefined) { updates.push(`goal_amount = $${p++}`); params.push(parseFloat(goal_amount)); }
    if (volunteer_target !== undefined) { updates.push(`volunteer_target = $${p++}`); params.push(parseInt(volunteer_target)); }
    if (start_date !== undefined) { updates.push(`start_date = $${p++}`); params.push(start_date || null); }
    if (end_date !== undefined) { updates.push(`end_date = $${p++}`); params.push(end_date || null); }

    if (!updates.length) {
      res.status(400).json({ success: false, error: 'No fields to update' });
      return;
    }

    const result = await query(
      `UPDATE initiatives SET ${updates.join(', ')} WHERE id = $${p} RETURNING *`,
      [...params, req.params.id]
    );

    res.json({ success: true, data: result.rows[0] });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to update initiative' });
  }
});

// ─── GET /initiatives/:id/volunteers ──────────────────────────
router.get('/:id/volunteers', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.query as Record<string, string>;
    const conditions = ['vp.initiative_id = $1'];
    const params: unknown[] = [req.params.id];
    let p = 2;

    if (status) {
      conditions.push(`vp.status = $${p++}`);
      params.push(status);
    }

    const result = await query(
      `SELECT vp.*,
        u.name as volunteer_name, u.avatar_url, u.civic_impact_score, u.level
       FROM volunteer_participations vp
       JOIN users u ON vp.user_id = u.id
       WHERE ${conditions.join(' AND ')}
       ORDER BY vp.applied_at DESC`,
      params
    );

    res.json({ success: true, data: result.rows });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch volunteers' });
  }
});

// ─── POST /initiatives/:id/volunteer (sign up as volunteer) ───
router.post('/:id/volunteer', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const initiativeId = req.params.id;
    const userId = req.user!.id;

    // Check initiative exists and is active
    const initRes = await query('SELECT * FROM initiatives WHERE id = $1', [initiativeId]);
    if (initRes.rowCount === 0) {
      res.status(404).json({ success: false, error: 'Initiative not found' });
      return;
    }
    const initiative = initRes.rows[0];
    if (initiative.status !== 'active') {
      res.status(400).json({ success: false, error: 'Initiative is not currently active' });
      return;
    }

    // Check capacity
    if (initiative.volunteer_target && initiative.volunteer_count >= initiative.volunteer_target) {
      res.status(400).json({ success: false, error: 'This initiative has reached its volunteer capacity' });
      return;
    }

    // Check if already applied
    const existingRes = await query(
      'SELECT status FROM volunteer_participations WHERE initiative_id = $1 AND user_id = $2',
      [initiativeId, userId]
    );
    if (existingRes.rows[0]) {
      const existing = existingRes.rows[0];
      if (existing.status === 'cancelled') {
        // Allow re-apply
        await query(
          `UPDATE volunteer_participations SET status = 'applied', applied_at = NOW() WHERE initiative_id = $1 AND user_id = $2`,
          [initiativeId, userId]
        );
        res.json({ success: true, message: 'Volunteer application re-submitted' });
        return;
      }
      res.status(409).json({ success: false, error: `Already ${existing.status} for this initiative` });
      return;
    }

    await query(
      `INSERT INTO volunteer_participations (initiative_id, user_id, status)
       VALUES ($1, $2, 'applied')`,
      [initiativeId, userId]
    );

    // Notify org owner
    const orgRes = await query(
      `SELECT o.owner_user_id FROM organizations o
       JOIN initiatives i ON i.organization_id = o.id
       WHERE i.id = $1`,
      [initiativeId]
    );
    if (orgRes.rows[0]) {
      await createNotification(
        orgRes.rows[0].owner_user_id,
        'volunteer_applied',
        'New Volunteer Application',
        `${req.user!.name} has applied to volunteer for "${initiative.title}"`,
        { initiative_id: initiativeId, volunteer_user_id: userId }
      );
    }

    res.status(201).json({ success: true, message: 'Volunteer application submitted! You will be notified when accepted.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to submit volunteer application' });
  }
});

// ─── DELETE /initiatives/:id/volunteer (cancel application) ───
router.delete('/:id/volunteer', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      `UPDATE volunteer_participations
       SET status = 'cancelled'
       WHERE initiative_id = $1 AND user_id = $2 AND status IN ('applied', 'accepted')
       RETURNING *`,
      [req.params.id, req.user!.id]
    );

    if (result.rowCount === 0) {
      res.status(404).json({ success: false, error: 'No active volunteer participation found' });
      return;
    }

    // Decrement count if was accepted
    if (result.rows[0].status === 'accepted') {
      await query(
        'UPDATE initiatives SET volunteer_count = GREATEST(0, volunteer_count - 1) WHERE id = $1',
        [req.params.id]
      );
    }

    res.json({ success: true, message: 'Volunteer participation cancelled' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to cancel participation' });
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
      const initCheck = await q('SELECT * FROM initiatives WHERE id = $1', [initiativeId]);
      if (initCheck.rowCount === 0) {
        throw new Error('Initiative not found');
      }

      const initiative = initCheck.rows[0];
      if (initiative.status !== 'active') {
        throw new Error('Initiative is no longer active');
      }

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

      let updates = 'contributor_count = contributor_count + 1';
      const params = [initiativeId];

      if (type === 'fund' && amount) {
        updates += `, raised_amount = raised_amount + $2`;
        params.push(amount);
      } else if (type === 'volunteer') {
        updates += `, volunteer_count = volunteer_count + 1`;
      }

      await q(`UPDATE initiatives SET ${updates} WHERE id = $1`, params);

      let impactReward = 5;
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

    // Award civic credits via centralized system (daily limits, trust multiplier)
    try {
      await awardCredits(userId, 'community_contribution', `${type} contribution to initiative`, 'initiative', initiativeId as string);
    } catch {}

    res.json({ success: true, data: result, message: 'Contribution recorded! Thank you for supporting your city.' });
  } catch (err: any) {
    const statusCode = ['Initiative not found', 'Initiative is no longer active'].includes(err.message) ? 400 : 500;
    res.status(statusCode).json({ success: false, error: err.message || 'Contribution failed' });
  }
});

export const initiativesRouter = router;
