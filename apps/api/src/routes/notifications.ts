import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { query } from '../db/pool';
import { logger } from '../utils/logger';

const router = Router();

// ─── Notification Creation Helper (exported for use by other routes) ──
export async function createNotification(
  userId: string,
  type: string,
  title: string,
  body: string,
  data: Record<string, unknown> = {}
): Promise<void> {
  try {
    await query(
      `INSERT INTO notifications (user_id, type, title, body, data)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, type, title, body, JSON.stringify(data)]
    );
  } catch (err) {
    logger.error('Failed to create notification:', err);
  }
}

// All notifications require auth
router.use(requireAuth);

// ─── GET /notifications ───────────────────────────────────────
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      `SELECT * FROM notifications 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT 50`,
      [req.user!.id]
    );

    res.json({ success: true, data: result.rows });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch notifications' });
  }
});

// ─── POST /notifications/:id/read ─────────────────────────────
router.post('/:id/read', async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      `UPDATE notifications 
       SET read = TRUE 
       WHERE id = $1 AND user_id = $2 
       RETURNING id`,
      [req.params.id, req.user!.id]
    );

    if (result.rowCount === 0) {
      res.status(404).json({ success: false, error: 'Notification not found' });
      return;
    }

    res.json({ success: true, message: 'Notification marked as read' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to update notification' });
  }
});

export { router as notificationsRouter };
