import { Router, Response } from 'express';
import { optionalAuth, AuthRequest } from '../middleware/auth';
import { query } from '../db/pool';

const router = Router();

// ─── POST /integrity ──────────────────────────────────────────
// Protected optionally anonymous reporting channel
router.post('/', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { description, evidence, target_type, target_id } = req.body;
    if (!description) {
      res.status(400).json({ success: false, error: 'Description is required' });
      return;
    }

    const userId = req.user?.id || null;

    const result = await query(
      `INSERT INTO integrity_reports (reporter_user_id, description, evidence, target_type, target_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, status, created_at`,
      [
        userId,
        description,
        evidence ? JSON.stringify(evidence) : '[]',
        target_type || null,
        target_id || null
      ]
    );

    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'Integrity/corruption report submitted securely. Rest assured, your identity is protected.'
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to submit integrity report' });
  }
});

export { router as integrityRouter };
