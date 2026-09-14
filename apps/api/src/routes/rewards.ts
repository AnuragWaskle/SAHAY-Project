import { Router, Response } from 'express';
import { requireAuth, AuthRequest, requireRole } from '../middleware/auth';
import { query, transaction } from '../db/pool';

const router = Router();

// ─── GET /rewards ────────────────────────────────────────────────
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { category, page = '1', limit = '20' } = req.query as Record<string, string>;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const conditions: string[] = ['active = true', '(expires_at IS NULL OR expires_at > NOW())', '(availability = -1 OR claimed_count < availability)'];
    const params: unknown[] = [];
    let p = 1;

    if (category) { conditions.push(`category = $${p++}`); params.push(category); }

    const where = conditions.join(' AND ');
    const result = await query(
      `SELECT * FROM reward_catalog WHERE ${where} ORDER BY credits_required ASC LIMIT $${p++} OFFSET $${p++}`,
      [...params, parseInt(limit), offset]
    );

    res.json({ success: true, data: result.rows });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch rewards' });
  }
});

// ─── GET /rewards/redemptions ────────────────────────────────────
router.get('/redemptions', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      `SELECT rr.*, rc.name as reward_name, rc.category, rc.image_url
       FROM reward_redemptions rr
       JOIN reward_catalog rc ON rr.reward_id = rc.id
       WHERE rr.user_id = $1
       ORDER BY rr.created_at DESC`,
      [req.user!.id]
    );
    res.json({ success: true, data: result.rows });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch redemptions' });
  }
});

// ─── GET /rewards/redemptions/all (admin) ────────────────────────
router.get('/redemptions/all', requireAuth, requireRole('sub_admin', 'super_admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { status, page = '1', limit = '20' } = req.query as Record<string, string>;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const conditions: string[] = [];
    const params: unknown[] = [];
    let p = 1;

    if (status) { conditions.push(`rr.status = $${p++}`); params.push(status); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await query(
      `SELECT rr.*, rc.name as reward_name, rc.category, u.name as user_name, u.email as user_email
       FROM reward_redemptions rr
       JOIN reward_catalog rc ON rr.reward_id = rc.id
       JOIN users u ON rr.user_id = u.id
       ${where}
       ORDER BY rr.created_at DESC LIMIT $${p++} OFFSET $${p++}`,
      [...params, parseInt(limit), offset]
    );
    res.json({ success: true, data: result.rows });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch redemptions' });
  }
});

// ─── GET /rewards/:id ────────────────────────────────────────────
router.get('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(`SELECT * FROM reward_catalog WHERE id = $1`, [req.params.id]);
    if (result.rowCount === 0) {
      res.status(404).json({ success: false, error: 'Reward not found' });
      return;
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch reward' });
  }
});

// ─── POST /rewards (admin create) ───────────────────────────────
router.post('/', requireAuth, requireRole('sub_admin', 'super_admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, category, credits_required, monetary_value, availability, eligibility_min_level, eligibility_min_trust, image_url, expires_at, sponsor_id } = req.body;
    if (!name || !description || !category || !credits_required) {
      res.status(400).json({ success: false, error: 'name, description, category, credits_required are required' });
      return;
    }

    const result = await query(
      `INSERT INTO reward_catalog (name, description, category, credits_required, monetary_value, availability, eligibility_min_level, eligibility_min_trust, image_url, expires_at, sponsor_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [name, description, category, credits_required, monetary_value || null, availability || -1, eligibility_min_level || 1, eligibility_min_trust || 0, image_url || null, expires_at || null, sponsor_id || null]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to create reward' });
  }
});

// ─── PATCH /rewards/:id (admin update) ───────────────────────────
router.patch('/:id', requireAuth, requireRole('sub_admin', 'super_admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, category, credits_required, monetary_value, availability, eligibility_min_level, eligibility_min_trust, image_url, expires_at, active } = req.body;
    const updates: string[] = [];
    const params: unknown[] = [];
    let p = 1;

    if (name !== undefined) { updates.push(`name = $${p++}`); params.push(name); }
    if (description !== undefined) { updates.push(`description = $${p++}`); params.push(description); }
    if (category !== undefined) { updates.push(`category = $${p++}`); params.push(category); }
    if (credits_required !== undefined) { updates.push(`credits_required = $${p++}`); params.push(credits_required); }
    if (monetary_value !== undefined) { updates.push(`monetary_value = $${p++}`); params.push(monetary_value); }
    if (availability !== undefined) { updates.push(`availability = $${p++}`); params.push(availability); }
    if (eligibility_min_level !== undefined) { updates.push(`eligibility_min_level = $${p++}`); params.push(eligibility_min_level); }
    if (eligibility_min_trust !== undefined) { updates.push(`eligibility_min_trust = $${p++}`); params.push(eligibility_min_trust); }
    if (image_url !== undefined) { updates.push(`image_url = $${p++}`); params.push(image_url); }
    if (expires_at !== undefined) { updates.push(`expires_at = $${p++}`); params.push(expires_at); }
    if (active !== undefined) { updates.push(`active = $${p++}`); params.push(active); }

    if (!updates.length) {
      res.status(400).json({ success: false, error: 'No fields to update' });
      return;
    }

    const result = await query(
      `UPDATE reward_catalog SET ${updates.join(', ')} WHERE id = $${p} RETURNING *`,
      [...params, req.params.id]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to update reward' });
  }
});

// ─── POST /rewards/:id/redeem ────────────────────────────────────
router.post('/:id/redeem', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const result = await transaction(async (q) => {
      // Get reward
      const rewardRes = await q(`SELECT * FROM reward_catalog WHERE id = $1 FOR UPDATE`, [req.params.id]);
      if (rewardRes.rowCount === 0) throw new Error('Reward not found');
      const reward = rewardRes.rows[0];

      if (!reward.active) throw new Error('Reward is no longer active');
      if (reward.expires_at && new Date(reward.expires_at) < new Date()) throw new Error('Reward has expired');
      if (reward.availability !== -1 && reward.claimed_count >= reward.availability) throw new Error('Reward is sold out');

      // Check user eligibility
      const userRes = await q(`SELECT civic_credits, level, trust_score FROM users WHERE id = $1 FOR UPDATE`, [req.user!.id]);
      const user = userRes.rows[0];

      if (user.civic_credits < reward.credits_required) throw new Error(`Insufficient credits. Need ${reward.credits_required}, have ${user.civic_credits}`);
      if (user.level < reward.eligibility_min_level) throw new Error(`Requires level ${reward.eligibility_min_level}`);
      if (parseFloat(user.trust_score) < parseFloat(reward.eligibility_min_trust)) throw new Error('Trust score too low');

      // Deduct credits
      const newBalance = user.civic_credits - reward.credits_required;
      await q(`UPDATE users SET civic_credits = $1 WHERE id = $2`, [newBalance, req.user!.id]);

      // Ledger entry (negative)
      await q(
        `INSERT INTO civic_credits_ledger (user_id, action, credits, balance_after, reason, source_type, source_id)
         VALUES ($1, 'redemption', $2, $3, $4, 'reward', $5)`,
        [req.user!.id, -reward.credits_required, newBalance, `Redeemed: ${reward.name}`, req.params.id]
      );

      // Create redemption record
      const code = `RDM-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
      const redemptionRes = await q(
        `INSERT INTO reward_redemptions (user_id, reward_id, credits_spent, status, redemption_code)
         VALUES ($1, $2, $3, 'pending', $4) RETURNING *`,
        [req.user!.id, req.params.id, reward.credits_required, code]
      );

      // Increment claimed count
      await q(`UPDATE reward_catalog SET claimed_count = claimed_count + 1 WHERE id = $1`, [req.params.id]);

      return redemptionRes.rows[0];
    });

    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message || 'Redemption failed' });
  }
});

export { router as rewardsRouter };
