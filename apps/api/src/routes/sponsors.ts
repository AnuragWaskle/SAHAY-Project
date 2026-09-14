import { Router, Response } from 'express';
import { requireAuth, optionalAuth, AuthRequest, requireRole } from '../middleware/auth';
import { query } from '../db/pool';

const router = Router();

// ─── GET /sponsors ───────────────────────────────────────────────
router.get('/', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const isAdmin = req.user && ['sub_admin', 'super_admin'].includes(req.user.role || '');
    const condition = isAdmin ? '' : `WHERE verification_status = 'verified'`;

    const result = await query(
      `SELECT id, name, company_type, sector, logo_url, description, focus_areas, verification_status, created_at
       FROM sponsor_profiles ${condition} ORDER BY name ASC`
    );
    res.json({ success: true, data: result.rows });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch sponsors' });
  }
});

// ─── GET /sponsors/me ────────────────────────────────────────────
router.get('/me', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      `SELECT * FROM sponsor_profiles WHERE created_by = $1`,
      [req.user!.id]
    );
    if (result.rowCount === 0) {
      res.status(404).json({ success: false, error: 'Sponsor profile not found for this user' });
      return;
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch your sponsor profile' });
  }
});

// ─── GET /sponsors/:id ───────────────────────────────────────────
router.get('/:id', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const [sponsorRes, campaignsRes] = await Promise.all([
      query(`SELECT * FROM sponsor_profiles WHERE id = $1`, [req.params.id]),
      query(
        `SELECT id, title, category, status, budget, actual_participants, start_date, end_date
         FROM sponsored_campaigns WHERE sponsor_id = $1 ORDER BY created_at DESC LIMIT 10`,
        [req.params.id]
      ),
    ]);

    if (sponsorRes.rowCount === 0) {
      res.status(404).json({ success: false, error: 'Sponsor not found' });
      return;
    }

    const sponsor = sponsorRes.rows[0];
    sponsor.campaigns = campaignsRes.rows;
    res.json({ success: true, data: sponsor });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch sponsor' });
  }
});

// ─── POST /sponsors ──────────────────────────────────────────────
router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { name, legal_name, company_type, sector, cin_number, contact_name, contact_email, contact_phone, website, logo_url, description, csr_budget_annual, focus_areas, operating_cities } = req.body;

    if (!name || !contact_name || !contact_email) {
      res.status(400).json({ success: false, error: 'name, contact_name, contact_email are required' });
      return;
    }

    const result = await query(
      `INSERT INTO sponsor_profiles (name, legal_name, company_type, sector, cin_number, contact_name, contact_email, contact_phone, website, logo_url, description, csr_budget_annual, focus_areas, operating_cities, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) RETURNING *`,
      [name, legal_name || null, company_type || null, sector || null, cin_number || null, contact_name, contact_email, contact_phone || null, website || null, logo_url || null, description || null, csr_budget_annual || null, focus_areas || null, operating_cities || null, req.user!.id]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to register sponsor' });
  }
});

// ─── PATCH /sponsors/:id ─────────────────────────────────────────
router.patch('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { name, legal_name, company_type, sector, contact_name, contact_email, contact_phone, website, logo_url, description, csr_budget_annual, focus_areas } = req.body;
    const updates: string[] = [];
    const params: unknown[] = [];
    let p = 1;

    if (name !== undefined) { updates.push(`name = $${p++}`); params.push(name); }
    if (legal_name !== undefined) { updates.push(`legal_name = $${p++}`); params.push(legal_name); }
    if (company_type !== undefined) { updates.push(`company_type = $${p++}`); params.push(company_type); }
    if (sector !== undefined) { updates.push(`sector = $${p++}`); params.push(sector); }
    if (contact_name !== undefined) { updates.push(`contact_name = $${p++}`); params.push(contact_name); }
    if (contact_email !== undefined) { updates.push(`contact_email = $${p++}`); params.push(contact_email); }
    if (contact_phone !== undefined) { updates.push(`contact_phone = $${p++}`); params.push(contact_phone); }
    if (website !== undefined) { updates.push(`website = $${p++}`); params.push(website); }
    if (logo_url !== undefined) { updates.push(`logo_url = $${p++}`); params.push(logo_url); }
    if (description !== undefined) { updates.push(`description = $${p++}`); params.push(description); }
    if (csr_budget_annual !== undefined) { updates.push(`csr_budget_annual = $${p++}`); params.push(csr_budget_annual); }
    if (focus_areas !== undefined) { updates.push(`focus_areas = $${p++}`); params.push(focus_areas); }

    if (!updates.length) { res.status(400).json({ success: false, error: 'No fields to update' }); return; }

    updates.push(`updated_at = NOW()`);
    const result = await query(
      `UPDATE sponsor_profiles SET ${updates.join(', ')} WHERE id = $${p} RETURNING *`,
      [...params, req.params.id]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to update sponsor' });
  }
});

// ─── PATCH /sponsors/:id/verify (admin) ──────────────────────────
router.patch('/:id/verify', requireAuth, requireRole('sub_admin', 'super_admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { verification_status } = req.body;
    if (!['verified', 'suspended', 'pending'].includes(verification_status)) {
      res.status(400).json({ success: false, error: 'Invalid status' });
      return;
    }

    const result = await query(
      `UPDATE sponsor_profiles SET verification_status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [verification_status, req.params.id]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to verify sponsor' });
  }
});

// ─── GET /sponsors/:id/impact ────────────────────────────────────
router.get('/:id/impact', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const [campaigns, contributions, participants] = await Promise.all([
      query(
        `SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status = 'completed') as completed,
          COALESCE(SUM(budget), 0) as total_budget, COALESCE(SUM(actual_participants), 0) as total_participants
         FROM sponsored_campaigns WHERE sponsor_id = $1`,
        [req.params.id]
      ),
      query(
        `SELECT COUNT(*) as total, COALESCE(SUM(amount), 0) as total_amount,
          COUNT(*) FILTER (WHERE status = 'successful') as successful
         FROM csr_contributions WHERE sponsor_id = $1`,
        [req.params.id]
      ),
      query(
        `SELECT COUNT(DISTINCT cp.user_id) as unique_citizens,
          COALESCE(SUM(cp.credits_earned), 0) as total_credits
         FROM campaign_participants cp
         JOIN sponsored_campaigns sc ON cp.campaign_id = sc.id
         WHERE sc.sponsor_id = $1 AND cp.status = 'rewarded'`,
        [req.params.id]
      ),
    ]);

    res.json({
      success: true,
      data: {
        campaigns_total: parseInt(campaigns.rows[0].total),
        campaigns_completed: parseInt(campaigns.rows[0].completed),
        total_budget: parseFloat(campaigns.rows[0].total_budget),
        total_participants: parseInt(campaigns.rows[0].total_participants),
        contributions_total: parseInt(contributions.rows[0].total),
        contributions_amount: parseFloat(contributions.rows[0].total_amount),
        unique_citizens_impacted: parseInt(participants.rows[0].unique_citizens),
        total_credits_distributed: parseInt(participants.rows[0].total_credits),
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch impact' });
  }
});

// ─── POST /sponsors/:id/contribute ───────────────────────────────
router.post('/:id/contribute', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { campaign_id, initiative_id, amount, payment_method, transaction_ref, notes } = req.body;
    if (!amount || amount <= 0) {
      res.status(400).json({ success: false, error: 'Valid amount is required' });
      return;
    }

    const result = await query(
      `INSERT INTO csr_contributions (sponsor_id, campaign_id, initiative_id, amount, payment_method, transaction_ref, notes, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending') RETURNING *`,
      [req.params.id, campaign_id || null, initiative_id || null, amount, payment_method || null, transaction_ref || null, notes || null]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to create contribution' });
  }
});

export { router as sponsorsRouter };
