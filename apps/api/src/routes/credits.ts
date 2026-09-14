import { Router, Response } from 'express';
import { requireAuth, AuthRequest, requireRole } from '../middleware/auth';
import { query, transaction } from '../db/pool';

const router = Router();

// ─── Award Credits (exported helper) ─────────────────────────────
export async function awardCredits(
  userId: string,
  action: string,
  reason: string,
  sourceType?: string,
  sourceId?: string,
  campaignId?: string
): Promise<{ credits: number; newBalance: number } | null> {
  return transaction(async (q) => {
    // Get reward rule
    const ruleRes = await q(
      `SELECT * FROM reward_rules WHERE action = $1 AND active = true`,
      [action]
    );
    if (ruleRes.rowCount === 0) return null;
    const rule = ruleRes.rows[0];

    // Check daily limit
    const todayCount = await q(
      `SELECT COALESCE(SUM(credits), 0) as total FROM civic_credits_ledger
       WHERE user_id = $1 AND action = $2 AND created_at > CURRENT_DATE`,
      [userId, action]
    );
    const dailyTotal = parseInt(todayCount.rows[0].total) || 0;
    if (rule.daily_limit > 0 && dailyTotal >= rule.daily_limit * rule.base_points) return null;

    // Check cooldown
    if (rule.cooldown_seconds > 0) {
      const lastAction = await q(
        `SELECT created_at FROM civic_credits_ledger
         WHERE user_id = $1 AND action = $2
         ORDER BY created_at DESC LIMIT 1`,
        [userId, action]
      );
      if (lastAction.rowCount > 0) {
        const elapsed = (Date.now() - new Date(lastAction.rows[0].created_at).getTime()) / 1000;
        if (elapsed < rule.cooldown_seconds) return null;
      }
    }

    // Get user trust score for multiplier
    let multiplier = 1.0;
    if (rule.trust_multiplier) {
      const userRes = await q(`SELECT trust_score FROM users WHERE id = $1`, [userId]);
      if (userRes.rowCount > 0) {
        const trustScore = parseFloat(userRes.rows[0].trust_score) || 50;
        multiplier = Math.max(0.5, Math.min(2.0, trustScore / 50));
      }
    }

    // Check min trust score eligibility
    if (rule.min_trust_score > 0) {
      const userRes = await q(`SELECT trust_score FROM users WHERE id = $1`, [userId]);
      const trust = parseFloat(userRes.rows[0]?.trust_score) || 50;
      if (trust < parseFloat(rule.min_trust_score)) return null;
    }

    const credits = Math.round(rule.base_points * multiplier);

    // Update balance atomically
    const balRes = await q(
      `UPDATE users SET civic_credits = civic_credits + $1 WHERE id = $2 RETURNING civic_credits`,
      [credits, userId]
    );
    const newBalance = balRes.rows[0].civic_credits;

    // Insert ledger entry
    await q(
      `INSERT INTO civic_credits_ledger (user_id, action, credits, balance_after, reason, source_type, source_id, campaign_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [userId, action, credits, newBalance, reason, sourceType || null, sourceId || null, campaignId || null]
    );

    return { credits, newBalance };
  });
}

// ─── GET /credits/balance ────────────────────────────────────────
router.get('/balance', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const [balRes, txRes] = await Promise.all([
      query(`SELECT civic_credits, trust_score, level FROM users WHERE id = $1`, [req.user!.id]),
      query(
        `SELECT id, action, credits, reason, source_type, created_at
         FROM civic_credits_ledger WHERE user_id = $1
         ORDER BY created_at DESC LIMIT 20`,
        [req.user!.id]
      ),
    ]);

    res.json({
      success: true,
      data: {
        balance: balRes.rows[0]?.civic_credits || 0,
        trust_score: parseFloat(balRes.rows[0]?.trust_score) || 50,
        level: balRes.rows[0]?.level || 1,
        recent_transactions: txRes.rows,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch balance' });
  }
});

// ─── GET /credits/ledger ─────────────────────────────────────────
router.get('/ledger', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { action, source_type, from_date, to_date, page = '1', limit = '20' } = req.query as Record<string, string>;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const conditions: string[] = ['user_id = $1'];
    const params: unknown[] = [req.user!.id];
    let p = 2;

    if (action) { conditions.push(`action = $${p++}`); params.push(action); }
    if (source_type) { conditions.push(`source_type = $${p++}`); params.push(source_type); }
    if (from_date) { conditions.push(`created_at >= $${p++}`); params.push(from_date); }
    if (to_date) { conditions.push(`created_at <= $${p++}`); params.push(to_date); }

    const where = conditions.join(' AND ');
    const [data, count] = await Promise.all([
      query(
        `SELECT * FROM civic_credits_ledger WHERE ${where} ORDER BY created_at DESC LIMIT $${p++} OFFSET $${p++}`,
        [...params, parseInt(limit), offset]
      ),
      query(`SELECT COUNT(*) FROM civic_credits_ledger WHERE ${where}`, params),
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
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch ledger' });
  }
});

// ─── POST /credits/award (admin manual adjustment) ───────────────
router.post('/award', requireAuth, requireRole('sub_admin', 'super_admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { user_id, action, credits, reason, source_type, source_id } = req.body;
    if (!user_id || !reason) {
      res.status(400).json({ success: false, error: 'user_id and reason are required' });
      return;
    }

    if (action) {
      const result = await awardCredits(user_id, action, reason, source_type, source_id);
      if (!result) {
        res.status(400).json({ success: false, error: 'Award blocked by rules (daily limit, cooldown, or trust score)' });
        return;
      }
      res.json({ success: true, data: result });
    } else if (credits) {
      // Direct admin adjustment (bypass rules)
      const balRes = await transaction(async (q) => {
        const bal = await q(
          `UPDATE users SET civic_credits = civic_credits + $1 WHERE id = $2 RETURNING civic_credits`,
          [parseInt(credits), user_id]
        );
        await q(
          `INSERT INTO civic_credits_ledger (user_id, action, credits, balance_after, reason, source_type, source_id)
           VALUES ($1, 'admin_adjustment', $2, $3, $4, $5, $6)`,
          [user_id, parseInt(credits), bal.rows[0].civic_credits, reason, source_type || 'admin', source_id || null]
        );
        return bal.rows[0].civic_credits;
      });
      res.json({ success: true, data: { credits: parseInt(credits), newBalance: balRes } });
    } else {
      res.status(400).json({ success: false, error: 'Provide action or credits amount' });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to award credits' });
  }
});

// ─── GET /credits/rules ──────────────────────────────────────────
router.get('/rules', requireAuth, requireRole('sub_admin', 'super_admin'), async (_req: AuthRequest, res: Response) => {
  try {
    const result = await query(`SELECT * FROM reward_rules ORDER BY base_points DESC`);
    res.json({ success: true, data: result.rows });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch rules' });
  }
});

// ─── PATCH /credits/rules/:id ────────────────────────────────────
router.patch('/rules/:id', requireAuth, requireRole('sub_admin', 'super_admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { base_points, trust_multiplier, daily_limit, cooldown_seconds, min_trust_score, requires_verification, active } = req.body;
    const updates: string[] = [];
    const params: unknown[] = [];
    let p = 1;

    if (base_points !== undefined) { updates.push(`base_points = $${p++}`); params.push(base_points); }
    if (trust_multiplier !== undefined) { updates.push(`trust_multiplier = $${p++}`); params.push(trust_multiplier); }
    if (daily_limit !== undefined) { updates.push(`daily_limit = $${p++}`); params.push(daily_limit); }
    if (cooldown_seconds !== undefined) { updates.push(`cooldown_seconds = $${p++}`); params.push(cooldown_seconds); }
    if (min_trust_score !== undefined) { updates.push(`min_trust_score = $${p++}`); params.push(min_trust_score); }
    if (requires_verification !== undefined) { updates.push(`requires_verification = $${p++}`); params.push(requires_verification); }
    if (active !== undefined) { updates.push(`active = $${p++}`); params.push(active); }

    if (!updates.length) {
      res.status(400).json({ success: false, error: 'No fields to update' });
      return;
    }

    updates.push(`updated_at = NOW()`);
    const result = await query(
      `UPDATE reward_rules SET ${updates.join(', ')} WHERE id = $${p} RETURNING *`,
      [...params, req.params.id]
    );

    res.json({ success: true, data: result.rows[0] });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to update rule' });
  }
});

// ─── GET /credits/rewards (citizen rewards list) ─────────────────
router.get('/rewards', requireAuth, async (_req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      `SELECT * FROM rewards WHERE active = true AND (expires_at IS NULL OR expires_at > NOW()) ORDER BY points_required ASC`
    );
    res.json({ success: true, data: result.rows });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch rewards' });
  }
});

// ─── POST /credits/redeem (redeem points for reward) ─────────────
router.post('/redeem', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { rewardId } = req.body;

    if (!rewardId) {
      res.status(400).json({ success: false, error: 'rewardId is required' });
      return;
    }

    const result = await transaction(async (q) => {
      // 1. Fetch reward details
      const rewardRes = await q('SELECT * FROM rewards WHERE id = $1 FOR UPDATE', [rewardId]);
      if (rewardRes.rowCount === 0) {
        throw new Error('Reward not found');
      }
      const reward = rewardRes.rows[0];
      if (!reward.active || (reward.expires_at && new Date(reward.expires_at) < new Date())) {
        throw new Error('This reward is no longer active');
      }
      if (reward.stock !== null && reward.stock <= 0) {
        throw new Error('This reward is currently out of stock');
      }

      // 2. Fetch user points balance
      const userRes = await q('SELECT civic_credits FROM users WHERE id = $1 FOR UPDATE', [userId]);
      const currentCredits = userRes.rows[0]?.civic_credits || 0;
      if (currentCredits < reward.points_required) {
        throw new Error('Insufficient Civic Credits balance to redeem this reward');
      }

      const newBalance = currentCredits - reward.points_required;

      // 3. Deduct user's credits
      await q('UPDATE users SET civic_credits = $1 WHERE id = $2', [newBalance, userId]);

      // 4. Decrement reward stock if limited
      if (reward.stock !== null && reward.stock > 0) {
        await q('UPDATE rewards SET stock = stock - 1 WHERE id = $1', [rewardId]);
      }

      // 5. Create redemption record
      const redemption = await q(
        `INSERT INTO reward_redemptions (user_id, reward_id, status)
         VALUES ($1, $2, 'claimed')
         RETURNING *`,
        [userId, rewardId]
      );

      // 6. Insert debit ledger entry
      await q(
        `INSERT INTO civic_credits_ledger (user_id, action, credits, balance_after, reason, source_type, source_id)
         VALUES ($1, 'redemption', $2, $3, $4, 'reward', $5)`,
        [userId, -reward.points_required, newBalance, `Redeemed: ${reward.name}`, redemption.rows[0].id]
      );

      return {
        redemption: redemption.rows[0],
        reward_name: reward.name,
        points_spent: reward.points_required,
        new_balance: newBalance,
        redemption_code: `SAHAY-RED-${redemption.rows[0].id.slice(0, 8).toUpperCase()}`,
      };
    });

    res.json({
      success: true,
      data: result,
      message: `Successfully redeemed '${result.reward_name}' for ${result.points_spent} credits!`,
    });
  } catch (err: any) {
    const statusCode = [
      'Reward not found',
      'This reward is no longer active',
      'This reward is currently out of stock',
      'Insufficient Civic Credits balance to redeem this reward'
    ].includes(err.message) ? 400 : 500;
    res.status(statusCode).json({ success: false, error: err.message || 'Redemption failed' });
  }
});

// ─── GET /credits/dashboard (admin: economy overview) ───────────
router.get('/dashboard', requireAuth, requireRole('sub_admin', 'super_admin'), async (_req: AuthRequest, res: Response) => {
  try {
    const [issuedRes, redeemedRes, campaignsRes] = await Promise.all([
      query(`SELECT COALESCE(SUM(credits), 0) as total FROM civic_credits_ledger WHERE credits > 0 AND verification_state = 'verified'`),
      query(`SELECT COALESCE(SUM(credits_spent), 0) as total FROM reward_redemptions WHERE status != 'cancelled'`),
      query(`SELECT COUNT(*) FROM sponsored_campaigns WHERE status = 'active'`),
    ]);

    res.json({
      success: true,
      data: {
        total_credits_issued: parseInt(issuedRes.rows[0].total),
        total_credits_redeemed: parseInt(redeemedRes.rows[0].total),
        active_campaigns: parseInt(campaignsRes.rows[0].count),
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch dashboard' });
  }
});

export { router as creditsRouter };
