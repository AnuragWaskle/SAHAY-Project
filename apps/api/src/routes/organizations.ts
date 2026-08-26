import { Router, Response } from 'express';
import { requireAuth, optionalAuth, AuthRequest } from '../middleware/auth';
import { query } from '../db/pool';

const router = Router();

router.get('/', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { type, verified_only = 'true', ward_id, search, page = '1', limit = '20' } = req.query as Record<string, string>;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const conditions: string[] = [];
    const params: unknown[] = [];
    let p = 1;

    if (type) { conditions.push(`o.type = $${p++}`); params.push(type); }
    if (verified_only === 'true') { conditions.push(`o.verification_status = $${p++}`); params.push('verified'); }
    if (search) { conditions.push(`o.name ILIKE $${p++}`); params.push(`%${search}%`); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await query(
      `SELECT o.*, 
        (SELECT COUNT(*) FROM initiatives WHERE organization_id = o.id) as initiative_count
       FROM organizations o
       ${where}
       ORDER BY o.name
       LIMIT $${p++} OFFSET $${p++}`,
      [...params, parseInt(limit), offset]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch organizations' });
  }
});

router.get('/:id', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const [orgRes, initRes] = await Promise.all([
      query('SELECT * FROM organizations WHERE id = $1', [req.params.id]),
      query('SELECT i.*, ci.title as incident_title FROM initiatives i LEFT JOIN civic_incidents ci ON i.incident_id = ci.id WHERE i.organization_id = $1 AND i.status = $2', [req.params.id, 'active']),
    ]);
    if (!orgRes.rows[0]) { res.status(404).json({ success: false, error: 'Organization not found' }); return; }
    res.json({ success: true, data: { ...orgRes.rows[0], active_initiatives: initRes.rows } });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch organization' });
  }
});

router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { type, name, registration_number, contact, description, focus_areas = [], operating_wards = [] } = req.body;
    const result = await query(
      'INSERT INTO organizations (type, name, registration_number, contact, description, focus_areas, operating_wards, owner_user_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
      [type, name, registration_number, JSON.stringify(contact || {}), description, JSON.stringify(focus_areas), JSON.stringify(operating_wards), req.user!.id]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to create organization' });
  }
});

export { router as organizationsRouter };
