import { Router, Response } from 'express';
import { requireAuth, AuthRequest, requireRole } from '../middleware/auth';
import { query, transaction } from '../db/pool';
import crypto from 'crypto';

const router = Router();

function generateReferralCode(): string {
  return 'CP-' + crypto.randomBytes(4).toString('hex').toUpperCase();
}

// ─── GET /referrals/code (get or create my referral code) ────────
router.get('/code', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userRes = await query(`SELECT referral_code FROM users WHERE id = $1`, [req.user!.id]);
    let code = userRes.rows[0]?.referral_code;

    if (!code) {
      code = generateReferralCode();
      await query(`UPDATE users SET referral_code = $1 WHERE id = $2`, [code, req.user!.id]);
    }

    const statsRes = await query(
      `SELECT COUNT(*) as total_referrals, COUNT(*) FILTER (WHERE status = 'rewarded') as successful
       FROM referrals WHERE referrer_id = $1`,
      [req.user!.id]
    );

    res.json({
      success: true,
      data: {
        code,
        total_referrals: parseInt(statsRes.rows[0].total_referrals),
        successful_referrals: parseInt(statsRes.rows[0].successful),
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to get referral code' });
  }
});

// ─── POST /referrals/apply (apply a referral code during onboarding) ─
router.post('/apply', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { code } = req.body;
    if (!code) {
      res.status(400).json({ success: false, error: 'Referral code is required' });
      return;
    }

    // Check if user already has a referrer
    const userRes = await query(`SELECT referred_by FROM users WHERE id = $1`, [req.user!.id]);
    if (userRes.rows[0]?.referred_by) {
      res.status(409).json({ success: false, error: 'You have already applied a referral code' });
      return;
    }

    // Find referrer
    const referrerRes = await query(`SELECT id FROM users WHERE referral_code = $1`, [code.toUpperCase()]);
    if (referrerRes.rowCount === 0) {
      res.status(404).json({ success: false, error: 'Invalid referral code' });
      return;
    }

    const referrerId = referrerRes.rows[0].id;
    if (referrerId === req.user!.id) {
      res.status(400).json({ success: false, error: 'Cannot refer yourself' });
      return;
    }

    // Record referral (pending — reward only on meaningful action)
    await query(`UPDATE users SET referred_by = $1 WHERE id = $2`, [referrerId, req.user!.id]);
    await query(
      `INSERT INTO referrals (referrer_id, referred_id, referral_code, status)
       VALUES ($1, $2, $3, 'pending')
       ON CONFLICT (referrer_id, referred_id) DO NOTHING`,
      [referrerId, req.user!.id, code.toUpperCase()]
    );

    res.json({ success: true, message: 'Referral code applied. Reward will be granted after meaningful civic action.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to apply referral code' });
  }
});

// ─── GET /referrals/mine (list my referrals) ─────────────────────
router.get('/mine', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      `SELECT r.id, r.status, r.reward_credits, r.activated_at, r.created_at,
        u.name as referred_name, u.avatar_url as referred_avatar
       FROM referrals r
       JOIN users u ON r.referred_id = u.id
       WHERE r.referrer_id = $1
       ORDER BY r.created_at DESC`,
      [req.user!.id]
    );

    res.json({ success: true, data: result.rows });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch referrals' });
  }
});

// ─── POST /referrals/activate/:referredId (internal/admin trigger) ─
// Called when a referred user completes a meaningful action (first verified report, first mission, etc.)
router.post('/activate/:referredId', requireAuth, requireRole('sub_admin', 'super_admin'), async (req: AuthRequest, res: Response) => {
  try {
    const referredId = req.params.referredId;
    const REFERRAL_REWARD = 25;

    const refRes = await query(
      `SELECT * FROM referrals WHERE referred_id = $1 AND status = 'pending'`,
      [referredId]
    );

    if (refRes.rowCount === 0) {
      res.status(404).json({ success: false, error: 'No pending referral found for this user' });
      return;
    }

    const referral = refRes.rows[0];

    await transaction(async (q) => {
      await q(
        `UPDATE referrals SET status = 'rewarded', reward_credits = $1, activated_at = NOW() WHERE id = $2`,
        [REFERRAL_REWARD, referral.id]
      );

      await q(
        `UPDATE users SET civic_credits = civic_credits + $1 WHERE id = $2`,
        [REFERRAL_REWARD, referral.referrer_id]
      );

      await q(
        `INSERT INTO civic_credits_ledger (user_id, action, credits, balance_after, reason, source_type, source_id)
         VALUES ($1, 'referral_bonus', $2, (SELECT civic_credits FROM users WHERE id = $1), 'Referral reward: referred user completed civic action', 'referral', $3)`,
        [referral.referrer_id, REFERRAL_REWARD, referral.id]
      );

      const REFERRED_BONUS = 10;
      await q(
        `UPDATE users SET civic_credits = civic_credits + $1 WHERE id = $2`,
        [REFERRED_BONUS, referredId]
      );
      await q(
        `INSERT INTO civic_credits_ledger (user_id, action, credits, balance_after, reason, source_type, source_id)
         VALUES ($1, 'referral_bonus', $2, (SELECT civic_credits FROM users WHERE id = $1), 'Welcome bonus: first civic action completed', 'referral', $3)`,
        [referredId, REFERRED_BONUS, referral.id]
      );
    });

    res.json({ success: true, message: 'Referral activated and rewards distributed' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to activate referral' });
  }
});

export { router as referralsRouter };
