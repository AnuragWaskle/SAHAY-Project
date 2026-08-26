import { Router, Response } from 'express';
import { requireAuth, optionalAuth, AuthRequest } from '../middleware/auth';
import { query, transaction } from '../db/pool';

const router = Router();

// ─── GET /missions ────────────────────────────────────────────
router.get('/', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { city_id, ward_id, status } = req.query as Record<string, string>;
    const params: unknown[] = [];
    const conditions: string[] = [];
    let p = 1;

    if (city_id) {
      conditions.push(`m.city_id = $${p++}`);
      params.push(city_id);
    }
    if (ward_id) {
      conditions.push(`m.ward_id = $${p++}`);
      params.push(ward_id);
    }
    if (status) {
      conditions.push(`m.status = $${p++}`);
      params.push(status);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const userId = req.user?.id || null;

    const result = await query(
      `SELECT m.*,
        w.name as ward_name,
        c.name as city_name,
        (CASE WHEN $1::uuid IS NOT NULL THEN EXISTS (
          SELECT 1 FROM mission_participants WHERE mission_id = m.id AND user_id = $1
        ) ELSE FALSE END) as is_participant
       FROM missions m
       LEFT JOIN wards w ON m.ward_id = w.id
       LEFT JOIN cities c ON m.city_id = c.id
       ${where}
       ORDER BY m.status = 'active' DESC, m.created_at DESC`,
      [userId, ...params]
    );

    res.json({ success: true, data: result.rows });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch missions' });
  }
});

// ─── GET /missions/:id ─────────────────────────────────────────
router.get('/:id', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id || null;
    const missionRes = await query(
      `SELECT m.*,
        w.name as ward_name,
        c.name as city_name,
        (CASE WHEN $2::uuid IS NOT NULL THEN EXISTS (
          SELECT 1 FROM mission_participants WHERE mission_id = m.id AND user_id = $2
        ) ELSE FALSE END) as is_participant
       FROM missions m
       LEFT JOIN wards w ON m.ward_id = w.id
       LEFT JOIN cities c ON m.city_id = c.id
       WHERE m.id = $1`,
      [req.params.id, userId]
    );

    if (missionRes.rowCount === 0) {
      res.status(404).json({ success: false, error: 'Mission not found' });
      return;
    }

    const participantsRes = await query(
      `SELECT mp.joined_at, mp.contribution_summary, u.id as user_id, u.name, u.avatar_url, u.civic_impact_score
       FROM mission_participants mp
       JOIN users u ON mp.user_id = u.id
       WHERE mp.mission_id = $1
       ORDER BY mp.joined_at DESC
       LIMIT 50`,
      [req.params.id]
    );

    res.json({
      success: true,
      data: {
        ...missionRes.rows[0],
        participants: participantsRes.rows
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch mission' });
  }
});

// ─── POST /missions ───────────────────────────────────────────
router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { title, description, category, goal_metric, target, city_id, ward_id, start_at, end_at } = req.body;
    if (!title || !description || !category || !target || !city_id) {
      res.status(400).json({ success: false, error: 'Title, description, category, target, and city_id are required' });
      return;
    }

    // Checking civic leader/NGO authorization to submit/create
    const userRole = req.user!.role;
    const isAuth = ['super_admin', 'sub_admin', 'civic_leader', 'ngo'].includes(userRole);
    if (!isAuth) {
      res.status(403).json({ success: false, error: 'Only Civic Leaders, NGOs, or Admins can create missions.' });
      return;
    }

    // Super Admin auto-approves, others propose
    const status = ['super_admin', 'sub_admin'].includes(userRole) ? 'active' : 'proposed';

    const result = await query(
      `INSERT INTO missions (title, description, category, goal_metric, target, city_id, ward_id, start_at, end_at, status, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        title,
        description,
        category,
        goal_metric,
        parseInt(target),
        city_id,
        ward_id || null,
        start_at ? new Date(start_at) : null,
        end_at ? new Date(end_at) : null,
        status,
        req.user!.id
      ]
    );

    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: status === 'active' ? 'Mission created and active!' : 'Mission proposed successfully and pending review.'
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to create mission' });
  }
});

// ─── POST /missions/:id/join ──────────────────────────────────
router.post('/:id/join', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const missionId = req.params.id;
    const userId = req.user!.id;

    await transaction(async (q) => {
      // Check if mission exists and is active
      const missionCheck = await q('SELECT status FROM missions WHERE id = $1', [missionId]);
      if (missionCheck.rowCount === 0) {
        throw new Error('Mission not found');
      }
      if (missionCheck.rows[0].status !== 'active') {
        throw new Error('Mission is not active');
      }

      // Check if already joined
      const joinedCheck = await q('SELECT 1 FROM mission_participants WHERE mission_id = $1 AND user_id = $2', [missionId, userId]);
      if (joinedCheck.rowCount > 0) {
        return; // Already joined
      }

      await q(
        `INSERT INTO mission_participants (mission_id, user_id, contribution_summary)
         VALUES ($1, $2, '{"contribution_count": 0}'::jsonb)`,
        [missionId, userId]
      );
      await q('UPDATE missions SET participant_count = participant_count + 1 WHERE id = $1', [missionId]);
    });

    res.json({ success: true, message: 'Joined mission! Let us make a difference.' });
  } catch (err: any) {
    const statusCode = ['Mission not found', 'Mission is not active'].includes(err.message) ? 400 : 500;
    res.status(statusCode).json({ success: false, error: err.message || 'Failed to join mission' });
  }
});

// ─── POST /missions/:id/progress ──────────────────────────────
router.post('/:id/progress', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const missionId = req.params.id;
    const userId = req.user!.id;
    const { amount = 1 } = req.body;

    const result = await transaction(async (q) => {
      const missionCheck = await q('SELECT * FROM missions WHERE id = $1', [missionId]);
      if (missionCheck.rowCount === 0) {
        throw new Error('Mission not found');
      }

      const mission = missionCheck.rows[0];
      if (mission.status !== 'active') {
        throw new Error('Mission is not active');
      }

      // Check if user is participant
      const checkPart = await q('SELECT * FROM mission_participants WHERE mission_id = $1 AND user_id = $2', [missionId, userId]);
      if (checkPart.rowCount === 0) {
        throw new Error('You must join the mission first before reporting progress');
      }

      // Update total mission progress
      const newProgress = Math.min(mission.target, mission.current_progress + parseInt(amount));
      const status = newProgress >= mission.target ? 'completed' : 'active';

      await q(
        `UPDATE missions SET current_progress = $1, status = $2, updated_at = NOW() WHERE id = $3`,
        [newProgress, status, missionId]
      );

      // Update participant contributions count
      const currentCount = checkPart.rows[0].contribution_summary?.contribution_count || 0;
      await q(
        `UPDATE mission_participants
         SET contribution_summary = jsonb_set(
           COALESCE(contribution_summary, '{}'::jsonb), 
           '{contribution_count}', 
           $1::jsonb
         )
         WHERE mission_id = $2 AND user_id = $3`,
        [JSON.stringify(currentCount + parseInt(amount)), missionId, userId]
      );

      // Reward points
      await q(
        `UPDATE users SET civic_impact_score = civic_impact_score + $1, 
          level = CASE 
            WHEN civic_impact_score + $1 >= 5000 THEN 5
            WHEN civic_impact_score + $1 >= 2000 THEN 4
            WHEN civic_impact_score + $1 >= 500 THEN 3
            WHEN civic_impact_score + $1 >= 100 THEN 2
            ELSE 1 
          END,
          updated_at = NOW()
         WHERE id = $2`,
        [10 * parseInt(amount), userId]
      );

      return { newProgress, status };
    });

    res.json({
      success: true,
      data: result,
      message: result.status === 'completed' 
        ? 'Congratulations! The civic mission has been successfully completed!' 
        : 'Progress recorded! Keep up the good work.'
    });
  } catch (err: any) {
    const statusCode = ['Mission not found', 'Mission is not active', 'You must join the mission first before reporting progress'].includes(err.message) ? 400 : 500;
    res.status(statusCode).json({ success: false, error: err.message || 'Failed to update mission progress' });
  }
});

export const missionsRouter = router;
