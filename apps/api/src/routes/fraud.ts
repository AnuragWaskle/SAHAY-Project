import { Router, Response } from 'express';
import { requireAuth, AuthRequest, requireRole } from '../middleware/auth';
import { query } from '../db/pool';

const router = Router();

// ─── Flag Fraud (exported helper) ────────────────────────────────
export async function flagFraud(
  userId: string,
  flagType: string,
  severity: string,
  description: string,
  evidence?: Record<string, unknown>
): Promise<void> {
  try {
    await query(
      `INSERT INTO fraud_flags (user_id, flag_type, severity, description, evidence)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, flagType, severity, description, JSON.stringify(evidence || {})]
    );
  } catch (err) {
    // Silently fail for internal flagging
  }
}

// ─── GET /fraud/flags/me (citizen own trust log) ────────────────
router.get('/flags/me', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      `SELECT id, flag_type, severity, description, status, action_taken, created_at
       FROM fraud_flags
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [req.user!.id]
    );
    res.json({ success: true, data: result.rows });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch your flags' });
  }
});

// ─── GET /fraud/flags (admin) ────────────────────────────────────
router.get('/flags', requireAuth, requireRole('sub_admin', 'super_admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { status, severity, flag_type, page = '1', limit = '20' } = req.query as Record<string, string>;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const conditions: string[] = [];
    const params: unknown[] = [];
    let p = 1;

    if (status) { conditions.push(`ff.status = $${p++}`); params.push(status); }
    if (severity) { conditions.push(`ff.severity = $${p++}`); params.push(severity); }
    if (flag_type) { conditions.push(`ff.flag_type = $${p++}`); params.push(flag_type); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const [data, count] = await Promise.all([
      query(
        `SELECT ff.*, u.name as user_name, u.email as user_email, u.trust_score,
          rv.name as reviewer_name
         FROM fraud_flags ff
         JOIN users u ON ff.user_id = u.id
         LEFT JOIN users rv ON ff.reviewed_by = rv.id
         ${where}
         ORDER BY ff.created_at DESC LIMIT $${p++} OFFSET $${p++}`,
        [...params, parseInt(limit), offset]
      ),
      query(`SELECT COUNT(*) FROM fraud_flags ff ${where}`, params),
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
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch fraud flags' });
  }
});

// ─── POST /fraud/flags (admin/internal) ──────────────────────────
router.post('/flags', requireAuth, requireRole('sub_admin', 'super_admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { user_id, flag_type, severity, description, evidence } = req.body;
    if (!user_id || !flag_type || !description) {
      res.status(400).json({ success: false, error: 'user_id, flag_type, description are required' });
      return;
    }

    const result = await query(
      `INSERT INTO fraud_flags (user_id, flag_type, severity, description, evidence)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [user_id, flag_type, severity || 'medium', description, JSON.stringify(evidence || {})]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to create flag' });
  }
});

// ─── PATCH /fraud/flags/:id (admin review) ───────────────────────
router.patch('/flags/:id', requireAuth, requireRole('sub_admin', 'super_admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { status, action_taken } = req.body;
    if (!['reviewed', 'confirmed', 'dismissed'].includes(status)) {
      res.status(400).json({ success: false, error: 'Status must be reviewed, confirmed, or dismissed' });
      return;
    }

    const result = await query(
      `UPDATE fraud_flags SET status = $1, action_taken = $2, reviewed_by = $3, reviewed_at = NOW()
       WHERE id = $4 RETURNING *`,
      [status, action_taken || null, req.user!.id, req.params.id]
    );

    // If confirmed with action, apply it
    if (status === 'confirmed' && action_taken === 'suspended') {
      const flag = result.rows[0];
      await query(`UPDATE users SET verification_status = 'suspended' WHERE id = $1`, [flag.user_id]);
    }
    if (status === 'confirmed' && action_taken === 'credits_revoked') {
      const flag = result.rows[0];
      // Reduce trust score
      await query(`UPDATE users SET trust_score = GREATEST(0, trust_score - 10) WHERE id = $1`, [flag.user_id]);
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to review flag' });
  }
});

// ─── GET /fraud/user/:userId ─────────────────────────────────────
router.get('/user/:userId', requireAuth, requireRole('sub_admin', 'super_admin'), async (req: AuthRequest, res: Response) => {
  try {
    const [flags, userInfo, activity] = await Promise.all([
      query(
        `SELECT * FROM fraud_flags WHERE user_id = $1 ORDER BY created_at DESC`,
        [req.params.userId]
      ),
      query(
        `SELECT id, name, trust_score, civic_credits, civic_impact_score, level, verification_status, created_at
         FROM users WHERE id = $1`,
        [req.params.userId]
      ),
      query(
        `SELECT
          (SELECT COUNT(*) FROM reports WHERE user_id = $1) as total_reports,
          (SELECT COUNT(*) FROM reports WHERE user_id = $1 AND created_at > NOW() - INTERVAL '24 hours') as reports_today,
          (SELECT COUNT(*) FROM civic_credits_ledger WHERE user_id = $1 AND verification_state = 'revoked') as revoked_credits`
      ),
    ]);

    res.json({
      success: true,
      data: {
        user: userInfo.rows[0],
        flags: flags.rows,
        activity: activity.rows[0],
        risk_level: flags.rows.filter((f: any) => f.status !== 'dismissed').length > 3 ? 'high'
          : flags.rows.filter((f: any) => f.status !== 'dismissed').length > 1 ? 'medium' : 'low',
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch user fraud profile' });
  }
});

// ─── GET /trust/me ───────────────────────────────────────────────
router.get('/trust/me', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const [trustRes, breakdown] = await Promise.all([
      query(`SELECT * FROM civic_trust_scores WHERE user_id = $1`, [req.user!.id]),
      query(`SELECT trust_score FROM users WHERE id = $1`, [req.user!.id]),
    ]);

    if (trustRes.rowCount === 0) {
      res.json({
        success: true,
        data: {
          score: parseFloat(breakdown.rows[0]?.trust_score) || 50,
          breakdown: { report_validity_rate: 0, evidence_quality_avg: 0, duplicate_rate: 0, verification_accuracy: 0, moderation_flags: 0, successful_missions: 0 },
          last_computed_at: null,
        },
      });
      return;
    }

    const t = trustRes.rows[0];
    res.json({
      success: true,
      data: {
        score: parseFloat(t.score),
        breakdown: {
          report_validity_rate: parseFloat(t.report_validity_rate),
          evidence_quality_avg: parseFloat(t.evidence_quality_avg),
          duplicate_rate: parseFloat(t.duplicate_rate),
          verification_accuracy: parseFloat(t.verification_accuracy),
          moderation_flags: t.moderation_flags,
          successful_missions: t.successful_missions,
          total_actions: t.total_actions,
        },
        last_computed_at: t.last_computed_at,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch trust score' });
  }
});

// ─── POST /trust/compute/:userId (admin) ─────────────────────────
router.post('/trust/compute/:userId', requireAuth, requireRole('sub_admin', 'super_admin'), async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.params.userId;

    // Compute from various signals
    const [reports, duplicates, moderation, missions, verifications] = await Promise.all([
      query(`SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status != 'rejected') as valid FROM reports WHERE user_id = $1`, [userId]),
      query(
        `SELECT COUNT(*) as dup_count FROM reports r1
         WHERE r1.user_id = $1 AND EXISTS (
           SELECT 1 FROM reports r2 WHERE r2.id != r1.id AND r2.incident_id = r1.incident_id AND r2.user_id = $1
         )`, [userId]
      ),
      query(`SELECT COUNT(*) as flags FROM fraud_flags WHERE user_id = $1 AND status = 'confirmed'`, [userId]),
      query(
        `SELECT COUNT(*) as completed FROM volunteer_participations WHERE user_id = $1 AND status = 'completed'`, [userId]
      ),
      query(
        `SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE verdict = 'solved') as correct
         FROM resolution_verifications WHERE user_id = $1`, [userId]
      ),
    ]);

    const totalReports = parseInt(reports.rows[0].total) || 0;
    const validReports = parseInt(reports.rows[0].valid) || 0;
    const dupCount = parseInt(duplicates.rows[0].dup_count) || 0;
    const flagCount = parseInt(moderation.rows[0].flags) || 0;
    const missionCount = parseInt(missions.rows[0].completed) || 0;
    const totalVerif = parseInt(verifications.rows[0].total) || 0;
    const correctVerif = parseInt(verifications.rows[0].correct) || 0;

    const reportValidity = totalReports > 0 ? (validReports / totalReports) * 100 : 50;
    const duplicateRate = totalReports > 0 ? (dupCount / totalReports) * 100 : 0;
    const verifAccuracy = totalVerif > 0 ? (correctVerif / totalVerif) * 100 : 50;
    const totalActions = totalReports + missionCount + totalVerif;

    // Weighted score calculation
    let score = 50; // baseline
    score += (reportValidity - 50) * 0.3; // reward high validity
    score -= duplicateRate * 0.4; // penalize duplicates
    score -= flagCount * 5; // penalize confirmed fraud
    score += Math.min(missionCount * 2, 20); // reward missions (capped)
    score += (verifAccuracy - 50) * 0.2; // reward accuracy

    score = Math.max(0, Math.min(100, score));

    // Upsert trust score
    await query(
      `INSERT INTO civic_trust_scores (user_id, score, report_validity_rate, evidence_quality_avg, duplicate_rate, verification_accuracy, moderation_flags, successful_missions, total_actions, last_computed_at, updated_at)
       VALUES ($1, $2, $3, 50, $4, $5, $6, $7, $8, NOW(), NOW())
       ON CONFLICT (user_id) DO UPDATE SET
         score = $2, report_validity_rate = $3, duplicate_rate = $4, verification_accuracy = $5,
         moderation_flags = $6, successful_missions = $7, total_actions = $8,
         last_computed_at = NOW(), updated_at = NOW()`,
      [userId, score, reportValidity, duplicateRate, verifAccuracy, flagCount, missionCount, totalActions]
    );

    // Also update user's trust_score column
    await query(`UPDATE users SET trust_score = $1 WHERE id = $2`, [score, userId]);

    res.json({
      success: true,
      data: {
        user_id: userId,
        score: Math.round(score * 100) / 100,
        report_validity_rate: Math.round(reportValidity * 100) / 100,
        duplicate_rate: Math.round(duplicateRate * 100) / 100,
        verification_accuracy: Math.round(verifAccuracy * 100) / 100,
        moderation_flags: flagCount,
        successful_missions: missionCount,
        total_actions: totalActions,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to compute trust score' });
  }
});

export { router as fraudRouter };
