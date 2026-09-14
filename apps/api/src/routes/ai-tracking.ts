import { Router, Response } from 'express';
import { requireAuth, AuthRequest, requireRole } from '../middleware/auth';
import { query } from '../db/pool';

const router = Router();

// ─── Log AI Operation (exported helper) ──────────────────────────
export async function logAiOperation(
  task: string,
  model: string | null,
  entityType: string | null,
  entityId: string | null,
  success: boolean,
  latencyMs: number,
  confidence?: number,
  tokensUsed?: number,
  estimatedCost?: number,
  errorCode?: string,
  errorMessage?: string
): Promise<void> {
  try {
    await query(
      `INSERT INTO ai_operations_log (task, model, provider, entity_type, entity_id, success, latency_ms, confidence, tokens_used, estimated_cost, error_code, error_message)
       VALUES ($1, $2, 'nvidia_nemotron', $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [task, model || process.env.AI_MODEL || 'nvidia/llama-3.1-nemotron-ultra-253b-v1', entityType, entityId, success, latencyMs, confidence || null, tokensUsed || null, estimatedCost || null, errorCode || null, errorMessage || null]
    );
  } catch (err) {
    // Silently fail — don't break main operations for logging
  }
}

// ─── GET /ai/stats ───────────────────────────────────────────────
router.get('/stats', requireAuth, requireRole('sub_admin', 'super_admin'), async (_req: AuthRequest, res: Response) => {
  try {
    const [overall, byTask, recent] = await Promise.all([
      query(
        `SELECT
          COUNT(*) as total_requests,
          COUNT(*) FILTER (WHERE success = true) as successful,
          COUNT(*) FILTER (WHERE success = false) as failed,
          ROUND(AVG(latency_ms)) as avg_latency_ms,
          ROUND(AVG(confidence)::numeric, 2) as avg_confidence,
          COALESCE(SUM(tokens_used), 0) as total_tokens,
          COALESCE(SUM(estimated_cost), 0) as total_cost
         FROM ai_operations_log`
      ),
      query(
        `SELECT task,
          COUNT(*) as requests,
          COUNT(*) FILTER (WHERE success = true) as successes,
          ROUND(AVG(latency_ms)) as avg_latency,
          ROUND(AVG(confidence)::numeric, 2) as avg_confidence,
          COALESCE(SUM(estimated_cost), 0) as cost
         FROM ai_operations_log
         GROUP BY task
         ORDER BY requests DESC`
      ),
      query(
        `SELECT task, model, success, latency_ms, confidence, created_at
         FROM ai_operations_log ORDER BY created_at DESC LIMIT 10`
      ),
    ]);

    const stats = overall.rows[0];
    res.json({
      success: true,
      data: {
        overview: {
          total_requests: parseInt(stats.total_requests),
          successful: parseInt(stats.successful),
          failed: parseInt(stats.failed),
          success_rate: stats.total_requests > 0
            ? Math.round((parseInt(stats.successful) / parseInt(stats.total_requests)) * 100)
            : 0,
          avg_latency_ms: parseInt(stats.avg_latency_ms) || 0,
          avg_confidence: parseFloat(stats.avg_confidence) || 0,
          total_tokens: parseInt(stats.total_tokens),
          total_cost: parseFloat(stats.total_cost),
        },
        by_task: byTask.rows.map((r: any) => ({
          task: r.task,
          requests: parseInt(r.requests),
          successes: parseInt(r.successes),
          avg_latency: parseInt(r.avg_latency) || 0,
          avg_confidence: parseFloat(r.avg_confidence) || 0,
          cost: parseFloat(r.cost),
        })),
        recent_operations: recent.rows,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch AI stats' });
  }
});

// ─── GET /ai/operations ──────────────────────────────────────────
router.get('/operations', requireAuth, requireRole('sub_admin', 'super_admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { task, success: successFilter, from_date, to_date, page = '1', limit = '50' } = req.query as Record<string, string>;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const conditions: string[] = [];
    const params: unknown[] = [];
    let p = 1;

    if (task) { conditions.push(`task = $${p++}`); params.push(task); }
    if (successFilter !== undefined) { conditions.push(`success = $${p++}`); params.push(successFilter === 'true'); }
    if (from_date) { conditions.push(`created_at >= $${p++}`); params.push(from_date); }
    if (to_date) { conditions.push(`created_at <= $${p++}`); params.push(to_date); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const [data, count] = await Promise.all([
      query(
        `SELECT * FROM ai_operations_log ${where} ORDER BY created_at DESC LIMIT $${p++} OFFSET $${p++}`,
        [...params, parseInt(limit), offset]
      ),
      query(`SELECT COUNT(*) FROM ai_operations_log ${where}`, params),
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
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch operations' });
  }
});

// ─── GET /ai/economics ───────────────────────────────────────────
router.get('/economics', requireAuth, requireRole('sub_admin', 'super_admin'), async (_req: AuthRequest, res: Response) => {
  try {
    const [costs, perEntity, daily] = await Promise.all([
      query(
        `SELECT
          COUNT(*) as total_requests,
          COALESCE(SUM(estimated_cost), 0) as total_cost,
          COALESCE(SUM(tokens_used), 0) as total_tokens,
          COUNT(*) FILTER (WHERE success = false) as failures,
          ROUND(AVG(latency_ms)) as avg_latency
         FROM ai_operations_log`
      ),
      query(
        `SELECT
          (SELECT COUNT(DISTINCT entity_id) FROM ai_operations_log WHERE entity_type = 'report') as unique_reports,
          (SELECT COUNT(DISTINCT entity_id) FROM ai_operations_log WHERE entity_type = 'incident') as unique_incidents,
          (SELECT COUNT(DISTINCT u.id) FROM users u) as total_users`
      ),
      query(
        `SELECT DATE(created_at) as date, COUNT(*) as requests, COALESCE(SUM(estimated_cost), 0) as cost
         FROM ai_operations_log
         WHERE created_at > NOW() - INTERVAL '30 days'
         GROUP BY DATE(created_at) ORDER BY date DESC`
      ),
    ]);

    const c = costs.rows[0];
    const e = perEntity.rows[0];
    const totalCost = parseFloat(c.total_cost);
    const reports = parseInt(e.unique_reports) || 1;
    const incidents = parseInt(e.unique_incidents) || 1;
    const users = parseInt(e.total_users) || 1;

    res.json({
      success: true,
      data: {
        total_requests: parseInt(c.total_requests),
        total_cost: totalCost,
        total_tokens: parseInt(c.total_tokens),
        failure_rate: parseInt(c.total_requests) > 0
          ? Math.round((parseInt(c.failures) / parseInt(c.total_requests)) * 100)
          : 0,
        avg_latency_ms: parseInt(c.avg_latency) || 0,
        cost_per_report: Math.round((totalCost / reports) * 10000) / 10000,
        cost_per_incident: Math.round((totalCost / incidents) * 10000) / 10000,
        cost_per_user: Math.round((totalCost / users) * 10000) / 10000,
        daily_trend: daily.rows,
        model: process.env.AI_MODEL || 'nvidia/llama-3.1-nemotron-ultra-253b-v1',
        provider: 'NVIDIA Nemotron (NIM API)',
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch AI economics' });
  }
});

// ─── GET /ai/health ──────────────────────────────────────────────
router.get('/health', requireAuth, requireRole('sub_admin', 'super_admin'), async (_req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      `SELECT
        COUNT(*) as requests_5min,
        COUNT(*) FILTER (WHERE success = true) as successes_5min,
        ROUND(AVG(latency_ms)) as avg_latency_5min,
        ROUND(AVG(confidence)::numeric, 2) as avg_confidence_5min
       FROM ai_operations_log
       WHERE created_at > NOW() - INTERVAL '5 minutes'`
    );

    const r = result.rows[0];
    const requests = parseInt(r.requests_5min);
    const successes = parseInt(r.successes_5min);

    res.json({
      success: true,
      data: {
        status: requests === 0 ? 'idle' : (successes / requests >= 0.9 ? 'healthy' : 'degraded'),
        requests_last_5min: requests,
        success_rate_5min: requests > 0 ? Math.round((successes / requests) * 100) : 100,
        avg_latency_5min: parseInt(r.avg_latency_5min) || 0,
        avg_confidence_5min: parseFloat(r.avg_confidence_5min) || 0,
        model: process.env.AI_MODEL || 'nvidia/llama-3.1-nemotron-ultra-253b-v1',
        provider: 'NVIDIA Nemotron (NIM API)',
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch AI health' });
  }
});

export { router as aiTrackingRouter };
