import { Router, Response } from 'express';
import { requireAuth, optionalAuth, AuthRequest } from '../middleware/auth';
import { query } from '../db/pool';

const router = Router();

// GET /predictions?city_id=&category=&ward_id=
router.get('/', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { city_id = '00000000-0000-0000-0000-000000000001', category, ward_id } = req.query as Record<string, string>;
    const conditions = ['rp.city_id = $1'];
    const params: unknown[] = [city_id];
    let p = 2;
    if (category) { conditions.push(`rp.category = $${p++}`); params.push(category); }
    if (ward_id) { conditions.push(`rp.ward_id = $${p++}`); params.push(ward_id); }
    const result = await query(
      `SELECT rp.*, w.name as ward_name FROM risk_predictions rp
       LEFT JOIN wards w ON rp.ward_id = w.id
       WHERE ${conditions.join(' AND ')}
       ORDER BY rp.risk_score DESC, rp.generated_at DESC`,
      params
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch predictions' });
  }
});

export { router as predictionsRouter };
