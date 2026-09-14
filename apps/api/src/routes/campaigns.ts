import { Router, Response } from 'express';
import { requireAuth, optionalAuth, AuthRequest, requireRole } from '../middleware/auth';
import { query, transaction } from '../db/pool';
import { awardCredits } from './credits';
import { createNotification } from './notifications';

const router = Router();

// ─── GET /campaigns ──────────────────────────────────────────────
router.get('/', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { status, city_id, category, page = '1', limit = '20' } = req.query as Record<string, string>;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const conditions: string[] = [];
    const params: unknown[] = [];
    let p = 1;

    if (status) { conditions.push(`sc.status = $${p++}`); params.push(status); }
    else { conditions.push(`sc.status IN ('active', 'completed')`); }
    if (city_id) { conditions.push(`sc.city_id = $${p++}`); params.push(city_id); }
    if (category) { conditions.push(`sc.category = $${p++}`); params.push(category); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await query(
      `SELECT sc.*, sp.name as sponsor_name, sp.logo_url as sponsor_logo,
        o.name as ngo_name
       FROM sponsored_campaigns sc
       LEFT JOIN sponsor_profiles sp ON sc.sponsor_id = sp.id
       LEFT JOIN organizations o ON sc.ngo_partner_id = o.id
       ${where}
       ORDER BY sc.created_at DESC LIMIT $${p++} OFFSET $${p++}`,
      [...params, parseInt(limit), offset]
    );

    res.json({ success: true, data: result.rows });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch campaigns' });
  }
});

// ─── GET /campaigns/:id ──────────────────────────────────────────
router.get('/:id', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const [campaignRes, participantCount] = await Promise.all([
      query(
        `SELECT sc.*, sp.name as sponsor_name, sp.logo_url as sponsor_logo,
          o.name as ngo_name
         FROM sponsored_campaigns sc
         LEFT JOIN sponsor_profiles sp ON sc.sponsor_id = sp.id
         LEFT JOIN organizations o ON sc.ngo_partner_id = o.id
         WHERE sc.id = $1`,
        [req.params.id]
      ),
      query(
        `SELECT status, COUNT(*) as count FROM campaign_participants WHERE campaign_id = $1 GROUP BY status`,
        [req.params.id]
      ),
    ]);

    if (campaignRes.rowCount === 0) {
      res.status(404).json({ success: false, error: 'Campaign not found' });
      return;
    }

    const campaign = campaignRes.rows[0];
    campaign.participant_stats = participantCount.rows.reduce((acc: any, r: any) => {
      acc[r.status] = parseInt(r.count);
      return acc;
    }, {});

    // Check if current user is participating
    if (req.user) {
      const partRes = await query(
        `SELECT status FROM campaign_participants WHERE campaign_id = $1 AND user_id = $2`,
        [req.params.id, req.user.id]
      );
      campaign.user_participation = partRes.rows[0] || null;
    }

    res.json({ success: true, data: campaign });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch campaign' });
  }
});

// ─── POST /campaigns ─────────────────────────────────────────────
router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { sponsor_id, title, description, objective, category, budget, reward_pool, city_id, target_wards, target_participants, start_date, end_date, evidence_requirements, ngo_partner_id } = req.body;

    if (!sponsor_id || !title || !description || !category || !budget) {
      res.status(400).json({ success: false, error: 'sponsor_id, title, description, category, budget are required' });
      return;
    }

    const result = await query(
      `INSERT INTO sponsored_campaigns (sponsor_id, title, description, objective, category, budget, reward_pool, city_id, target_wards, target_participants, start_date, end_date, evidence_requirements, ngo_partner_id, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'pending_review') RETURNING *`,
      [sponsor_id, title, description, objective || null, category, budget, reward_pool || 0, city_id || null, target_wards || null, target_participants || 100, start_date || null, end_date || null, evidence_requirements || null, ngo_partner_id || null]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to create campaign' });
  }
});

// ─── PATCH /campaigns/:id ────────────────────────────────────────
router.patch('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { title, description, objective, category, budget, reward_pool, target_participants, start_date, end_date, evidence_requirements } = req.body;
    const updates: string[] = [];
    const params: unknown[] = [];
    let p = 1;

    if (title !== undefined) { updates.push(`title = $${p++}`); params.push(title); }
    if (description !== undefined) { updates.push(`description = $${p++}`); params.push(description); }
    if (objective !== undefined) { updates.push(`objective = $${p++}`); params.push(objective); }
    if (category !== undefined) { updates.push(`category = $${p++}`); params.push(category); }
    if (budget !== undefined) { updates.push(`budget = $${p++}`); params.push(budget); }
    if (reward_pool !== undefined) { updates.push(`reward_pool = $${p++}`); params.push(reward_pool); }
    if (target_participants !== undefined) { updates.push(`target_participants = $${p++}`); params.push(target_participants); }
    if (start_date !== undefined) { updates.push(`start_date = $${p++}`); params.push(start_date); }
    if (end_date !== undefined) { updates.push(`end_date = $${p++}`); params.push(end_date); }
    if (evidence_requirements !== undefined) { updates.push(`evidence_requirements = $${p++}`); params.push(evidence_requirements); }

    if (!updates.length) {
      res.status(400).json({ success: false, error: 'No fields to update' });
      return;
    }

    updates.push(`updated_at = NOW()`);
    const result = await query(
      `UPDATE sponsored_campaigns SET ${updates.join(', ')} WHERE id = $${p} RETURNING *`,
      [...params, req.params.id]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to update campaign' });
  }
});

// ─── PATCH /campaigns/:id/status (admin) ─────────────────────────
router.patch('/:id/status', requireAuth, requireRole('sub_admin', 'super_admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { status, admin_notes } = req.body;
    const allowed = ['approved', 'active', 'completed', 'cancelled'];
    if (!allowed.includes(status)) {
      res.status(400).json({ success: false, error: `Status must be one of: ${allowed.join(', ')}` });
      return;
    }

    const updates: string[] = [`status = $1`, `updated_at = NOW()`];
    const params: unknown[] = [status];
    let p = 2;

    if (admin_notes) { updates.push(`admin_notes = $${p++}`); params.push(admin_notes); }
    if (status === 'approved') { updates.push(`approved_by = $${p++}`); params.push(req.user!.id); updates.push(`approved_at = NOW()`); }
    if (status === 'completed') { updates.push(`completed_at = NOW()`); }

    const result = await query(
      `UPDATE sponsored_campaigns SET ${updates.join(', ')} WHERE id = $${p} RETURNING *`,
      [...params, req.params.id]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to update status' });
  }
});

// ─── POST /campaigns/:id/join ────────────────────────────────────
router.post('/:id/join', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    // Check campaign is active
    const campaignRes = await query(`SELECT status FROM sponsored_campaigns WHERE id = $1`, [req.params.id]);
    if (campaignRes.rowCount === 0) { res.status(404).json({ success: false, error: 'Campaign not found' }); return; }
    if (campaignRes.rows[0].status !== 'active') { res.status(400).json({ success: false, error: 'Campaign is not active' }); return; }

    const result = await query(
      `INSERT INTO campaign_participants (campaign_id, user_id, status)
       VALUES ($1, $2, 'joined')
       ON CONFLICT (campaign_id, user_id) DO NOTHING RETURNING *`,
      [req.params.id, req.user!.id]
    );

    if (result.rowCount === 0) {
      res.status(400).json({ success: false, error: 'Already joined this campaign' });
      return;
    }

    await query(
      `UPDATE sponsored_campaigns SET actual_participants = actual_participants + 1 WHERE id = $1`,
      [req.params.id]
    );

    res.json({ success: true, data: result.rows[0] });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to join campaign' });
  }
});

// ─── POST /campaigns/:id/evidence ────────────────────────────────
router.post('/:id/evidence', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { evidence_urls, evidence_note } = req.body;
    const result = await query(
      `UPDATE campaign_participants
       SET status = 'evidence_submitted', evidence_urls = $1, evidence_note = $2
       WHERE campaign_id = $3 AND user_id = $4 AND status IN ('joined', 'active')
       RETURNING *`,
      [evidence_urls || [], evidence_note || null, req.params.id, req.user!.id]
    );

    if (result.rowCount === 0) {
      res.status(400).json({ success: false, error: 'Not a participant or already submitted' });
      return;
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to submit evidence' });
  }
});

// ─── POST /campaigns/:id/verify/:userId ──────────────────────────
router.post('/:id/verify/:userId', requireAuth, requireRole('sub_admin', 'super_admin', 'ngo'), async (req: AuthRequest, res: Response) => {
  try {
    const { credits_earned, monetary_reward } = req.body;
    const userId = req.params.userId as string;

    const result = await transaction(async (q) => {
      const partRes = await q(
        `UPDATE campaign_participants
         SET status = 'verified', verified_at = NOW(), credits_earned = $1, monetary_reward = $2
         WHERE campaign_id = $3 AND user_id = $4 AND status = 'evidence_submitted'
         RETURNING *`,
        [credits_earned || 0, monetary_reward || 0, req.params.id, userId]
      );

      if (partRes.rowCount === 0) throw new Error('Participant not found or not in evidence_submitted state');

      // Award credits
      if (credits_earned > 0) {
        await awardCredits(userId, 'mission_participate', 'Campaign participation verified', 'campaign', req.params.id as string);
      }

      // Update allocated rewards
      if (monetary_reward > 0) {
        await q(
          `UPDATE sponsored_campaigns SET allocated_rewards = allocated_rewards + $1 WHERE id = $2`,
          [monetary_reward, req.params.id]
        );
      }

      // Mark as rewarded
      await q(
        `UPDATE campaign_participants SET status = 'rewarded', rewarded_at = NOW() WHERE campaign_id = $1 AND user_id = $2`,
        [req.params.id, userId]
      );

      await createNotification(userId, 'campaign_reward', 'Campaign Reward!',
        `Your participation has been verified! You earned ${credits_earned} Civic Credits.`,
        { campaign_id: req.params.id }
      );

      return partRes.rows[0];
    });

    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message || 'Verification failed' });
  }
});

// ─── GET /campaigns/:id/participants ─────────────────────────────
router.get('/:id/participants', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      `SELECT cp.*, u.name as user_name, u.avatar_url
       FROM campaign_participants cp
       JOIN users u ON cp.user_id = u.id
       WHERE cp.campaign_id = $1
       ORDER BY cp.joined_at DESC`,
      [req.params.id]
    );
    res.json({ success: true, data: result.rows });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch participants' });
  }
});

// ─── GET /campaigns/:id/impact ───────────────────────────────────
router.get('/:id/impact', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const [campaign, participants, evidenceCount] = await Promise.all([
      query(`SELECT * FROM sponsored_campaigns WHERE id = $1`, [req.params.id]),
      query(
        `SELECT
          COUNT(*) as total_participants,
          COUNT(*) FILTER (WHERE status = 'rewarded') as verified_participants,
          COALESCE(SUM(credits_earned), 0) as total_credits,
          COALESCE(SUM(monetary_reward), 0) as total_monetary
         FROM campaign_participants WHERE campaign_id = $1`,
        [req.params.id]
      ),
      query(
        `SELECT COUNT(*) as evidence_count FROM campaign_participants
         WHERE campaign_id = $1 AND evidence_urls IS NOT NULL AND array_length(evidence_urls, 1) > 0`,
        [req.params.id]
      ),
    ]);

    if (campaign.rowCount === 0) {
      res.status(404).json({ success: false, error: 'Campaign not found' });
      return;
    }

    const stats = participants.rows[0];
    res.json({
      success: true,
      data: {
        campaign: campaign.rows[0],
        impact: {
          citizens_engaged: parseInt(stats.total_participants),
          verified_participants: parseInt(stats.verified_participants),
          total_credits_awarded: parseInt(stats.total_credits),
          total_monetary_awarded: parseFloat(stats.total_monetary),
          evidence_submissions: parseInt(evidenceCount.rows[0].evidence_count),
          budget_utilized_percent: campaign.rows[0].budget > 0
            ? Math.round((parseFloat(stats.total_monetary) / parseFloat(campaign.rows[0].budget)) * 100)
            : 0,
        },
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to generate impact' });
  }
});

export { router as campaignsRouter };
