import { Router, Response } from 'express';
import { requireAuth, optionalAuth, AuthRequest, requireRole } from '../middleware/auth';
import { query } from '../db/pool';
import { z } from 'zod';
import { createNotification } from './notifications';

const router = Router();

// ─── GET /incidents ───────────────────────────────────────────

router.get('/', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { ward_id, category, status, city_id, lat, lng, radius_m, page = '1', limit = '20' } = req.query as Record<string, string>;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const conditions: string[] = [];
    const params: unknown[] = [];
    let p = 1;

    const cityId = city_id || '00000000-0000-0000-0000-000000000001'; // Default to Bhopal
    conditions.push(`ci.city_id = $${p++}`); params.push(cityId);

    if (ward_id) { conditions.push(`ci.ward_id = $${p++}`); params.push(ward_id); }
    if (category) { conditions.push(`ci.category = $${p++}`); params.push(category); }
    if (status) { conditions.push(`ci.status = $${p++}`); params.push(status); }

    if (lat && lng && radius_m) {
      conditions.push(
        `ST_DWithin(ci.location_center::geography, ST_SetSRID(ST_MakePoint($${p++}, $${p++}), 4326)::geography, $${p++})`
      );
      params.push(parseFloat(lng), parseFloat(lat), parseFloat(radius_m));
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [data, count] = await Promise.all([
      query(
        `SELECT ci.*, 
          ST_X(ci.location_center) as lng, ST_Y(ci.location_center) as lat,
          w.name as ward_name,
          cd.id as demand_id, cd.stage as demand_stage, cd.supporters_count
         FROM civic_incidents ci
         LEFT JOIN wards w ON ci.ward_id = w.id
         LEFT JOIN civic_demands cd ON cd.incident_id = ci.id
         ${where}
         ORDER BY ci.priority_score DESC, ci.updated_at DESC
         LIMIT $${p++} OFFSET $${p++}`,
        [...params, parseInt(limit), offset]
      ),
      query(`SELECT COUNT(*) FROM civic_incidents ci ${where}`, params),
    ]);

    res.json({
      success: true,
      data: {
        items: data.rows,
        total: parseInt(count.rows[0].count),
        page: parseInt(page),
        limit: parseInt(limit),
        has_more: offset + data.rows.length < parseInt(count.rows[0].count),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch incidents' });
  }
});

// ─── GET /incidents/:id ───────────────────────────────────────

router.get('/:id', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const [incidentRes, reportsRes, demandRes, commentsRes] = await Promise.all([
      query(
        `SELECT ci.*, 
          ST_X(ci.location_center) as lng, ST_Y(ci.location_center) as lat,
          w.name as ward_name, w.ward_number,
          c.name as city_name
         FROM civic_incidents ci
         LEFT JOIN wards w ON ci.ward_id = w.id
         LEFT JOIN cities c ON ci.city_id = c.id
         WHERE ci.id = $1`,
        [req.params.id]
      ),
      query(
        `SELECT r.id, r.description, r.media_urls, r.evidence_confidence, r.created_at,
          ST_X(r.location) as lng, ST_Y(r.location) as lat,
          u.name as reporter_name, u.privacy_level, u.avatar_url as reporter_avatar
         FROM reports r
         LEFT JOIN users u ON r.user_id = u.id
         WHERE r.incident_id = $1
         ORDER BY r.created_at DESC
         LIMIT 20`,
        [req.params.id]
      ),
      query(
        `SELECT cd.*, 
          d.name as department_name,
          u.name as officer_name
         FROM civic_demands cd
         LEFT JOIN departments d ON cd.department_id = d.id
         LEFT JOIN users u ON cd.assigned_officer_id = u.id
         WHERE cd.incident_id = $1
         ORDER BY cd.created_at ASC`,
        [req.params.id]
      ),
      query(
        `SELECT ic.*, u.name, u.avatar_url, u.badge_type, u.role
         FROM incident_comments ic
         JOIN users u ON ic.user_id = u.id
         WHERE ic.incident_id = $1
         ORDER BY ic.created_at ASC
         LIMIT 50`,
        [req.params.id]
      ),
    ]);

    if (!incidentRes.rows[0]) {
      res.status(404).json({ success: false, error: 'Incident not found' });
      return;
    }

    res.json({
      success: true,
      data: {
        ...incidentRes.rows[0],
        recent_reports: reportsRes.rows,
        demands: demandRes.rows,
        comments: commentsRes.rows,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch incident' });
  }
});

// ─── POST /incidents/:id/comment ──────────────────────────────

router.post('/:id/comment', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { content } = req.body;
    if (!content?.trim()) {
      res.status(400).json({ success: false, error: 'Comment content required' });
      return;
    }

    const isOfficial = ['municipal_officer', 'elected_representative', 'ngo', 'police']
      .includes(req.user!.role);

    const result = await query(
      `INSERT INTO incident_comments (incident_id, user_id, content, is_official)
       VALUES ($1, $2, $3, $4)
       RETURNING *, (SELECT name FROM users WHERE id = $2) as name`,
      [req.params.id, req.user!.id, content.trim(), isOfficial]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to post comment' });
  }
});

// ─── PATCH /incidents/:id (admin/officer only) ────────────────

router.patch('/:id', requireAuth, requireRole('municipal_officer', 'sub_admin', 'super_admin'),
  async (req: AuthRequest, res: Response) => {
  try {
    const { status, root_cause_hypothesis, title, description } = req.body;
    const updates: string[] = [];
    const params: unknown[] = [];
    let p = 1;

    if (status) { updates.push(`status = $${p++}`); params.push(status); }
    if (root_cause_hypothesis) { updates.push(`root_cause_hypothesis = $${p++}`); params.push(root_cause_hypothesis); }
    if (title) { updates.push(`title = $${p++}`); params.push(title); }
    if (description) { updates.push(`description = $${p++}`); params.push(description); }

    if (!updates.length) {
      res.status(400).json({ success: false, error: 'No updates provided' });
      return;
    }

    const result = await query(
      `UPDATE civic_incidents SET ${updates.join(', ')} WHERE id = $${p} RETURNING *`,
      [...params, req.params.id]
    );

    if (status === 'resolved' || status === 'closed') {
      try {
        const reporters = await query(
          `SELECT DISTINCT user_id FROM reports WHERE incident_id = $1`,
          [req.params.id]
        );
        const incident = result.rows[0];
        for (const row of reporters.rows) {
          await createNotification(
            row.user_id,
            'incident_resolved',
            'Issue Resolved!',
            `"${incident.title}" has been marked as ${status}. Please verify if the issue is actually fixed.`,
            { incident_id: req.params.id, status }
          );
        }
      } catch {}
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to update incident' });
  }
});

export { router as incidentsRouter };
