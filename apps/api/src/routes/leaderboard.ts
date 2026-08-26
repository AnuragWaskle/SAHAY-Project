import { Router, Response } from 'express';
import { optionalAuth, AuthRequest } from '../middleware/auth';
import { query } from '../db/pool';

const router = Router();

// ─── GET /leaderboard?type=citizens|wards|ngos|initiatives&city_id= ──

router.get('/', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { type = 'citizens', city_id = '00000000-0000-0000-0000-000000000001', limit = '10' } = req.query as Record<string, string>;

    let result;
    switch (type) {
      case 'citizens':
        result = await query(
          `SELECT u.id, u.name, u.avatar_url, u.civic_impact_score, u.level, u.badge_type,
            u.privacy_level, w.name as ward_name,
            (SELECT COUNT(*) FROM reports WHERE user_id = u.id) as report_count,
            (SELECT COUNT(*) FROM demand_supporters WHERE user_id = u.id) as demands_supported
           FROM users u
           LEFT JOIN wards w ON u.jurisdiction_id = w.id
           WHERE u.city_id = $1 AND u.role NOT IN ('super_admin', 'sub_admin', 'municipal_officer')
           ORDER BY u.civic_impact_score DESC
           LIMIT $2`,
          [city_id, parseInt(limit)]
        );
        break;

      case 'wards':
        result = await query(
          `SELECT w.id, w.name, w.ward_number,
            COUNT(DISTINCT r.id) as report_count,
            COUNT(DISTINCT CASE WHEN ci.status = 'resolved' THEN ci.id END) as resolved_incidents,
            COUNT(DISTINCT ci.id) as total_incidents,
            ROUND(COUNT(DISTINCT CASE WHEN ci.status = 'resolved' THEN ci.id END)::numeric / NULLIF(COUNT(DISTINCT ci.id), 0) * 100, 1) as resolution_rate
           FROM wards w
           LEFT JOIN reports r ON r.ward_id = w.id
           LEFT JOIN civic_incidents ci ON ci.ward_id = w.id
           WHERE w.city_id = $1
           GROUP BY w.id
           ORDER BY resolved_incidents DESC, report_count DESC
           LIMIT $2`,
          [city_id, parseInt(limit)]
        );
        break;

      case 'ngos':
        result = await query(
          `SELECT o.id, o.name, o.type, o.logo_url, o.description,
            COUNT(DISTINCT i.id) as initiative_count,
            SUM(i.volunteer_count) as total_volunteers,
            COUNT(DISTINCT CASE WHEN i.status = 'completed' THEN i.id END) as completed_initiatives
           FROM organizations o
           LEFT JOIN initiatives i ON i.organization_id = o.id
           WHERE o.verification_status = 'verified'
           GROUP BY o.id
           ORDER BY completed_initiatives DESC, initiative_count DESC
           LIMIT $1`,
          [parseInt(limit)]
        );
        break;

      case 'initiatives':
        result = await query(
          `SELECT i.*, o.name as org_name, o.type as org_type, ci.title as incident_title
           FROM initiatives i
           JOIN organizations o ON i.organization_id = o.id
           LEFT JOIN civic_incidents ci ON i.incident_id = ci.id
           WHERE i.status = 'active'
           ORDER BY i.volunteer_count DESC, i.contributor_count DESC
           LIMIT $1`,
          [parseInt(limit)]
        );
        break;

      default:
        res.status(400).json({ success: false, error: 'Invalid leaderboard type' });
        return;
    }

    res.json({ success: true, data: result.rows, type });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch leaderboard' });
  }
});

export { router as leaderboardRouter };
