import { Router, Response } from 'express';
import { requireAuth, AuthRequest, requireRole, logAudit } from '../middleware/auth';
import { query } from '../db/pool';
import { createNotification } from './notifications';

const router = Router();

// All admin routes require auth
router.use(requireAuth);

// ─── GET /admin/verification-queue ───────────────────────────

router.get('/verification-queue', requireRole('sub_admin', 'super_admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { status = 'pending', page = '1', limit = '20' } = req.query as Record<string, string>;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const result = await query(
      `SELECT vr.*, u.name as applicant_name, u.email, u.phone, u.city_id,
        c.name as city_name
       FROM verification_requests vr
       JOIN users u ON vr.user_id = u.id
       LEFT JOIN cities c ON u.city_id = c.id
       WHERE vr.status = $1
       ORDER BY vr.created_at ASC
       LIMIT $2 OFFSET $3`,
      [status, parseInt(limit), offset]
    );

    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch verification queue' });
  }
});

// ─── POST /admin/verification-queue/:id/approve ───────────────

router.post('/verification-queue/:id/approve', requireRole('sub_admin', 'super_admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { review_notes } = req.body;

    const vrRes = await query('SELECT * FROM verification_requests WHERE id = $1', [req.params.id]);
    const vr = vrRes.rows[0];
    if (!vr) { res.status(404).json({ success: false, error: 'Request not found' }); return; }

    // Determine badge type for the role
    const roleBadgeMap: Record<string, string> = {
      municipal_officer: 'blue_tick', elected_representative: 'blue_tick',
      police: 'blue_tick', political_party: 'blue_tick',
      ngo: 'green_tick', company_csr: 'green_tick', society_rwa: 'green_tick',
      journalist: 'press_badge', verified_citizen: 'grey_check',
    };
    const badge = roleBadgeMap[vr.role_applied] || 'none';

    await query(
      `UPDATE verification_requests SET status = 'approved', reviewed_by = $1, review_notes = $2, reviewed_at = NOW() WHERE id = $3`,
      [req.user!.id, review_notes || null, req.params.id]
    );
    await query(
      `UPDATE users SET role = $1, verification_status = 'verified', badge_type = $2, updated_at = NOW() WHERE id = $3`,
      [vr.role_applied, badge, vr.user_id]
    );

    await logAudit(req.user!.id, 'verification_approved', 'verification_request', req.params.id as string, { role: vr.role_applied });
    await createNotification(vr.user_id, 'verification_approved', 'Verification Approved!',
      `Your role application for ${vr.role_applied} has been approved. Welcome to CivicPulse!`,
      { role: vr.role_applied });
    res.json({ success: true, message: 'Verification approved' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to approve verification' });
  }
});

// ─── POST /admin/verification-queue/:id/reject ────────────────

router.post('/verification-queue/:id/reject', requireRole('sub_admin', 'super_admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { reason } = req.body;
    if (!reason) { res.status(400).json({ success: false, error: 'Rejection reason required' }); return; }

    const vrRes = await query('SELECT * FROM verification_requests WHERE id = $1', [req.params.id]);
    const vr = vrRes.rows[0];
    if (!vr) { res.status(404).json({ success: false, error: 'Request not found' }); return; }

    await query(
      `UPDATE verification_requests SET status = 'rejected', reviewed_by = $1, review_notes = $2, reviewed_at = NOW() WHERE id = $3`,
      [req.user!.id, reason, req.params.id]
    );
    await query(`UPDATE users SET verification_status = 'rejected' WHERE id = $1`, [vr.user_id]);

    await logAudit(req.user!.id, 'verification_rejected', 'verification_request', req.params.id as string, { reason });
    await createNotification(vr.user_id, 'verification_rejected', 'Verification Update',
      `Your role application for ${vr.role_applied} was not approved. Reason: ${reason}`,
      { role: vr.role_applied, reason });
    res.json({ success: true, message: 'Verification rejected' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to reject verification' });
  }
});

// ─── GET /admin/moderation-queue ─────────────────────────────

router.get('/moderation-queue', requireRole('sub_admin', 'super_admin'), async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      `SELECT mf.*, u.name as flagged_by_name
       FROM moderation_flags mf
       JOIN users u ON mf.flagged_by = u.id
       WHERE mf.status = 'pending'
       ORDER BY mf.created_at ASC
       LIMIT 50`
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch moderation queue' });
  }
});

// ─── GET /admin/audit-logs ────────────────────────────────────

router.get('/audit-logs', requireRole('sub_admin', 'super_admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { target_type, page = '1', limit = '50' } = req.query as Record<string, string>;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const params: unknown[] = [];
    let p = 1;
    const where = target_type ? `WHERE al.target_type = $${p++}` : '';
    if (target_type) params.push(target_type);

    const result = await query(
      `SELECT al.*, u.name as actor_name, u.role as actor_role
       FROM audit_logs al
       LEFT JOIN users u ON al.actor_id = u.id
       ${where}
       ORDER BY al.created_at DESC
       LIMIT $${p++} OFFSET $${p++}`,
      [...params, parseInt(limit), offset]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch audit logs' });
  }
});

// ─── GET /admin/integrity-reports (super_admin only) ──────────

router.get('/integrity-reports', requireRole('super_admin'), async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      `SELECT ir.*, u.name as reporter_name FROM integrity_reports ir
       LEFT JOIN users u ON ir.reporter_user_id = u.id
       WHERE ir.restricted = TRUE ORDER BY ir.created_at DESC LIMIT 50`
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch integrity reports' });
  }
});

// ─── GET /admin/platform-stats ───────────────────────────────

router.get('/platform-stats', requireRole('sub_admin', 'super_admin'), async (req: AuthRequest, res: Response) => {
  try {
    const [cities, users, incidents, reports] = await Promise.all([
      query('SELECT COUNT(*) FROM cities'),
      query('SELECT role, COUNT(*) FROM users GROUP BY role ORDER BY COUNT(*) DESC'),
      query("SELECT status, COUNT(*) FROM civic_incidents GROUP BY status"),
      query("SELECT COUNT(*) FROM reports WHERE created_at > NOW() - INTERVAL '24 hours'"),
    ]);
    res.json({ success: true, data: { cities: cities.rows[0]?.count, users_by_role: users.rows, incidents_by_status: incidents.rows, reports_last_24h: reports.rows[0]?.count } });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch platform stats' });
  }
});

// ─── POST /admin/organizations/:id/verify ────────────────────

router.post('/organizations/:id/verify', requireRole('sub_admin', 'super_admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { action, notes } = req.body; // action: 'approve' | 'reject' | 'suspend'
    if (!['approve', 'reject', 'suspend'].includes(action)) {
      res.status(400).json({ success: false, error: 'Action must be approve, reject, or suspend' });
      return;
    }

    const statusMap: Record<string, string> = { approve: 'verified', reject: 'rejected', suspend: 'suspended' };
    const newStatus = statusMap[action];

    const orgRes = await query('SELECT * FROM organizations WHERE id = $1', [req.params.id]);
    if (!orgRes.rows[0]) { res.status(404).json({ success: false, error: 'Organization not found' }); return; }

    await query('UPDATE organizations SET verification_status = $1 WHERE id = $2', [newStatus, req.params.id]);

    // If approving, update the owner's role and badge
    if (action === 'approve' && orgRes.rows[0].owner_user_id) {
      const roleMap: Record<string, string> = { ngo: 'ngo', company: 'company_csr', society: 'society_rwa' };
      const role = roleMap[orgRes.rows[0].type] || 'citizen';
      await query(
        `UPDATE users SET role = $1, verification_status = 'verified', badge_type = 'green_tick' WHERE id = $2`,
        [role, orgRes.rows[0].owner_user_id]
      );
    }

    await logAudit(req.user!.id, `organization_${action}`, 'organization', req.params.id as string, { notes });
    res.json({ success: true, message: `Organization ${action}d` });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to update organization' });
  }
});

// ─── POST /admin/moderation-queue/:id/action ────────────────────

router.post('/moderation-queue/:id/action', requireRole('sub_admin', 'super_admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { action, notes } = req.body; // action: 'dismiss' | 'action_taken'
    if (!['dismiss', 'action_taken'].includes(action)) {
      res.status(400).json({ success: false, error: 'Action must be dismiss or action_taken' });
      return;
    }

    const status = action === 'dismiss' ? 'dismissed' : 'actioned';
    await query(
      'UPDATE moderation_flags SET status = $1, reviewed_by = $2, notes = $3, reviewed_at = NOW() WHERE id = $4',
      [status, req.user!.id, notes || null, req.params.id]
    );

    await logAudit(req.user!.id, `moderation_${action}`, 'moderation_flag', req.params.id as string, { notes });
    res.json({ success: true, message: `Flag ${status}` });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to process moderation action' });
  }
});

// ─── PATCH /admin/users/:id (suspend/restore/change role) ────────

router.patch('/users/:id', requireRole('super_admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { action, role } = req.body;

    if (action === 'suspend') {
      await query(`UPDATE users SET verification_status = 'suspended' WHERE id = $1`, [req.params.id]);
    } else if (action === 'restore') {
      await query(`UPDATE users SET verification_status = 'verified' WHERE id = $1`, [req.params.id]);
    } else if (action === 'change_role' && role) {
      await query(`UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2`, [role, req.params.id]);
    } else {
      res.status(400).json({ success: false, error: 'Invalid action' });
      return;
    }

    await logAudit(req.user!.id, `user_${action}`, 'user', req.params.id as string, { role });
    res.json({ success: true, message: `User ${action} successful` });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to update user' });
  }
});

export { router as adminRouter };
