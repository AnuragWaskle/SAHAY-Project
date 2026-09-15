import { Router, Response } from 'express';
import { requireAuth, optionalAuth, AuthRequest, requireRole } from '../middleware/auth';
import { query } from '../db/pool';

const router = Router();

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

// ─── GET /city/:id/home (mobile home screen data) ─────────────

router.get('/:id/home', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const cityId = req.params.id;

    const [scoreRes, incidentRes, reportRes, citizenRes, demandRes, initiativeRes] = await Promise.all([
      query(
        `SELECT * FROM city_index_snapshots WHERE city_id = $1 ORDER BY period_end DESC LIMIT 1`,
        [cityId]
      ),
      query(
        `SELECT
          COUNT(*) FILTER (WHERE status = 'active') as active,
          COUNT(*) FILTER (WHERE status = 'resolved') as resolved,
          COUNT(*) as total
         FROM civic_incidents WHERE city_id = $1`,
        [cityId]
      ),
      query(
        `SELECT COUNT(*) as total FROM reports
         WHERE ward_id IN (SELECT id FROM wards WHERE city_id = $1)`,
        [cityId]
      ),
      query(
        `SELECT COUNT(DISTINCT user_id) as active_citizens
         FROM reports
         WHERE ward_id IN (SELECT id FROM wards WHERE city_id = $1)
         AND created_at > NOW() - INTERVAL '30 days'`,
        [cityId]
      ),
      query(
        `SELECT cd.id, cd.title, cd.supporters_count, cd.stage, ci.category
         FROM civic_demands cd
         JOIN civic_incidents ci ON cd.incident_id = ci.id
         WHERE ci.city_id = $1 AND cd.stage NOT IN ('resolved', 'rejected')
         ORDER BY cd.supporters_count DESC
         LIMIT 3`,
        [cityId]
      ),
      query(
        `SELECT COUNT(*) as active_initiatives FROM initiatives i
         JOIN organizations o ON i.organization_id = o.id
         WHERE i.status = 'active'`,
        []
      ),
    ]);

    // Compute on-the-fly score if no snapshot exists
    let cityScore = scoreRes.rows[0];
    if (!cityScore) {
      const incidents = incidentRes.rows[0];
      const total = parseInt(incidents.total) || 1;
      const resolved = parseInt(incidents.resolved) || 0;
      const resolutionRate = Math.round((resolved / total) * 100);
      const activeCitizens = parseInt(citizenRes.rows[0]?.active_citizens || '0');
      const participation = Math.min(Math.round((activeCitizens / 100) * 100), 100);
      const overallScore = Math.round((resolutionRate * 0.4 + participation * 0.3 + 50 * 0.3));

      cityScore = {
        score: overallScore,
        sub_scores: {
          cleanliness: Math.max(30, overallScore - 10 + Math.floor(Math.random() * 10)),
          roads: Math.max(30, overallScore - 5),
          water: Math.max(30, overallScore + 5),
          safety: Math.max(30, overallScore - 8),
          satisfaction: Math.max(30, overallScore + 3),
        },
      };
    }

    res.json({
      success: true,
      data: {
        city_score: cityScore,
        incidents: incidentRes.rows[0],
        total_reports: parseInt(reportRes.rows[0]?.total || '0'),
        active_citizens: parseInt(citizenRes.rows[0]?.active_citizens || '0'),
        top_demands: demandRes.rows,
        active_initiatives: parseInt(initiativeRes.rows[0]?.active_initiatives || '0'),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch home data' });
  }
});

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

// ─── POST /city/:id/compute-score (admin) ─────────────────────

router.post('/:id/compute-score', requireAuth, requireRole('sub_admin', 'super_admin'),
  async (req: AuthRequest, res: Response) => {
  try {
    const cityId = req.params.id;

    const [incidentStats, reportStats, demandStats, verificationStats] = await Promise.all([
      query(
        `SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'resolved') as resolved,
          COUNT(*) FILTER (WHERE status = 'active') as active,
          COUNT(*) FILTER (WHERE severity = 'critical' AND status = 'active') as critical_active
         FROM civic_incidents WHERE city_id = $1`,
        [cityId]
      ),
      query(
        `SELECT COUNT(*) as total, COUNT(DISTINCT user_id) as unique_reporters
         FROM reports WHERE ward_id IN (SELECT id FROM wards WHERE city_id = $1)
         AND created_at > NOW() - INTERVAL '30 days'`,
        [cityId]
      ),
      query(
        `SELECT COUNT(*) FILTER (WHERE cd.stage = 'resolved') as resolved_demands,
          COUNT(*) as total_demands
         FROM civic_demands cd JOIN civic_incidents ci ON cd.incident_id = ci.id
         WHERE ci.city_id = $1`,
        [cityId]
      ),
      query(
        `SELECT COUNT(*) FILTER (WHERE rv.verdict = 'solved') as solved,
          COUNT(*) as total
         FROM resolution_verifications rv
         JOIN civic_demands cd ON rv.demand_id = cd.id
         JOIN civic_incidents ci ON cd.incident_id = ci.id
         WHERE ci.city_id = $1`,
        [cityId]
      ),
    ]);

    const incidents = incidentStats.rows[0];
    const reports = reportStats.rows[0];
    const demands = demandStats.rows[0];
    const verifications = verificationStats.rows[0];

    const totalIncidents = parseInt(incidents.total) || 1;
    const resolvedIncidents = parseInt(incidents.resolved) || 0;
    const resolutionRate = (resolvedIncidents / totalIncidents) * 100;

    const totalDemands = parseInt(demands.total_demands) || 1;
    const resolvedDemands = parseInt(demands.resolved_demands) || 0;
    const demandResolutionRate = (resolvedDemands / totalDemands) * 100;

    const uniqueReporters = parseInt(reports.unique_reporters) || 0;
    const participation = Math.min((uniqueReporters / 500) * 100, 100);

    const totalVerifications = parseInt(verifications.total) || 1;
    const solvedVerifications = parseInt(verifications.solved) || 0;
    const satisfaction = (solvedVerifications / totalVerifications) * 100;

    // Weighted composite: Resolution 30%, Quality 20%, Satisfaction 15%, Participation 10%, etc.
    const overallScore = Math.round(
      resolutionRate * 0.30 +
      demandResolutionRate * 0.20 +
      satisfaction * 0.15 +
      participation * 0.10 +
      Math.max(0, 100 - parseInt(incidents.critical_active) * 10) * 0.10 +
      Math.min(100, parseInt(reports.total) * 2) * 0.05 +
      50 * 0.10 // NGO/community action placeholder
    );

    const subScores = {
      resolution: Math.round(resolutionRate),
      demand_fulfillment: Math.round(demandResolutionRate),
      citizen_satisfaction: Math.round(satisfaction),
      citizen_participation: Math.round(participation),
      safety: Math.round(Math.max(0, 100 - parseInt(incidents.critical_active) * 10)),
    };

    const result = await query(
      `INSERT INTO city_index_snapshots (city_id, score, sub_scores, period_start, period_end)
       VALUES ($1, $2, $3, NOW() - INTERVAL '30 days', NOW())
       RETURNING *`,
      [cityId, overallScore, JSON.stringify(subScores)]
    );

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to compute city score' });
  }
});

// ─── GET /city/:id/infrastructure-health ────────────────────────

router.get('/:id/infrastructure-health', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const cityId = req.params.id;

    // Fetch domain category breakdown
    const categoryStats = await query(
      `SELECT category,
        COUNT(*) as total_incidents,
        COUNT(*) FILTER (WHERE status = 'active') as active_count,
        COUNT(*) FILTER (WHERE status = 'resolved' OR status = 'closed') as resolved_count,
        COUNT(*) FILTER (WHERE severity = 'critical' AND status = 'active') as critical_active
       FROM civic_incidents
       WHERE city_id = $1
       GROUP BY category`,
      [cityId]
    );

    // Fetch ward-wise health stats
    const wardStats = await query(
      `SELECT w.id as ward_id, w.name as ward_name, w.ward_number,
        COUNT(ci.id) as total_incidents,
        COUNT(ci.id) FILTER (WHERE ci.status = 'active') as active_incidents,
        COUNT(ci.id) FILTER (WHERE ci.severity = 'critical' AND ci.status = 'active') as critical_incidents
       FROM wards w
       LEFT JOIN civic_incidents ci ON ci.ward_id = w.id
       WHERE w.city_id = $1
       GROUP BY w.id, w.name, w.ward_number
       ORDER BY active_incidents DESC`,
      [cityId]
    );

    // Domain health mapping
    const domainScores: Record<string, { score: number, active: number, resolved: number, status: string }> = {
      road_infrastructure: { score: 78, active: 0, resolved: 0, status: 'MODERATE' },
      drainage_sewage: { score: 64, active: 0, resolved: 0, status: 'NEEDS_ATTENTION' },
      water_supply: { score: 82, active: 0, resolved: 0, status: 'GOOD' },
      street_lighting: { score: 88, active: 0, resolved: 0, status: 'EXCELLENT' },
      public_safety: { score: 91, active: 0, resolved: 0, status: 'EXCELLENT' },
    };

    let totalActiveAll = 0;
    let totalResolvedAll = 0;

    for (const row of categoryStats.rows) {
      const cat = row.category;
      const active = parseInt(row.active_count || '0');
      const resolved = parseInt(row.resolved_count || '0');
      const critical = parseInt(row.critical_active || '0');
      totalActiveAll += active;
      totalResolvedAll += resolved;

      let score = 100 - (active * 5) - (critical * 12);
      score = Math.max(25, Math.min(100, score));

      const status = score >= 85 ? 'EXCELLENT' : (score >= 70 ? 'GOOD' : (score >= 50 ? 'MODERATE' : 'CRITICAL_ATTENTION'));

      if (['pothole', 'road_damage', 'encroachment'].includes(cat)) {
        domainScores.road_infrastructure.active += active;
        domainScores.road_infrastructure.resolved += resolved;
        domainScores.road_infrastructure.score = Math.min(domainScores.road_infrastructure.score, score);
        domainScores.road_infrastructure.status = status;
      } else if (['sewage', 'waterlogging'].includes(cat)) {
        domainScores.drainage_sewage.active += active;
        domainScores.drainage_sewage.resolved += resolved;
        domainScores.drainage_sewage.score = Math.min(domainScores.drainage_sewage.score, score);
        domainScores.drainage_sewage.status = status;
      } else if (['water_supply'].includes(cat)) {
        domainScores.water_supply.active += active;
        domainScores.water_supply.resolved += resolved;
        domainScores.water_supply.score = Math.min(domainScores.water_supply.score, score);
        domainScores.water_supply.status = status;
      } else if (['streetlight'].includes(cat)) {
        domainScores.street_lighting.active += active;
        domainScores.street_lighting.resolved += resolved;
        domainScores.street_lighting.score = Math.min(domainScores.street_lighting.score, score);
        domainScores.street_lighting.status = status;
      } else if (['safety'].includes(cat)) {
        domainScores.public_safety.active += active;
        domainScores.public_safety.resolved += resolved;
        domainScores.public_safety.score = Math.min(domainScores.public_safety.score, score);
        domainScores.public_safety.status = status;
      }
    }

    const overallScore = Math.round(
      (domainScores.road_infrastructure.score * 0.3) +
      (domainScores.drainage_sewage.score * 0.25) +
      (domainScores.water_supply.score * 0.2) +
      (domainScores.street_lighting.score * 0.15) +
      (domainScores.public_safety.score * 0.1)
    );

    res.json({
      success: true,
      data: {
        overall_civic_health: overallScore,
        domains: domainScores,
        total_active_incidents: totalActiveAll,
        total_resolved_incidents: totalResolvedAll,
        wards_ranking: wardStats.rows.map((w: any) => {
          const act = parseInt(w.active_incidents || '0');
          const crit = parseInt(w.critical_incidents || '0');
          const healthScore = Math.max(30, 100 - (act * 6) - (crit * 15));
          return {
            ward_id: w.ward_id,
            ward_name: w.ward_name,
            ward_number: w.ward_number,
            health_score: healthScore,
            active_incidents: act,
            critical_incidents: crit,
            status: healthScore >= 80 ? 'STABLE' : (healthScore >= 55 ? 'MODERATE_RISK' : 'HIGH_RISK'),
          };
        }),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to compute infrastructure health' });
  }
});

// ─── GET /city/:id/officer-stats ─────────────────────────────

router.get('/:id/officer-stats', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const cityId = req.params.id;
    const wardId = req.user?.jurisdiction_id || null;

    const wardCondition = wardId ? `AND ci.ward_id = '${wardId}'` : '';

    const [activeRes, criticalRes, resolvedRes, demandRes] = await Promise.all([
      query(
        `SELECT COUNT(*) as count FROM civic_incidents ci
         WHERE ci.city_id = $1 AND ci.status = 'active' ${wardCondition}`,
        [cityId]
      ),
      query(
        `SELECT COUNT(*) as count FROM civic_incidents ci
         WHERE ci.city_id = $1 AND ci.severity = 'critical' AND ci.status = 'active' ${wardCondition}`,
        [cityId]
      ),
      query(
        `SELECT COUNT(*) as count FROM civic_incidents ci
         WHERE ci.city_id = $1 AND ci.status = 'resolved'
         AND ci.updated_at > NOW() - INTERVAL '24 hours' ${wardCondition}`,
        [cityId]
      ),
      query(
        `SELECT COUNT(*) as count FROM civic_demands cd
         JOIN civic_incidents ci ON cd.incident_id = ci.id
         WHERE ci.city_id = $1 AND cd.stage IN ('proposed', 'community_supported', 'submitted') ${wardCondition}`,
        [cityId]
      ),
    ]);

    res.json({
      success: true,
      data: {
        active_incidents: parseInt(activeRes.rows[0]?.count || '0'),
        critical_count: parseInt(criticalRes.rows[0]?.count || '0'),
        resolved_today: parseInt(resolvedRes.rows[0]?.count || '0'),
        pending_demands: parseInt(demandRes.rows[0]?.count || '0'),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch officer stats' });
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
    const [incidentStats, reportStats, demandStats, userStats] = await Promise.all([
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

export { router as cityRouter };
