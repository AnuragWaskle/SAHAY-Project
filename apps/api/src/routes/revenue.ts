import { Router, Response } from 'express';
import { requireAuth, AuthRequest, requireRole } from '../middleware/auth';
import { query } from '../db/pool';

const router = Router();

// ─── GET /revenue/summary (admin only) ──────────────────────────
router.get('/summary', requireAuth, requireRole('sub_admin', 'super_admin'), async (_req: AuthRequest, res: Response) => {
  try {
    const [totalRes, monthRes, bySourceRes] = await Promise.all([
      query(`SELECT COALESCE(SUM(amount), 0) as total FROM revenue_records WHERE status = 'paid'`),
      query(`SELECT COALESCE(SUM(amount), 0) as total FROM revenue_records WHERE status = 'paid' AND created_at >= date_trunc('month', NOW())`),
      query(`SELECT source_type, COALESCE(SUM(amount), 0) as total FROM revenue_records WHERE status = 'paid' GROUP BY source_type`),
    ]);

    const bySource: Record<string, number> = {};
    for (const row of bySourceRes.rows) {
      bySource[row.source_type] = parseFloat(row.total);
    }

    res.json({
      success: true,
      data: {
        total_revenue: parseFloat(totalRes.rows[0].total),
        this_month: parseFloat(monthRes.rows[0].total),
        by_source: bySource,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch revenue summary' });
  }
});

// ─── GET /revenue/records (admin only) ──────────────────────────
router.get('/records', requireAuth, requireRole('sub_admin', 'super_admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { source_type, status, page = '1', limit = '20' } = req.query as Record<string, string>;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const conditions: string[] = [];
    const params: unknown[] = [];
    let p = 1;

    if (source_type) { conditions.push(`source_type = $${p++}`); params.push(source_type); }
    if (status) { conditions.push(`status = $${p++}`); params.push(status); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [data, count] = await Promise.all([
      query(
        `SELECT * FROM revenue_records ${where} ORDER BY created_at DESC LIMIT $${p++} OFFSET $${p++}`,
        [...params, parseInt(limit), offset]
      ),
      query(`SELECT COUNT(*) FROM revenue_records ${where}`, params),
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
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch revenue records' });
  }
});

// ─── POST /revenue/records (admin: create revenue entry) ────────
router.post('/records', requireAuth, requireRole('sub_admin', 'super_admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { source_type, customer_type, customer_id, customer_name, amount, status, invoice_ref, period_start, period_end, description } = req.body;

    if (!source_type || !customer_type || !customer_name || !amount) {
      res.status(400).json({ success: false, error: 'source_type, customer_type, customer_name, and amount are required' });
      return;
    }

    const result = await query(
      `INSERT INTO revenue_records (source_type, customer_type, customer_id, customer_name, amount, status, invoice_ref, period_start, period_end, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [source_type, customer_type, customer_id || null, customer_name, amount, status || 'pending', invoice_ref || null, period_start || null, period_end || null, description || null]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to create revenue record' });
  }
});

// ─── PATCH /revenue/records/:id (admin: update status) ──────────
router.patch('/records/:id', requireAuth, requireRole('sub_admin', 'super_admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { status, invoice_ref } = req.body;
    const updates: string[] = [];
    const params: unknown[] = [];
    let p = 1;

    if (status) { updates.push(`status = $${p++}`); params.push(status); }
    if (invoice_ref) { updates.push(`invoice_ref = $${p++}`); params.push(invoice_ref); }

    if (!updates.length) {
      res.status(400).json({ success: false, error: 'No fields to update' });
      return;
    }

    const result = await query(
      `UPDATE revenue_records SET ${updates.join(', ')} WHERE id = $${p} RETURNING *`,
      [...params, req.params.id]
    );

    if (result.rowCount === 0) {
      res.status(404).json({ success: false, error: 'Revenue record not found' });
      return;
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to update revenue record' });
  }
});

// ─── GET /revenue/dashboard (admin) ──────────────────────────────
router.get('/dashboard', requireAuth, requireRole('sub_admin', 'super_admin'), async (_req: AuthRequest, res: Response) => {
  try {
    const [overview, byStream, monthly, recent] = await Promise.all([
      query(
        `SELECT
          COALESCE(SUM(amount) FILTER (WHERE created_at > NOW() - INTERVAL '30 days' AND status = 'paid'), 0) as last_30_days,
          COALESCE(SUM(amount) FILTER (WHERE created_at > NOW() - INTERVAL '7 days' AND status = 'paid'), 0) as last_7_days,
          COALESCE(SUM(amount) FILTER (WHERE status = 'paid'), 0) as all_time,
          COALESCE(SUM(amount) FILTER (WHERE status = 'pending'), 0) as pending
         FROM revenue_records`
      ),
      query(
        `SELECT source_type as stream,
          COALESCE(SUM(amount), 0) as total,
          COUNT(*) as records,
          ROUND(COALESCE(SUM(amount), 0) * 100.0 / NULLIF((SELECT SUM(amount) FROM revenue_records WHERE status = 'paid'), 0), 1) as pct
         FROM revenue_records WHERE status = 'paid'
         GROUP BY source_type ORDER BY total DESC`
      ),
      query(
        `SELECT DATE_TRUNC('month', created_at) as month, COALESCE(SUM(amount), 0) as revenue
         FROM revenue_records WHERE status = 'paid'
         GROUP BY DATE_TRUNC('month', created_at) ORDER BY month DESC LIMIT 6`
      ),
      query(`SELECT id, source_type, customer_name, amount, status, created_at FROM revenue_records ORDER BY created_at DESC LIMIT 5`),
    ]);

    const o = overview.rows[0];
    const monthlyAvg = monthly.rows.length > 0
      ? monthly.rows.reduce((acc: number, r: any) => acc + parseFloat(r.revenue), 0) / monthly.rows.length
      : 0;

    res.json({
      success: true,
      data: {
        revenue: {
          last_7_days: parseFloat(o.last_7_days),
          last_30_days: parseFloat(o.last_30_days),
          all_time: parseFloat(o.all_time),
          pending: parseFloat(o.pending),
        },
        streams: byStream.rows.map((r: any) => ({
          stream: r.stream,
          total: parseFloat(r.total),
          records: parseInt(r.records),
          percentage: parseFloat(r.pct) || 0,
        })),
        monthly_trend: monthly.rows,
        recent_records: recent.rows,
        projected_monthly: Math.round(monthlyAvg * 100) / 100,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch revenue dashboard' });
  }
});

export { router as revenueRouter };
