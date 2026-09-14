import { Router, Response } from 'express';
import { requireAuth, optionalAuth, AuthRequest, requireRole } from '../middleware/auth';
import { query, transaction } from '../db/pool';
import { z } from 'zod';
import { io } from '../index';
import { createNotification } from './notifications';
import { awardCredits } from './credits';

const router = Router();

const STAGE_TRANSITIONS: Record<string, string[]> = {
  'proposed': ['community_supported', 'rejected'],
  'community_supported': ['submitted'],
  'submitted': ['accepted', 'rejected'],
  'accepted': ['work_planned'],
  'work_planned': ['in_progress'],
  'in_progress': ['completed'],
  'completed': ['citizen_verification'],
  'citizen_verification': ['resolved', 'reopened'],
  'resolved': ['reopened'],
  'reopened': ['submitted'],
};

// ─── GET /demands ──────────────────────────────────────────────

router.get('/', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { incident_id, stage, city_id, department_id, page = '1', limit = '20' } = req.query as Record<string, string>;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const params: unknown[] = [];
    const conditions: string[] = [];
    let p = 1;

    if (incident_id) { conditions.push(`cd.incident_id = $${p++}`); params.push(incident_id); }
    if (stage) { conditions.push(`cd.stage = $${p++}`); params.push(stage); }
    if (department_id) { conditions.push(`cd.department_id = $${p++}`); params.push(department_id); }
    if (city_id) { conditions.push(`ci.city_id = $${p++}`); params.push(city_id); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [data, count] = await Promise.all([
      query(
        `SELECT cd.*, ci.title as incident_title, ci.category, ci.severity,
          ST_X(ci.location_center) as lng, ST_Y(ci.location_center) as lat,
          d.name as department_name, u.name as officer_name,
          w.name as ward_name,
          (SELECT evidence_before FROM work_orders WHERE demand_id = cd.id ORDER BY created_at DESC LIMIT 1) as evidence_before,
          (SELECT evidence_after FROM work_orders WHERE demand_id = cd.id ORDER BY created_at DESC LIMIT 1) as evidence_after
         FROM civic_demands cd
         JOIN civic_incidents ci ON cd.incident_id = ci.id
         LEFT JOIN departments d ON cd.department_id = d.id
         LEFT JOIN users u ON cd.assigned_officer_id = u.id
         LEFT JOIN wards w ON ci.ward_id = w.id
         ${where}
         ORDER BY cd.priority DESC, cd.updated_at DESC
         LIMIT $${p++} OFFSET $${p++}`,
        [...params, parseInt(limit), offset]
      ),
      query(`SELECT COUNT(*) FROM civic_demands cd JOIN civic_incidents ci ON cd.incident_id = ci.id ${where}`, params),
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
    res.status(500).json({ success: false, error: 'Failed to fetch demands' });
  }
});

// ─── GET /demands/:id ─────────────────────────────────────────

router.get('/:id', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const [demandRes, timelineRes, verificationRes, workOrdersRes] = await Promise.all([
      query(
        `SELECT cd.*, ci.title as incident_title, ci.category, ci.severity, ci.id as incident_id,
          ST_X(ci.location_center) as lng, ST_Y(ci.location_center) as lat,
          d.name as department_name, u.name as officer_name, u.badge_type as officer_badge,
          w.name as ward_name, c.name as city_name
         FROM civic_demands cd
         JOIN civic_incidents ci ON cd.incident_id = ci.id
         LEFT JOIN departments d ON cd.department_id = d.id
         LEFT JOIN users u ON cd.assigned_officer_id = u.id
         LEFT JOIN wards w ON ci.ward_id = w.id
         LEFT JOIN cities c ON ci.city_id = c.id
         WHERE cd.id = $1`,
        [req.params.id]
      ),
      query(
        `SELECT dt.*, u.name as actor_name, u.role as actor_role, u.badge_type as actor_badge
         FROM demand_timeline dt
         LEFT JOIN users u ON dt.actor_id = u.id
         WHERE dt.demand_id = $1
         ORDER BY dt.created_at ASC`,
        [req.params.id]
      ),
      query(
        `SELECT rv.*, u.name as verifier_name, u.avatar_url as verifier_avatar
         FROM resolution_verifications rv
         JOIN users u ON rv.user_id = u.id
         WHERE rv.demand_id = $1
         ORDER BY rv.created_at DESC`,
        [req.params.id]
      ),
      query(
        `SELECT wo.*, u.name as contractor_name
         FROM work_orders wo
         LEFT JOIN users u ON wo.contractor_id = u.id
         WHERE wo.demand_id = $1`,
        [req.params.id]
      ),
    ]);

    if (!demandRes.rows[0]) {
      res.status(404).json({ success: false, error: 'Demand not found' });
      return;
    }

    // Compute verification summary
    const verifications = verificationRes.rows;
    const verificationSummary = {
      total: verifications.length,
      solved: verifications.filter((v: any) => v.verdict === 'solved').length,
      partially: verifications.filter((v: any) => v.verdict === 'partially_solved').length,
      not_solved: verifications.filter((v: any) => v.verdict === 'not_solved').length,
      avg_ai_confidence: verifications.length
        ? verifications.reduce((a: number, v: any) => a + parseFloat(v.ai_confidence), 0) / verifications.length
        : 0,
    };

    res.json({
      success: true,
      data: {
        ...demandRes.rows[0],
        timeline: timelineRes.rows,
        verifications: verificationRes.rows,
        verification_summary: verificationSummary,
        work_orders: workOrdersRes.rows,
        stage_transitions: STAGE_TRANSITIONS[demandRes.rows[0].stage] || [],
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch demand' });
  }
});

// ─── POST /demands (create demand from incident) ─────────────

router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { incident_id, title, description, department_id } = req.body;
    if (!incident_id || !title) {
      res.status(400).json({ success: false, error: 'incident_id and title are required' });
      return;
    }

    const incidentRes = await query('SELECT * FROM civic_incidents WHERE id = $1', [incident_id]);
    if (!incidentRes.rows[0]) {
      res.status(404).json({ success: false, error: 'Incident not found' });
      return;
    }

    const existing = await query('SELECT id FROM civic_demands WHERE incident_id = $1', [incident_id]);
    if (existing.rows[0]) {
      res.status(409).json({ success: false, error: 'A demand already exists for this incident', data: { demand_id: existing.rows[0].id } });
      return;
    }

    const result = await query(
      `INSERT INTO civic_demands (incident_id, title, description, department_id, stage, priority, supporters_count)
       VALUES ($1, $2, $3, $4, 'proposed', $5, 1)
       RETURNING *`,
      [incident_id, title, description || incidentRes.rows[0].description, department_id || null, incidentRes.rows[0].priority_score || 50]
    );

    await query(
      'INSERT INTO demand_supporters (demand_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [result.rows[0].id, req.user!.id]
    );

    await query(
      `INSERT INTO demand_timeline (demand_id, actor_id, stage_from, stage_to, note)
       VALUES ($1, $2, NULL, 'proposed', 'Demand created by citizen')`,
      [result.rows[0].id, req.user!.id]
    );

    await query('UPDATE users SET civic_impact_score = civic_impact_score + 5 WHERE id = $1', [req.user!.id]);

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to create demand' });
  }
});

// ─── POST /demands/:id/support ────────────────────────────────

router.post('/:id/support', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    await query(
      'INSERT INTO demand_supporters (demand_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [req.params.id, req.user!.id]
    );

    const countRes = await query(
      `UPDATE civic_demands SET supporters_count = (
        SELECT COUNT(*) FROM demand_supporters WHERE demand_id = $1
       ), updated_at = NOW()
       WHERE id = $1 RETURNING supporters_count`,
      [req.params.id]
    );

    // Award civic credits for supporting demand
    await query('UPDATE users SET civic_impact_score = civic_impact_score + 2 WHERE id = $1', [req.user!.id]);
    try {
      await awardCredits(req.user!.id, 'community_contribution', 'Supported civic demand', 'demand', req.params.id as string);
    } catch {}

    // Auto-promote if threshold reached
    const demand = await query('SELECT stage, supporters_count FROM civic_demands WHERE id = $1', [req.params.id]);
    if (demand.rows[0]?.stage === 'proposed' && demand.rows[0]?.supporters_count >= 50) {
      await advanceStage(req.params.id as string, 'proposed', 'community_supported', null, 'Automatically promoted: 50+ supporters reached');
    }

    res.json({ success: true, data: { supporters_count: countRes.rows[0]?.supporters_count } });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to support demand' });
  }
});

// ─── POST /demands/:id/boost (crowdfund matched CSR funding) ──
router.post('/:id/boost', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const demandId = req.params.id;
    const userId = req.user!.id;
    const { credits } = req.body;

    const amount = parseInt(credits);
    if (isNaN(amount) || amount <= 0) {
      res.status(400).json({ success: false, error: 'Credits amount must be a positive integer' });
      return;
    }

    const result = await transaction(async (q) => {
      // 1. Fetch user's credit balance
      const userRes = await q('SELECT civic_credits FROM users WHERE id = $1', [userId]);
      const currentCredits = userRes.rows[0]?.civic_credits || 0;
      if (currentCredits < amount) {
        throw new Error('Insufficient Civic Credits balance to boost this project');
      }

      // 2. Fetch the demand
      const demandRes = await q('SELECT * FROM civic_demands WHERE id = $1', [demandId]);
      if (demandRes.rowCount === 0) {
        throw new Error('Civic demand not found');
      }

      const demand = demandRes.rows[0];

      // Calculate matched cash matching fund: e.g. 1 Credit = 10 INR CSR match
      const matchedCash = amount * 10;
      const newBalance = currentCredits - amount;

      // 3. Deduct user's credits
      await q('UPDATE users SET civic_credits = $1 WHERE id = $2', [newBalance, userId]);

      // 4. Update demand's boost statistics
      const updatedDemand = await q(
        `UPDATE civic_demands
         SET boost_credits = COALESCE(boost_credits, 0) + $1,
             matching_fund = COALESCE(matching_fund, 0) + $2,
             updated_at = NOW()
         WHERE id = $3
         RETURNING boost_credits, matching_fund`,
        [amount, matchedCash, demandId]
      );

      // 5. Insert ledger record for debiting credits
      await q(
        `INSERT INTO civic_credits_ledger (user_id, action, credits, balance_after, reason, source_type, source_id)
         VALUES ($1, 'redemption', $2, $3, 'Boosted civic demand project', 'demand', $4)`,
        [userId, -amount, newBalance, demandId]
      );

      return updatedDemand.rows[0];
    });

    res.json({
      success: true,
      data: result,
      message: `Successfully boosted project with ${amount} credits! Matched ₹${amount * 10} from Corporate CSR matching fund.`
    });
  } catch (err: any) {
    const statusCode = ['Insufficient Civic Credits balance to boost this project', 'Civic demand not found'].includes(err.message) ? 400 : 500;
    res.status(statusCode).json({ success: false, error: err.message || 'Failed to boost civic demand' });
  }
});

// ─── PATCH /demands/:id/stage ─────────────────────────────────

router.patch('/:id/stage', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { new_stage, note, evidence } = req.body;

    const demandRes = await query('SELECT * FROM civic_demands WHERE id = $1', [req.params.id]);
    const demand = demandRes.rows[0];
    if (!demand) {
      res.status(404).json({ success: false, error: 'Demand not found' });
      return;
    }

    const allowedTransitions = STAGE_TRANSITIONS[demand.stage] || [];
    if (!allowedTransitions.includes(new_stage)) {
      res.status(400).json({
        success: false,
        error: `Cannot transition from '${demand.stage}' to '${new_stage}'. Allowed: ${allowedTransitions.join(', ')}`,
      });
      return;
    }

    await advanceStage(req.params.id as string, demand.stage, new_stage, req.user!.id, note, evidence);

    // Emit realtime update
    try {
      io.to(`demand:${req.params.id}`).emit('demand:stage_changed', {
        demand_id: req.params.id,
        old_stage: demand.stage,
        new_stage,
      });
    } catch {}

    res.json({ success: true, data: { stage: new_stage } });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to update demand stage' });
  }
});

// ─── POST /demands/:id/verify ─────────────────────────────────

router.post('/:id/verify', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { verdict, evidence_urls = [], comment } = req.body;
    if (!['solved', 'partially_solved', 'not_solved'].includes(verdict)) {
      res.status(400).json({ success: false, error: 'Invalid verdict' });
      return;
    }

    // Check demand is in citizen_verification stage
    const demandRes = await query('SELECT stage FROM civic_demands WHERE id = $1', [req.params.id]);
    if (demandRes.rows[0]?.stage !== 'citizen_verification') {
      res.status(400).json({ success: false, error: 'Demand is not in citizen_verification stage' });
      return;
    }

    await query(
      `INSERT INTO resolution_verifications (demand_id, user_id, verdict, evidence_urls, ai_confidence, comment)
       VALUES ($1, $2, $3, $4, 0.0, $5)
       ON CONFLICT (demand_id, user_id) DO UPDATE SET verdict = $3, evidence_urls = $4, comment = $5`,
      [req.params.id, req.user!.id, verdict, JSON.stringify(evidence_urls), comment || null]
    );

    // Award points and civic credits
    await query('UPDATE users SET civic_impact_score = civic_impact_score + 10 WHERE id = $1', [req.user!.id]);
    try {
      await awardCredits(req.user!.id, 'resolution_verify', 'Verified resolution outcome', 'demand', req.params.id as string);
    } catch {}

    // Check if enough verifications to auto-resolve
    const verRes = await query(
      'SELECT verdict FROM resolution_verifications WHERE demand_id = $1',
      [req.params.id]
    );
    const verts = verRes.rows;
    if (verts.length >= 3) {
      const solved = verts.filter((v: any) => v.verdict === 'solved').length;
      const pct = solved / verts.length;
      if (pct >= 0.6) {
        await advanceStage(req.params.id as string, 'citizen_verification', 'resolved', null,
          `Auto-resolved: ${Math.round(pct * 100)}% of verifiers marked as solved`);
      } else if (pct <= 0.3) {
        await advanceStage(req.params.id as string, 'citizen_verification', 'reopened', null,
          `Reopened: ${Math.round((1 - pct) * 100)}% of verifiers report problem not solved`);
      }
    }

    res.status(201).json({ success: true, message: 'Verification recorded' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to submit verification' });
  }
});

// ─── Helper: Advance Stage ────────────────────────────────────

async function advanceStage(
  demandId: string, from: string, to: string,
  actorId: string | null, note?: string, evidence?: string[]
) {
  await query('UPDATE civic_demands SET stage = $1, updated_at = NOW() WHERE id = $2', [to, demandId]);
  await query(
    `INSERT INTO demand_timeline (demand_id, actor_id, stage_from, stage_to, note, evidence)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [demandId, actorId, from, to, note || null, JSON.stringify(evidence || [])]
  );

  const STAGE_LABELS: Record<string, string> = {
    community_supported: 'Community Supported',
    submitted: 'Submitted to Authority',
    accepted: 'Accepted by Department',
    work_planned: 'Work Planned',
    in_progress: 'Work In Progress',
    completed: 'Marked Completed',
    citizen_verification: 'Awaiting Citizen Verification',
    resolved: 'Resolved',
    reopened: 'Reopened',
  };

  try {
    const supporters = await query(
      `SELECT user_id FROM demand_supporters WHERE demand_id = $1`,
      [demandId]
    );
    const demandInfo = await query(`SELECT title FROM civic_demands WHERE id = $1`, [demandId]);
    const title = demandInfo.rows[0]?.title || 'A demand you supported';

    for (const row of supporters.rows) {
      if (row.user_id !== actorId) {
        await createNotification(
          row.user_id,
          'demand_update',
          `Demand Update: ${STAGE_LABELS[to] || to}`,
          `"${title}" has progressed to ${STAGE_LABELS[to] || to}.`,
          { demand_id: demandId, stage: to }
        );
      }
    }
  } catch {}
}

export { router as demandsRouter };
