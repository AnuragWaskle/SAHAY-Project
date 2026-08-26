import { Router, Response } from 'express';
import { requireAuth, AuthRequest, requireRole } from '../middleware/auth';
import { query } from '../db/pool';
const router = Router();

router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  const { demand_id, department_id } = req.query as Record<string, string>;
  const conditions = demand_id ? ['wo.demand_id = $1'] : department_id ? ['wo.department_id = $1'] : [];
  const params = demand_id ? [demand_id] : department_id ? [department_id] : [];
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const result = await query(`SELECT wo.*, cd.title as demand_title FROM work_orders wo LEFT JOIN civic_demands cd ON wo.demand_id = cd.id ${where} ORDER BY wo.created_at DESC`, params);
  res.json({ success: true, data: result.rows });
});

router.get('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  const result = await query('SELECT wo.*, cd.title as demand_title FROM work_orders wo LEFT JOIN civic_demands cd ON wo.demand_id = cd.id WHERE wo.id = $1', [req.params.id]);
  if (!result.rows[0]) { res.status(404).json({ success: false, error: 'Work order not found' }); return; }
  res.json({ success: true, data: result.rows[0] });
});

router.post('/', requireAuth, requireRole('municipal_officer', 'sub_admin', 'super_admin'), async (req: AuthRequest, res: Response) => {
  const { demand_id, department_id, notes, evidence_before = [] } = req.body;
  const result = await query(
    'INSERT INTO work_orders (demand_id, department_id, notes, evidence_before) VALUES ($1, $2, $3, $4) RETURNING *',
    [demand_id, department_id, notes, JSON.stringify(evidence_before)]
  );
  await query("UPDATE civic_demands SET stage = 'work_planned', updated_at = NOW() WHERE id = $1", [demand_id]);
  res.status(201).json({ success: true, data: result.rows[0] });
});

router.patch('/:id', requireAuth, requireRole('municipal_officer', 'sub_admin', 'super_admin'), async (req: AuthRequest, res: Response) => {
  const { status, evidence_after, notes } = req.body;
  const result = await query(
    'UPDATE work_orders SET status = COALESCE($1, status), evidence_after = COALESCE($2, evidence_after), notes = COALESCE($3, notes), completed_at = CASE WHEN $1 = $4 THEN NOW() ELSE completed_at END WHERE id = $5 RETURNING *',
    [status, evidence_after ? JSON.stringify(evidence_after) : null, notes, 'completed', req.params.id]
  );
  res.json({ success: true, data: result.rows[0] });
});

export { router as workOrdersRouter };
