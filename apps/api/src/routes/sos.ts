import { Router, Response } from 'express';
import { requireAuth, optionalAuth, AuthRequest } from '../middleware/auth';
import { query } from '../db/pool';
import { rateLimit } from 'express-rate-limit';

const router = Router();

const sosLimiter = rateLimit({ windowMs: 5 * 60 * 1000, max: 3 });

// POST /sos - SOS fast-path (does NOT go through AI clustering pipeline)
router.post('/', requireAuth, sosLimiter, async (req: AuthRequest, res: Response) => {
  try {
    const { lat, lng, description } = req.body;
    if (!lat || !lng) { res.status(400).json({ success: false, error: 'lat/lng required' }); return; }

    const result = await query(
      'INSERT INTO sos_alerts (user_id, location, description) VALUES ($1, ST_SetSRID(ST_MakePoint($2, $3), 4326), $4) RETURNING *',
      [req.user!.id, lng, lat, description || null]
    );

    // TODO: Push FCM notification to nearby police role users
    // This is intentionally NOT routed through AI clustering to avoid delay

    res.status(201).json({
      success: true,
      data: result.rows[0],
      emergency_numbers: [
        { label: 'Police', number: '100' },
        { label: 'Fire', number: '101' },
        { label: 'Ambulance', number: '102' },
        { label: 'Disaster', number: '108' },
        { label: 'Women Helpline', number: '1091' },
      ],
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to create SOS alert' });
  }
});

export { router as sosRouter };
