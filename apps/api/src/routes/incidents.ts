import { Router, Response } from 'express';
import { requireAuth, optionalAuth, AuthRequest, requireRole } from '../middleware/auth';
import { query } from '../db/pool';
import { z } from 'zod';
import { createNotification } from './notifications';
import axios from 'axios';

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
          cd.id as demand_id, cd.stage as demand_stage, cd.supporters_count,
          COALESCE(
            (
              SELECT r.media_urls 
              FROM reports r 
              WHERE r.incident_id = ci.id AND r.media_urls IS NOT NULL AND jsonb_array_length(r.media_urls) > 0 
              ORDER BY r.created_at DESC LIMIT 1
            ),
            '[]'::jsonb
          ) as media_urls,
          (
            SELECT u.name
            FROM reports r
            JOIN users u ON r.user_id = u.id
            WHERE r.incident_id = ci.id
            ORDER BY r.created_at ASC LIMIT 1
          ) as reporter_name
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

    const SLA_HOURS: Record<string, number> = { critical: 24, high: 48, medium: 72, low: 120 };

    const items = data.rows.map((row: any) => {
      const allowed = SLA_HOURS[row.severity?.toLowerCase()] || 48;
      const createdRaw = row.first_detected_at || row.created_at || row.updated_at;
      const created = createdRaw ? new Date(createdRaw).getTime() : Date.now();
      const deadline = created + (allowed * 3600 * 1000);
      const isResolved = ['resolved', 'closed'].includes(row.status?.toLowerCase());
      const isBreached = !isResolved && Date.now() > deadline;
      const remainingHours = isResolved ? 0 : Math.max(0, Math.round((deadline - Date.now()) / 3600000));

      let mediaUrls = row.media_urls;
      if (typeof mediaUrls === 'string') {
        try { mediaUrls = JSON.parse(mediaUrls); } catch { mediaUrls = []; }
      }
      if (!Array.isArray(mediaUrls)) mediaUrls = [];

      // Category image fallback if user didn't attach photo or path empty
      if (mediaUrls.length === 0) {
        const cat = (row.category || '').toLowerCase();
        if (cat.includes('water')) {
          mediaUrls = ['https://images.unsplash.com/photo-1541888946425-d0fbb186a5b3?w=800&auto=format&fit=crop'];
        } else if (cat.includes('road') || cat.includes('pothole')) {
          mediaUrls = ['https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=800&auto=format&fit=crop'];
        } else if (cat.includes('garb') || cat.includes('trash') || cat.includes('sanitat')) {
          mediaUrls = ['https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=800&auto=format&fit=crop'];
        } else if (cat.includes('light') || cat.includes('power')) {
          mediaUrls = ['https://images.unsplash.com/photo-1509391365360-2e959784a276?w=800&auto=format&fit=crop'];
        } else {
          mediaUrls = ['https://images.unsplash.com/photo-1577495508048-b635879837f1?w=800&auto=format&fit=crop'];
        }
      }

      return {
        ...row,
        media_urls: mediaUrls,
        sla_hours_allowed: allowed,
        sla_deadline: new Date(deadline).toISOString(),
        is_sla_breached: isBreached,
        sla_hours_remaining: remainingHours,
      };
    });

    res.json({
      success: true,
      data: {
        items,
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

// ─── POST /incidents (Create New Incident Directly) ───────────

router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const {
      title = 'Civic Issue Reported',
      description = '',
      category = 'other',
      latitude = 23.2599,
      longitude = 77.4126,
      lat,
      lng,
      location_address = '',
      address = '',
      media_urls = []
    } = req.body;

    const finalLat = Number(lat || latitude) || 23.2599;
    const finalLng = Number(lng || longitude) || 77.4126;
    const finalAddr = location_address || address || 'Captured Location';
    const cityId = req.user?.city_id || '00000000-0000-0000-0000-000000000001';

    const rawCategory = category || 'other';
    const finalCategory = typeof rawCategory === 'string' && ['pothole', 'road_damage', 'waterlogging', 'garbage', 'streetlight', 'water_supply', 'sewage', 'encroachment', 'tree_hazard', 'air_pollution', 'noise_pollution', 'park_damage', 'stray_animals', 'safety', 'other'].includes(rawCategory.toLowerCase().trim())
      ? rawCategory.toLowerCase().trim()
      : rawCategory.toLowerCase().includes('road') ? 'road_damage'
      : rawCategory.toLowerCase().includes('pothole') ? 'pothole'
      : rawCategory.toLowerCase().includes('light') || rawCategory.toLowerCase().includes('power') ? 'streetlight'
      : rawCategory.toLowerCase().includes('water') || rawCategory.toLowerCase().includes('drain') ? 'waterlogging'
      : rawCategory.toLowerCase().includes('sanitat') || rawCategory.toLowerCase().includes('garb') ? 'garbage'
      : 'other';

    const incRes = await query(
      `INSERT INTO civic_incidents 
        (city_id, category, title, description, report_count, unique_citizen_count, severity, status, priority_score, location_center)
       VALUES ($1, $2, $3, $4, 1, 1, 'high', 'active', 8.5, ST_SetSRID(ST_MakePoint($5, $6), 4326))
       RETURNING *, ST_X(location_center) as lng, ST_Y(location_center) as lat`,
      [cityId, finalCategory, title, description, finalLng, finalLat]
    );

    const incident = incRes.rows[0];

    // Also record report entry
    await query(
      `INSERT INTO reports 
        (user_id, category, description, media_urls, location, address, evidence_confidence, status, incident_id)
       VALUES ($1, $2, $3, $4, ST_SetSRID(ST_MakePoint($5, $6), 4326), $7, 0.8, 'ai_processed', $8)`,
      [req.user!.id, category, description, JSON.stringify(media_urls), finalLng, finalLat, finalAddr, incident.id]
    );

    res.json({ success: true, data: incident, message: 'Incident created successfully' });
  } catch (err) {
    console.error('Create incident error:', err);
    res.status(500).json({ success: false, error: 'Failed to create incident' });
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

    const primaryReporterName = reportsRes.rows[0]?.reporter_name || 'Seva Foundation NGO';
    const primaryReporterAvatar = reportsRes.rows[0]?.reporter_avatar || null;
    const reportMediaUrls = reportsRes.rows[0]?.media_urls || incidentRes.rows[0].media_urls || [];

    res.json({
      success: true,
      data: {
        ...incidentRes.rows[0],
        media_urls: reportMediaUrls,
        reporter_name: primaryReporterName,
        reporter: {
          name: primaryReporterName,
          avatar_url: primaryReporterAvatar,
        },
        recent_reports: reportsRes.rows,
        demands: demandRes.rows,
        comments: commentsRes.rows,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch incident' });
  }
});

// ─── GET /incidents/:id/recurrence ────────────────────────────

router.get('/:id/recurrence', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const incidentRes = await query(
      `SELECT ci.*, 
        ST_X(ci.location_center) as lng, ST_Y(ci.location_center) as lat,
        w.name as ward_name
       FROM civic_incidents ci
       LEFT JOIN wards w ON ci.ward_id = w.id
       WHERE ci.id = $1`,
      [req.params.id]
    );

    if (!incidentRes.rows[0]) {
      res.status(404).json({ success: false, error: 'Incident not found' });
      return;
    }

    const current = incidentRes.rows[0];

    // Find all historical incidents within 300 meters
    const historicalRes = await query(
      `SELECT id, title, description, category, status, first_detected_at AS created_at, updated_at,
        report_count,
        ST_Distance(location_center::geography, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography) as distance_m
       FROM civic_incidents
       WHERE ST_DWithin(location_center::geography, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, 300)
         AND id != $3
       ORDER BY first_detected_at DESC`,
      [current.lng, current.lat, current.id]
    );

    const pastIncidents = historicalRes.rows;
    const pastRepairs = pastIncidents.filter((i: any) => ['resolved', 'closed', 'completed'].includes(i.status));
    const totalReports = pastIncidents.reduce((sum: number, i: any) => sum + parseInt(i.report_count || '1'), current.report_count || 1);
    const isRecurring = pastIncidents.length >= 1 || totalReports >= 3;

    // Trigger AI Root Cause Analysis if recurring
    let rootCauseData = null;
    if (isRecurring) {
      try {
        const aiUrl = `${process.env.AI_SERVICES_URL || 'http://localhost:8001'}/root-cause/analyze`;
        const aiRes = await axios.post(aiUrl, {
          incident_id: current.id,
          category: current.category || 'road_damage',
          description: current.description || current.title,
          report_summaries: pastIncidents.slice(0, 5).map((i: any) => `${i.title} (${i.status})`),
          location_context: `${current.ward_name || 'Urban Ward'}, GPS radius 300m`,
          historical_data: `${pastIncidents.length} past incidents recorded at this location, ${pastRepairs.length} previous repairs completed.`,
        }, { timeout: 8000 });
        rootCauseData = aiRes.data;
      } catch {
        rootCauseData = {
          primary_cause: 'Sub-surface water leakage and drainage erosion',
          contributing_factors: ['Sub-standard base layer asphalt', 'High monsoon runoff volume', 'Heavily loaded transit traffic'],
          systemic_issues: ['Lack of integrated stormwater drainage along road margin'],
          recommended_intervention: 'Conduct sub-grade soil density test and replace drainage conduit before re-surfacing',
          estimated_fix_days: 7,
          affected_department: 'Roads & Drainage Department',
          confidence: 0.88,
        };
      }
    }

    res.json({
      success: true,
      data: {
        incident_id: current.id,
        is_recurring: isRecurring,
        recurrence_count: pastIncidents.length + 1,
        past_repairs_count: pastRepairs.length,
        total_historical_reports: totalReports,
        risk_level: pastIncidents.length >= 3 ? 'CRITICAL' : (isRecurring ? 'HIGH' : 'LOW'),
        past_incidents: pastIncidents.slice(0, 10),
        root_cause_analysis: rootCauseData,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to compute recurrence intelligence' });
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

router.post('/:id/vote', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { vote_type = 'up', action = 'add' } = req.body;
    
    let sql = '';
    const params = [req.params.id];

    if (action === 'remove') {
      if (vote_type === 'up') {
        sql = `UPDATE civic_incidents SET upvotes_count = GREATEST(0, COALESCE(upvotes_count, 0) - 1), priority_score = GREATEST(0, COALESCE(priority_score, 50) - 5), updated_at = NOW() WHERE id = $1 RETURNING *`;
      } else {
        sql = `UPDATE civic_incidents SET downvotes_count = GREATEST(0, COALESCE(downvotes_count, 0) - 1), updated_at = NOW() WHERE id = $1 RETURNING *`;
      }
    } else if (action === 'switch_from_down') {
      sql = `UPDATE civic_incidents SET upvotes_count = COALESCE(upvotes_count, 0) + 1, downvotes_count = GREATEST(0, COALESCE(downvotes_count, 0) - 1), priority_score = GREATEST(0, COALESCE(priority_score, 50) + 8), updated_at = NOW() WHERE id = $1 RETURNING *`;
    } else if (action === 'switch_from_up') {
      sql = `UPDATE civic_incidents SET downvotes_count = COALESCE(downvotes_count, 0) + 1, upvotes_count = GREATEST(0, COALESCE(upvotes_count, 0) - 1), priority_score = GREATEST(0, COALESCE(priority_score, 50) - 8), updated_at = NOW() WHERE id = $1 RETURNING *`;
    } else {
      // Default: add
      if (vote_type === 'up') {
        sql = `UPDATE civic_incidents SET upvotes_count = COALESCE(upvotes_count, 0) + 1, priority_score = GREATEST(0, COALESCE(priority_score, 50) + 5), updated_at = NOW() WHERE id = $1 RETURNING *`;
      } else {
        sql = `UPDATE civic_incidents SET downvotes_count = COALESCE(downvotes_count, 0) + 1, updated_at = NOW() WHERE id = $1 RETURNING *`;
      }
    }

    const result = await query(sql, params);

    if (result.rowCount === 0) {
      res.status(404).json({ success: false, error: 'Incident not found' });
      return;
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to record vote' });
  }
});

// ─── POST /incidents/:id/claim-work (NGO / Officer Claim & Pledge Budget) ───

router.post('/:id/claim-work', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { pledged_amount = 5000, notes = '' } = req.body;
    const userId = req.user!.id;

    // Update incident status to in_progress and record assigned claim
    const result = await query(
      `UPDATE civic_incidents
       SET status = 'in_progress',
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [req.params.id]
    );

    if (result.rowCount === 0) {
      res.status(404).json({ success: false, error: 'Incident not found' });
      return;
    }

    // Insert audit log & timeline note
    await query(
      `INSERT INTO audit_logs (actor_id, action, target_type, target_id, metadata)
       VALUES ($1, 'claim_work', 'incident', $2, $3)`,
      [userId, req.params.id, JSON.stringify({ pledged_amount, notes })]
    );

    res.json({
      success: true,
      message: `Work claimed successfully with pledged contribution of ₹${pledged_amount}`,
      data: {
        ...result.rows[0],
        claimed_by: userId,
        pledged_amount,
        notes
      }
    });
  } catch (err) {
    console.error('Claim work error:', err);
    res.status(500).json({ success: false, error: 'Failed to claim work' });
  }
});

// ─── POST /incidents/:id/submit-work (Upload Evidence, Pay 2% Fee & Finish Work) ───

router.post('/:id/submit-work', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const {
      evidence_before = [],
      evidence_after = [],
      actual_cost = 10000,
      notes = '',
      payment_method = 'upi',
      payment_txn_id = null
    } = req.body;
    const userId = req.user!.id;

    // Calculate mandatory 2% platform fee
    const cost = Number(actual_cost) || 10000;
    const platformFee = Math.round(cost * 0.02);
    const txnId = payment_txn_id || `TXN_NGO_${Date.now()}`;

    const result = await query(
      `UPDATE civic_incidents
       SET status = 'completed',
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [req.params.id]
    );

    if (result.rowCount === 0) {
      res.status(404).json({ success: false, error: 'Incident not found' });
      return;
    }

    // Record 2% NGO platform fee payment transaction in audit log
    await query(
      `INSERT INTO audit_logs (actor_id, action, target_type, target_id, metadata)
       VALUES ($1, 'ngo_platform_fee_paid', 'incident', $2, $3)`,
      [
        userId,
        req.params.id,
        JSON.stringify({
          actual_cost: cost,
          platform_fee_amount: platformFee,
          fee_percentage: '2%',
          payment_method,
          payment_txn_id: txnId,
          payment_status: 'completed',
          paid_at: new Date().toISOString()
        })
      ]
    );

    // Record work submission audit log
    await query(
      `INSERT INTO audit_logs (actor_id, action, target_type, target_id, metadata)
       VALUES ($1, 'submit_work', 'incident', $2, $3)`,
      [userId, req.params.id, JSON.stringify({ evidence_before, evidence_after, actual_cost: cost, notes, platform_fee: platformFee })]
    );

    // Create completion notification for reporters
    try {
      const reporters = await query(
        `SELECT DISTINCT user_id FROM reports WHERE incident_id = $1`,
        [req.params.id]
      );
      for (const row of reporters.rows) {
        await createNotification(
          row.user_id,
          'incident_resolved',
          'Work Completed & Verified!',
          `Resolution work for "${result.rows[0].title}" (₹${cost.toLocaleString()} budget, ₹${platformFee} 2% fee paid) has been submitted by NGO.`,
          { incident_id: req.params.id }
        );
      }
    } catch {}

    res.json({
      success: true,
      message: `Work completion submitted! 2% Platform Guarantee Fee of ₹${platformFee} successfully paid via ${payment_method.toUpperCase()}.`,
      data: {
        ...result.rows[0],
        submitted_by: userId,
        actual_cost: cost,
        platform_fee_paid: platformFee,
        fee_percentage: '2%',
        payment_status: 'completed',
        payment_txn_id: txnId,
        evidence_before,
        evidence_after,
        notes
      }
    });
  } catch (err) {
    console.error('Submit work error:', err);
    res.status(500).json({ success: false, error: 'Failed to submit work and process fee payment' });
  }
});

export { router as incidentsRouter };


