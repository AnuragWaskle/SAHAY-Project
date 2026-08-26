import { Router, Response } from 'express';
import { requireAuth, optionalAuth, AuthRequest } from '../middleware/auth';
import { query } from '../db/pool';

const router = Router();

// ─── GET /city/:id/score ───────────────────────────────────────

router.get('/:id/score', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      `SELECT * FROM city_index_snapshots 
       WHERE city_id = $1 
       ORDER BY period_end DESC 
       LIMIT 1`,
      [req.params.id]
    );

    if (!result.rows[0]) {
      res.status(404).json({ success: false, error: 'City score not found' });
      return;
    }

    // Also get active citizen count
    const activeRes = await query(
      `SELECT COUNT(DISTINCT user_id) as active_citizens 
       FROM reports 
       WHERE ward_id IN (SELECT id FROM wards WHERE city_id = $1)
       AND created_at > NOW() - INTERVAL '30 days'`,
      [req.params.id]
    );

    res.json({
      success: true,
      data: {
        ...result.rows[0],
        active_citizens: parseInt(activeRes.rows[0]?.active_citizens || '0'),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch city score' });
  }
});

// ─── GET /city/:id/priorities ─────────────────────────────────

router.get('/:id/priorities', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      `SELECT ci.*, cd.id as demand_id, cd.stage as demand_stage, cd.supporters_count,
        ST_X(ci.location_center) as lng, ST_Y(ci.location_center) as lat,
        w.name as ward_name
       FROM civic_incidents ci
       LEFT JOIN civic_demands cd ON cd.incident_id = ci.id
       LEFT JOIN wards w ON ci.ward_id = w.id
       WHERE ci.city_id = $1 AND ci.status NOT IN ('resolved', 'closed')
       ORDER BY ci.priority_score DESC
       LIMIT 10`,
      [req.params.id]
    );

    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch priorities' });
  }
});

// ─── GET /city/:id/stats ──────────────────────────────────────

router.get('/:id/stats', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const [incidentStats, reportStats, demandStats, orgStats, userStats] = await Promise.all([
      query(
        `SELECT status, COUNT(*) as count FROM civic_incidents WHERE city_id = $1 GROUP BY status`,
        [req.params.id]
      ),
      query(
        `SELECT COUNT(*) as total_reports, COUNT(DISTINCT user_id) as unique_reporters
         FROM reports WHERE ward_id IN (SELECT id FROM wards WHERE city_id = $1)`,
        [req.params.id]
      ),
      query(
        `SELECT stage, COUNT(*) as count FROM civic_demands cd
         JOIN civic_incidents ci ON cd.incident_id = ci.id
         WHERE ci.city_id = $1 GROUP BY stage`,
        [req.params.id]
      ),
      query(
        `SELECT COUNT(*) as count FROM organizations 
         WHERE $1 = ANY(SELECT id::text FROM wards WHERE city_id = $1)
         OR operating_wards::text LIKE '%${req.params.id}%'`,
        [req.params.id]
      ),
      query(
        `SELECT COUNT(*) as total_users, 
          SUM(civic_impact_score) as total_impact_score,
          COUNT(CASE WHEN role IN ('verified_citizen', 'civic_leader') THEN 1 END) as verified_users
         FROM users WHERE city_id = $1`,
        [req.params.id]
      ),
    ]);

    res.json({
      success: true,
      data: {
        incidents: incidentStats.rows,
        reports: reportStats.rows[0],
        demands: demandStats.rows,
        organizations: orgStats.rows[0]?.count || 0,
        users: userStats.rows[0],
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch city stats' });
  }
});

// ─── GET /city/:id/wards ──────────────────────────────────────

router.get('/:id/wards', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      `SELECT w.*,
        ST_X(w.center_point) as lng, ST_Y(w.center_point) as lat,
        COUNT(DISTINCT r.id) as report_count,
        COUNT(DISTINCT ci.id) as incident_count
       FROM wards w
       LEFT JOIN reports r ON r.ward_id = w.id
       LEFT JOIN civic_incidents ci ON ci.ward_id = w.id AND ci.status NOT IN ('resolved','closed')
       WHERE w.city_id = $1
       GROUP BY w.id
       ORDER BY w.ward_number`,
      [req.params.id]
    );

    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch wards' });
  }
});

// ─── GET /city (list all cities) ──────────────────────────────

router.get('/', optionalAuth, async (_req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      `SELECT c.*, COUNT(DISTINCT w.id) as ward_count
       FROM cities c
       LEFT JOIN wards w ON w.city_id = c.id
       GROUP BY c.id
       ORDER BY c.name`
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch cities' });
  }
});

export { router as cityRouter };
