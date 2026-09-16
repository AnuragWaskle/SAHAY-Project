import { Router, Response } from 'express';
import { requireAuth, optionalAuth, AuthRequest } from '../middleware/auth';
import { query, transaction } from '../db/pool';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import axios from 'axios';
import { flagFraud } from './fraud';
import { awardCredits } from './credits';

const router = Router();

// Rate limit for report submission
const reportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 reports per hour per IP
  message: { success: false, error: 'Too many reports submitted. Please wait before submitting again.' },
});

// ─── Schema Validation ────────────────────────────────────────

const VALID_CATEGORIES = new Set([
  'pothole', 'road_damage', 'waterlogging', 'garbage', 'streetlight', 'water_supply',
  'sewage', 'encroachment', 'tree_hazard', 'air_pollution', 'noise_pollution',
  'park_damage', 'stray_animals', 'safety', 'other'
]);

export function normalizeCategory(cat: string): string {
  if (!cat) return 'other';
  const lower = cat.toLowerCase().trim();
  if (VALID_CATEGORIES.has(lower)) return lower;

  if (lower.includes('road')) return 'road_damage';
  if (lower.includes('pothole')) return 'pothole';
  if (lower.includes('light') || lower.includes('power')) return 'streetlight';
  if (lower.includes('water') || lower.includes('drain')) return 'waterlogging';
  if (lower.includes('sanitat') || lower.includes('garb') || lower.includes('trash')) return 'garbage';
  if (lower.includes('sewag')) return 'sewage';
  if (lower.includes('safe') || lower.includes('hazard')) return 'safety';
  if (lower.includes('tree') || lower.includes('park') || lower.includes('environ')) return 'tree_hazard';

  return 'other';
}

const CreateReportSchema = z.object({
  category: z.string().min(1).transform(normalizeCategory),
  description: z.string().min(3).max(5000),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  address: z.string().optional(),
  ward_id: z.string().uuid().optional(),
  media_urls: z.array(z.string()).default([]),
  language: z.string().default('en'),
  is_sos: z.boolean().default(false),
});

// ─── GET /reports ─────────────────────────────────────────────

router.get('/', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const {
      ward_id, category, status, incident_id,
      lat, lng, radius_m,
      page = '1', limit = '20',
    } = req.query as Record<string, string>;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIdx = 1;

    if (ward_id) { conditions.push(`r.ward_id = $${paramIdx++}`); params.push(ward_id); }
    if (category) { conditions.push(`r.category = $${paramIdx++}`); params.push(category); }
    if (status) { conditions.push(`r.status = $${paramIdx++}`); params.push(status); }
    if (incident_id) { conditions.push(`r.incident_id = $${paramIdx++}`); params.push(incident_id); }

    // Geo filter
    if (lat && lng && radius_m) {
      conditions.push(
        `ST_DWithin(r.location::geography, ST_SetSRID(ST_MakePoint($${paramIdx++}, $${paramIdx++}), 4326)::geography, $${paramIdx++})`
      );
      params.push(parseFloat(lng), parseFloat(lat), parseFloat(radius_m));
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [dataRes, countRes] = await Promise.all([
      query(
        `SELECT r.*, 
          ST_X(r.location) as lng, ST_Y(r.location) as lat,
          u.name as reporter_name, u.privacy_level,
          w.name as ward_name
         FROM reports r
         LEFT JOIN users u ON r.user_id = u.id
         LEFT JOIN wards w ON r.ward_id = w.id
         ${whereClause}
         ORDER BY r.created_at DESC
         LIMIT $${paramIdx++} OFFSET $${paramIdx++}`,
        [...params, parseInt(limit), offset]
      ),
      query(`SELECT COUNT(*) FROM reports r ${whereClause}`, params),
    ]);

    res.json({
      success: true,
      data: {
        items: dataRes.rows,
        total: parseInt(countRes.rows[0].count),
        page: parseInt(page),
        limit: parseInt(limit),
        has_more: offset + dataRes.rows.length < parseInt(countRes.rows[0].count),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch reports' });
  }
});

// ─── GET /reports/mine ─────────────────────────────────────────
router.get('/mine', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { page = '1', limit = '20' } = req.query as Record<string, string>;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const [dataRes, countRes] = await Promise.all([
      query(
        `SELECT r.*,
          ST_X(r.location) as lng, ST_Y(r.location) as lat,
          w.name as ward_name,
          ci.title as incident_title
         FROM reports r
         LEFT JOIN wards w ON r.ward_id = w.id
         LEFT JOIN civic_incidents ci ON r.incident_id = ci.id
         WHERE r.user_id = $1
         ORDER BY r.created_at DESC
         LIMIT $2 OFFSET $3`,
        [req.user!.id, parseInt(limit), offset]
      ),
      query('SELECT COUNT(*) FROM reports WHERE user_id = $1', [req.user!.id]),
    ]);

    res.json({
      success: true,
      data: {
        items: dataRes.rows,
        total: parseInt(countRes.rows[0].count),
        page: parseInt(page),
        limit: parseInt(limit),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch your reports' });
  }
});

// ─── GET /reports/:id ─────────────────────────────────────────

router.get('/:id', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      `SELECT r.*, 
        ST_X(r.location) as lng, ST_Y(r.location) as lat,
        u.name as reporter_name, u.avatar_url as reporter_avatar, u.privacy_level,
        w.name as ward_name,
        ci.title as incident_title
       FROM reports r
       LEFT JOIN users u ON r.user_id = u.id
       LEFT JOIN wards w ON r.ward_id = w.id
       LEFT JOIN civic_incidents ci ON r.incident_id = ci.id
       WHERE r.id = $1`,
      [req.params.id]
    );

    if (!result.rows[0]) {
      res.status(404).json({ success: false, error: 'Report not found' });
      return;
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch report' });
  }
});

// ─── POST /reports ────────────────────────────────────────────

router.post('/', requireAuth, reportLimiter, async (req: AuthRequest, res: Response) => {
  try {
    const body = CreateReportSchema.parse(req.body);
    const userId = req.user!.id;

    // AI processing via Python AI services
    let aiData = null;
    let evidenceConfidence = 0.7;

    try {
      const aiUrl = `${process.env.AI_SERVICES_URL || 'http://localhost:8001'}/nlu/analyze`;
      const aiRes = await axios.post(aiUrl, {
        text: body.description,
        language: body.language,
        category_hint: body.category,
        media_urls: body.media_urls,
      }, { timeout: 10000 });
      aiData = aiRes.data;
      evidenceConfidence = aiRes.data.confidence || 0.7;
    } catch {
      // AI service unavailable — continue without AI structuring
    }

    // Check for nearby duplicate/cluster before inserting
    let clusteredIncidentId: string | null = null;
    let clusterResult = null;

    try {
      const clusterUrl = `${process.env.AI_SERVICES_URL || 'http://localhost:8001'}/clustering/check`;
      const clusterRes = await axios.post(clusterUrl, {
        lat: body.lat,
        lng: body.lng,
        category: body.category,
        description: body.description,
        radius_m: 800,
      }, { timeout: 10000 });
      clusterResult = clusterRes.data;
      if (clusterResult?.incident_id) {
        clusteredIncidentId = clusterResult.incident_id;
      }
    } catch {
      // Clustering unavailable
    }

    // Determine ward if not provided
    let wardId = body.ward_id;
    if (!wardId) {
      const wardRes = await query(
        `SELECT id FROM wards 
         WHERE ST_Within(ST_SetSRID(ST_MakePoint($1, $2), 4326), boundary)
         LIMIT 1`,
        [body.lng, body.lat]
      );
      wardId = wardRes.rows[0]?.id || null;
    }

    const result = await query(
      `INSERT INTO reports 
        (user_id, category, description, ai_structured_data, media_urls, location, 
         address, ward_id, evidence_confidence, status, incident_id, language, is_sos)
       VALUES ($1, $2, $3, $4, $5, ST_SetSRID(ST_MakePoint($6, $7), 4326),
               $8, $9, $10, $11, $12, $13, $14)
       RETURNING *, ST_X(location) as lng, ST_Y(location) as lat`,
      [
        userId, body.category, body.description,
        aiData ? JSON.stringify(aiData) : null,
        JSON.stringify(body.media_urls),
        body.lng, body.lat,
        body.address || null, wardId || null,
        evidenceConfidence,
        clusteredIncidentId ? 'clustered' : 'ai_processed',
        clusteredIncidentId,
        body.language, body.is_sos,
      ]
    );

    const report = result.rows[0];

    // If clustered, update incident report count
    if (clusteredIncidentId) {
      await query(
        `UPDATE civic_incidents 
         SET report_count = report_count + 1,
             unique_citizen_count = (
               SELECT COUNT(DISTINCT user_id) FROM reports WHERE incident_id = $1
             ),
             updated_at = NOW()
         WHERE id = $1`,
        [clusteredIncidentId]
      );
    } else {
      // If not clustered via AI service, create an incident directly
      try {
        const cityId = req.user?.city_id || '00000000-0000-0000-0000-000000000001';
        const incRes = await query(
          `INSERT INTO civic_incidents 
            (city_id, ward_id, category, title, description, report_count, unique_citizen_count, severity, status, priority_score, location_center)
           VALUES ($1, $2, $3, $4, $5, 1, 1, 'high', 'active', 8.5, ST_SetSRID(ST_MakePoint($6, $7), 4326))
           RETURNING id`,
          [cityId, wardId || null, body.category, `${body.category.toUpperCase().replace('_', ' ')} Issue Reported`, body.description, body.lng, body.lat]
        );
        const newIncId = incRes.rows[0]?.id;
        if (newIncId) {
          await query('UPDATE reports SET incident_id = $1 WHERE id = $2', [newIncId, report.id]);
          report.incident_id = newIncId;
        }
      } catch (incErr) {
        console.error('Failed to create incident record for report:', incErr);
      }
    }

    // Update user's civic impact score (+5 for report submission)
    await query(
      'UPDATE users SET civic_impact_score = civic_impact_score + 5, updated_at = NOW() WHERE id = $1',
      [userId]
    );

    // Handle SOS fast-path
    if (body.is_sos) {
      await query(
        `INSERT INTO sos_alerts (user_id, location, description)
         VALUES ($1, ST_SetSRID(ST_MakePoint($2, $3), 4326), $4)`,
        [userId, body.lng, body.lat, body.description]
      );
    }

    // Award civic credits via centralized system (enforces daily limits, cooldowns, trust multiplier)
    let creditsEarned = 0;
    try {
      const hasEvidence = body.media_urls && body.media_urls.length > 0;
      const creditAction = hasEvidence ? 'report_with_evidence' : 'report_submitted';
      const result = await awardCredits(userId, creditAction, hasEvidence ? 'Report with evidence submitted' : 'Civic report submitted', 'report', report.id);
      creditsEarned = result?.credits || 0;
    } catch {}

    // Fraud detection: check for rapid-fire duplicate submissions
    try {
      const recentRes = await query(
        `SELECT COUNT(*) as cnt FROM reports WHERE user_id = $1 AND created_at > NOW() - INTERVAL '10 minutes'`,
        [userId]
      );
      const recentCount = parseInt(recentRes.rows[0].cnt);
      if (recentCount >= 5) {
        await flagFraud(userId, 'rapid_submission', 'medium', `${recentCount} reports in 10 minutes`, { report_id: report.id, count: recentCount });
      }
    } catch {}

    // Referral activation: if this is user's first report & they have a pending referral
    try {
      const reportCountRes = await query(
        `SELECT COUNT(*) as cnt FROM reports WHERE user_id = $1`,
        [userId]
      );
      if (parseInt(reportCountRes.rows[0].cnt) === 1) {
        const pendingRef = await query(
          `SELECT id, referrer_id FROM referrals WHERE referred_id = $1 AND status = 'pending'`,
          [userId]
        );
        if ((pendingRef.rowCount ?? 0) > 0) {
          const ref = pendingRef.rows[0];
          const REFERRAL_REWARD = 25;
          const REFERRED_BONUS = 10;
          await transaction(async (q) => {
            await q(`UPDATE referrals SET status = 'rewarded', reward_credits = $1, activated_at = NOW() WHERE id = $2`, [REFERRAL_REWARD, ref.id]);
            await q(`UPDATE users SET civic_credits = civic_credits + $1 WHERE id = $2`, [REFERRAL_REWARD, ref.referrer_id]);
            await q(
              `INSERT INTO civic_credits_ledger (user_id, action, credits, balance_after, reason, source_type, source_id)
               VALUES ($1, 'referral_bonus', $2, (SELECT civic_credits FROM users WHERE id = $1), 'Referral reward: referred user submitted first report', 'referral', $3)`,
              [ref.referrer_id, REFERRAL_REWARD, ref.id]
            );
            await q(`UPDATE users SET civic_credits = civic_credits + $1 WHERE id = $2`, [REFERRED_BONUS, userId]);
            await q(
              `INSERT INTO civic_credits_ledger (user_id, action, credits, balance_after, reason, source_type, source_id)
               VALUES ($1, 'referral_bonus', $2, (SELECT civic_credits FROM users WHERE id = $1), 'Welcome bonus: first civic report submitted', 'referral', $3)`,
              [userId, REFERRED_BONUS, ref.id]
            );
          });
        }
      }
    } catch {}

    res.status(201).json({
      success: true,
      data: report,
      meta: {
        clustered_into: clusteredIncidentId,
        ai_analysis: aiData,
        cluster_result: clusterResult,
        credits_earned: creditsEarned,
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ success: false, error: 'Validation failed', details: err.issues });
      return;
    }
    console.error('Report creation error:', err);
    res.status(500).json({ success: false, error: 'Failed to create report' });
  }
});

// ─── POST /reports/:id/join-incident ─────────────────────────

router.post('/:id/join-incident', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { incident_id } = req.body;
    if (!incident_id) {
      res.status(400).json({ success: false, error: 'incident_id required' });
      return;
    }

    await query(
      'UPDATE reports SET incident_id = $1, status = $2 WHERE id = $3 AND user_id = $4',
      [incident_id, 'clustered', req.params.id, req.user!.id]
    );

    await query(
      `UPDATE civic_incidents 
       SET report_count = report_count + 1,
           unique_citizen_count = (SELECT COUNT(DISTINCT user_id) FROM reports WHERE incident_id = $1),
           updated_at = NOW()
       WHERE id = $1`,
      [incident_id]
    );

    res.json({ success: true, message: 'Report joined to incident' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to join incident' });
  }
});

export { router as reportsRouter };
