import { Router, Response } from 'express';
import { requireAuth, optionalAuth, AuthRequest, logAudit } from '../middleware/auth';
import { query } from '../db/pool';
import { createNotification } from './notifications';

const router = Router();

// ─── GET /organizations ──────────────────────────────────────

router.get('/', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { type, verified_only = 'true', ward_id, search, page = '1', limit = '20' } = req.query as Record<string, string>;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const conditions: string[] = [];
    const params: unknown[] = [];
    let p = 1;

    if (type) { conditions.push(`o.type = $${p++}`); params.push(type); }
    if (verified_only === 'true') { conditions.push(`o.verification_status = $${p++}`); params.push('verified'); }
    if (search) { conditions.push(`o.name ILIKE $${p++}`); params.push(`%${search}%`); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await query(
      `SELECT o.*,
        (SELECT COUNT(*) FROM initiatives WHERE organization_id = o.id) as initiative_count
       FROM organizations o
       ${where}
       ORDER BY o.name
       LIMIT $${p++} OFFSET $${p++}`,
      [...params, parseInt(limit), offset]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch organizations' });
  }
});

// ─── GET /organizations/:id ──────────────────────────────────

router.get('/:id', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const [orgRes, initRes, statsRes] = await Promise.all([
      query('SELECT * FROM organizations WHERE id = $1', [req.params.id]),
      query(
        `SELECT i.*, ci.title as incident_title
         FROM initiatives i
         LEFT JOIN civic_incidents ci ON i.incident_id = ci.id
         WHERE i.organization_id = $1
         ORDER BY i.created_at DESC`,
        [req.params.id]
      ),
      query(
        `SELECT
          COUNT(*) FILTER (WHERE i.status = 'completed') as completed_initiatives,
          COALESCE(SUM(i.volunteer_count), 0) as total_volunteers,
          COALESCE(SUM(i.contributor_count), 0) as total_contributors
         FROM initiatives i WHERE i.organization_id = $1`,
        [req.params.id]
      ),
    ]);
    if (!orgRes.rows[0]) { res.status(404).json({ success: false, error: 'Organization not found' }); return; }
    res.json({
      success: true,
      data: {
        ...orgRes.rows[0],
        initiatives: initRes.rows,
        stats: statsRes.rows[0] || {},
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch organization' });
  }
});

// ─── POST /organizations ─────────────────────────────────────

router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { type, name, registration_number, contact, description, focus_areas = [], operating_wards = [], logo_url } = req.body;

    if (!type || !name) {
      res.status(400).json({ success: false, error: 'Organization type and name are required' });
      return;
    }

    const result = await query(
      `INSERT INTO organizations (type, name, registration_number, contact, description, focus_areas, operating_wards, owner_user_id, logo_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [type, name, registration_number || null, JSON.stringify(contact || {}), description || null, JSON.stringify(focus_areas), JSON.stringify(operating_wards), req.user!.id, logo_url || null]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to create organization' });
  }
});

// ─── PATCH /organizations/:id (owner only) ───────────────────

router.patch('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const orgRes = await query('SELECT * FROM organizations WHERE id = $1', [req.params.id]);
    if (!orgRes.rows[0]) {
      res.status(404).json({ success: false, error: 'Organization not found' });
      return;
    }
    if (orgRes.rows[0].owner_user_id !== req.user!.id && !['super_admin', 'sub_admin'].includes(req.user!.role)) {
      res.status(403).json({ success: false, error: 'Only the organization owner can update it' });
      return;
    }

    const { name, description, contact, focus_areas, operating_wards, logo_url } = req.body;
    const updates: string[] = [];
    const params: unknown[] = [];
    let p = 1;

    if (name !== undefined) { updates.push(`name = $${p++}`); params.push(name); }
    if (description !== undefined) { updates.push(`description = $${p++}`); params.push(description); }
    if (contact !== undefined) { updates.push(`contact = $${p++}`); params.push(JSON.stringify(contact)); }
    if (focus_areas !== undefined) { updates.push(`focus_areas = $${p++}`); params.push(JSON.stringify(focus_areas)); }
    if (operating_wards !== undefined) { updates.push(`operating_wards = $${p++}`); params.push(JSON.stringify(operating_wards)); }
    if (logo_url !== undefined) { updates.push(`logo_url = $${p++}`); params.push(logo_url); }

    if (!updates.length) {
      res.status(400).json({ success: false, error: 'No fields to update' });
      return;
    }

    const result = await query(
      `UPDATE organizations SET ${updates.join(', ')} WHERE id = $${p} RETURNING *`,
      [...params, req.params.id]
    );

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to update organization' });
  }
});

// ─── GET /organizations/:id/volunteers ───────────────────────

router.get('/:id/volunteers', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.query as Record<string, string>;
    const conditions = ['vp.initiative_id IN (SELECT id FROM initiatives WHERE organization_id = $1)'];
    const params: unknown[] = [req.params.id];
    let p = 2;

    if (status) {
      conditions.push(`vp.status = $${p++}`);
      params.push(status);
    }

    const result = await query(
      `SELECT vp.*,
        u.name as volunteer_name, u.avatar_url, u.civic_impact_score, u.phone, u.email,
        i.title as initiative_title, i.type as initiative_type
       FROM volunteer_participations vp
       JOIN users u ON vp.user_id = u.id
       JOIN initiatives i ON vp.initiative_id = i.id
       WHERE ${conditions.join(' AND ')}
       ORDER BY vp.applied_at DESC`,
      params
    );

    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch volunteers' });
  }
});

// ─── POST /organizations/:id/initiatives/:initId/volunteers/:userId/accept ──

router.post('/:id/initiatives/:initId/volunteers/:userId/accept', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    // Verify ownership
    const orgRes = await query('SELECT owner_user_id FROM organizations WHERE id = $1', [req.params.id]);
    if (!orgRes.rows[0]) {
      res.status(404).json({ success: false, error: 'Organization not found' });
      return;
    }
    if (orgRes.rows[0].owner_user_id !== req.user!.id && !['super_admin', 'sub_admin'].includes(req.user!.role)) {
      res.status(403).json({ success: false, error: 'Only the organization owner can accept volunteers' });
      return;
    }

    const { action = 'accept' } = req.body; // accept|reject
    const newStatus = action === 'reject' ? 'rejected' : 'accepted';
    const timeField = action === 'reject' ? '' : ', accepted_at = NOW()';

    const result = await query(
      `UPDATE volunteer_participations
       SET status = $1 ${timeField}
       WHERE initiative_id = $2 AND user_id = $3
       RETURNING *`,
      [newStatus, req.params.initId, req.params.userId as string]
    );

    if (result.rowCount === 0) {
      res.status(404).json({ success: false, error: 'Volunteer participation not found' });
      return;
    }

    // Update initiative volunteer count if accepting
    if (action !== 'reject') {
      await query(
        'UPDATE initiatives SET volunteer_count = volunteer_count + 1 WHERE id = $1',
        [req.params.initId]
      );
    }

    // Notify volunteer
    const initRes = await query('SELECT title FROM initiatives WHERE id = $1', [req.params.initId]);
    const initTitle = initRes.rows[0]?.title || 'an initiative';
    await createNotification(
      req.params.userId as string,
      `volunteer_${newStatus}`,
      newStatus === 'accepted' ? 'Volunteer Application Accepted!' : 'Volunteer Application Update',
      newStatus === 'accepted'
        ? `Your volunteer application for "${initTitle}" has been accepted. Welcome aboard!`
        : `Your volunteer application for "${initTitle}" was not accepted.`,
      { initiative_id: req.params.initId }
    );

    await logAudit(req.user!.id, `volunteer_${newStatus}`, 'volunteer_participation', result.rows[0].id, {
      initiative_id: req.params.initId,
      volunteer_user_id: req.params.userId as string,
    });

    res.json({ success: true, data: result.rows[0], message: `Volunteer ${newStatus}` });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to update volunteer status' });
  }
});

// ─── POST /organizations/:id/initiatives/:initId/volunteers/:userId/complete ──

router.post('/:id/initiatives/:initId/volunteers/:userId/complete', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const orgRes = await query('SELECT owner_user_id FROM organizations WHERE id = $1', [req.params.id]);
    if (!orgRes.rows[0] || (orgRes.rows[0].owner_user_id !== req.user!.id && !['super_admin', 'sub_admin'].includes(req.user!.role))) {
      res.status(403).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const { hours_logged, organizer_feedback } = req.body;

    const result = await query(
      `UPDATE volunteer_participations
       SET status = 'completed', completed_at = NOW(), hours_logged = $1, organizer_feedback = $2
       WHERE initiative_id = $3 AND user_id = $4 AND status = 'accepted'
       RETURNING *`,
      [hours_logged || null, organizer_feedback || null, req.params.initId, req.params.userId as string]
    );

    if (result.rowCount === 0) {
      res.status(404).json({ success: false, error: 'Accepted volunteer participation not found' });
      return;
    }

    // Reward civic impact score for completed volunteering
    const reward = Math.max(25, Math.round((hours_logged || 1) * 10));
    await query(
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
      [reward, req.params.userId as string]
    );

    await createNotification(
      req.params.userId as string,
      'volunteer_completed',
      'Volunteering Completed!',
      `Your volunteer work has been marked as completed. +${reward} Civic Impact Points!`,
      { initiative_id: req.params.initId, hours_logged }
    );

    res.json({ success: true, data: result.rows[0], message: 'Volunteer participation marked as completed' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to complete volunteer participation' });
  }
});

export { router as organizationsRouter };
