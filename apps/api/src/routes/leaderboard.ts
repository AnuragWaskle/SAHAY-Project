import { Router, Response } from 'express';
import { optionalAuth, AuthRequest } from '../middleware/auth';
import { query } from '../db/pool';

const router = Router();

// ─── GET /leaderboard?type=citizens|resolvers|wards|cities|ngos ──────

router.get('/', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { type = 'citizens', limit = '10', city_id, search } = req.query as Record<string, string>;
    const limitNum = parseInt(limit) || 10;

    let result;
    switch (type) {
      case 'citizens': {
        const conditions: string[] = [];
        const params: unknown[] = [];
        let p = 1;
        if (city_id) { conditions.push(`u.city_id = $${p++}`); params.push(city_id); }
        if (search) { conditions.push(`(u.name ILIKE $${p} OR w.name ILIKE $${p})`); params.push(`%${search}%`); p++; }
        const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
        params.push(limitNum);

        result = await query(
          `SELECT u.id, u.name, u.avatar_url, COALESCE(u.civic_impact_score, 0) as civic_impact_score, u.level, u.badge_type,
            COALESCE(w.name, 'Unassigned Ward') as ward_name,
            (SELECT COUNT(*) FROM reports WHERE user_id = u.id) as report_count
           FROM users u
           LEFT JOIN wards w ON u.jurisdiction_id = w.id
           ${where}
           ORDER BY u.civic_impact_score DESC, u.created_at ASC
           LIMIT $${p}`,
          params
        );
        break;
      }

      case 'resolvers': {
        const conditions: string[] = [];
        const params: unknown[] = [];
        let p = 1;
        if (city_id) { conditions.push(`u.city_id = $${p++}`); params.push(city_id); }
        if (search) { conditions.push(`(u.name ILIKE $${p} OR w.name ILIKE $${p})`); params.push(`%${search}%`); p++; }
        const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
        params.push(limitNum);

        result = await query(
          `SELECT u.id, u.name, u.role, u.avatar_url, COALESCE(u.civic_impact_score, 0) as civic_impact_score, u.badge_type,
            COALESCE(w.name, 'Unassigned Ward') as ward_name,
            (SELECT COUNT(*) FROM civic_incidents WHERE status IN ('resolved', 'closed', 'completed')) as resolved_count
           FROM users u
           LEFT JOIN wards w ON u.jurisdiction_id = w.id
           ${where}
           ORDER BY u.civic_impact_score DESC, u.created_at ASC
           LIMIT $${p}`,
          params
        );
        break;
      }

      case 'wards': {
        const conditions: string[] = [];
        const params: unknown[] = [];
        let p = 1;
        if (city_id) { conditions.push(`w.city_id = $${p++}`); params.push(city_id); }
        if (search) { conditions.push(`w.name ILIKE $${p++}`); params.push(`%${search}%`); }
        const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
        params.push(limitNum);

        result = await query(
          `SELECT w.id, w.name, w.ward_number,
            COUNT(DISTINCT r.id) as report_count,
            COUNT(DISTINCT CASE WHEN ci.status IN ('resolved', 'closed', 'completed') THEN ci.id END) as resolved_incidents,
            COUNT(DISTINCT ci.id) as total_incidents,
            COALESCE(ROUND(COUNT(DISTINCT CASE WHEN ci.status IN ('resolved', 'closed', 'completed') THEN ci.id END)::numeric / NULLIF(COUNT(DISTINCT ci.id), 0) * 100, 1), 0) as resolution_rate
           FROM wards w
           LEFT JOIN reports r ON r.ward_id = w.id
           LEFT JOIN civic_incidents ci ON ci.ward_id = w.id
           ${where}
           GROUP BY w.id
           ORDER BY resolved_incidents DESC, report_count DESC
           LIMIT $${p}`,
          params
        );
        break;
      }

      case 'cities': {
        const conditions: string[] = [];
        const params: unknown[] = [];
        let p = 1;
        if (search) { conditions.push(`c.name ILIKE $${p++}`); params.push(`%${search}%`); }
        const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
        params.push(limitNum);

        result = await query(
          `SELECT c.id, c.name, c.state,
            COUNT(DISTINCT ci.id) as total_incidents,
            COUNT(DISTINCT CASE WHEN ci.status IN ('resolved', 'closed', 'completed') THEN ci.id END) as resolved_incidents,
            COALESCE(ROUND(COUNT(DISTINCT CASE WHEN ci.status IN ('resolved', 'closed', 'completed') THEN ci.id END)::numeric / NULLIF(COUNT(DISTINCT ci.id), 0) * 100, 1), 0) as resolution_rate
           FROM cities c
           LEFT JOIN civic_incidents ci ON ci.city_id = c.id
           ${where}
           GROUP BY c.id
           ORDER BY total_incidents DESC
           LIMIT $${p}`,
          params
        );
        break;
      }

      default:
        result = await query('SELECT * FROM users LIMIT $1', [limitNum]);
        break;
    }

    res.json({ success: true, data: result.rows, type });
  } catch (err) {
    console.error('Leaderboard API error:', err);
    res.status(500).json({ success: false, error: 'Failed to calculate leaderboard' });
  }
});

export { router as leaderboardRouter };
