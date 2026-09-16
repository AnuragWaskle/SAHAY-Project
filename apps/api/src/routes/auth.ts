import { Router, Response, Request } from 'express';
import { requireAuth, AuthRequest, logAudit } from '../middleware/auth';
import { query } from '../db/pool';
import { z } from 'zod';
import twilio from 'twilio';
import { rateLimit } from 'express-rate-limit';
import { logger } from '../utils/logger';

const router = Router();

// ─── Twilio Verify Client ─────────────────────────────────────
// Credentials come from env vars set in Render dashboard.
// Falls back to null if not configured — OTP routes return a
// clear error message instead of crashing.
function getTwilioClient() {
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN } = process.env;
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) return null;
  return twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
}

// Rate limit: max 3 OTP send requests per phone per 10 minutes
const otpSendLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 3,
  keyGenerator: (req) => req.body?.phone || req.ip || 'unknown',
  message: { success: false, error: 'Too many OTP requests. Please wait 10 minutes before trying again.' },
});

// Rate limit: max 5 verify attempts per 10 minutes
const otpVerifyLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  keyGenerator: (req) => req.body?.phone || req.ip || 'unknown',
  message: { success: false, error: 'Too many verification attempts. Please wait before trying again.' },
});


// ─── POST /auth/verify-token ──────────────────────────────────
// Called by client after Firebase auth to create/fetch the user in PostgreSQL

router.post('/verify-token', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { name, phone, email, language_pref, city_id } = req.body;
    const user = req.user!;

    // Update profile data if provided
    if (name || phone || email || language_pref || city_id) {
      const updates: string[] = [];
      const params: unknown[] = [];
      let p = 1;

      if (name) { updates.push(`name = $${p++}`); params.push(name); }
      if (phone) { updates.push(`phone = $${p++}`); params.push(phone); }
      if (email) { updates.push(`email = $${p++}`); params.push(email); }
      if (language_pref) { updates.push(`language_pref = $${p++}`); params.push(language_pref); }
      if (city_id) { updates.push(`city_id = $${p++}`); params.push(city_id); }

      await query(
        `UPDATE users SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${p}`,
        [...params, user.id]
      );
    }

    const result = await query(
      `SELECT u.*, 
        c.name as city_name,
        w.name as ward_name,
        (SELECT COUNT(*) FROM reports WHERE user_id = u.id) as report_count,
        (SELECT COUNT(*) FROM demand_supporters WHERE user_id = u.id) as demands_supported,
        (SELECT json_agg(json_build_object('code', b.code, 'name', b.name, 'icon', b.icon, 'earned_at', ub.earned_at))
         FROM user_badges ub JOIN badges b ON ub.badge_id = b.id WHERE ub.user_id = u.id) as badges
       FROM users u
       LEFT JOIN cities c ON u.city_id = c.id
       LEFT JOIN wards w ON u.jurisdiction_id = w.id
       WHERE u.id = $1`,
      [user.id]
    );

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to verify token' });
  }
});

// ─── GET /auth/me ─────────────────────────────────────────────

router.get('/me', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      `SELECT u.*,
        c.name as city_name,
        (SELECT COUNT(*) FROM reports WHERE user_id = u.id) as report_count,
        (SELECT COUNT(*) FROM demand_supporters WHERE user_id = u.id) as demands_supported,
        (SELECT COUNT(*) FROM resolution_verifications WHERE user_id = u.id) as verifications_done,
        (SELECT json_agg(json_build_object('code', b.code, 'name', b.name, 'icon', b.icon, 'earned_at', ub.earned_at))
         FROM user_badges ub JOIN badges b ON ub.badge_id = b.id WHERE ub.user_id = u.id) as badges
       FROM users u
       LEFT JOIN cities c ON u.city_id = c.id
       WHERE u.id = $1`,
      [req.user!.id]
    );

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch user' });
  }
});

// ─── PATCH /auth/me ───────────────────────────────────────────

router.patch('/me', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { name, bio, avatar_url, language_pref, privacy_level, notification_pref, city_id } = req.body;
    const updates: string[] = [];
    const params: unknown[] = [];
    let p = 1;

    if (name) { updates.push(`name = $${p++}`); params.push(name); }
    if (bio !== undefined) { updates.push(`bio = $${p++}`); params.push(bio); }
    if (avatar_url) { updates.push(`avatar_url = $${p++}`); params.push(avatar_url); }
    if (language_pref) { updates.push(`language_pref = $${p++}`); params.push(language_pref); }
    if (privacy_level) { updates.push(`privacy_level = $${p++}`); params.push(privacy_level); }
    if (notification_pref) { updates.push(`notification_pref = $${p++}`); params.push(notification_pref); }
    if (city_id) { updates.push(`city_id = $${p++}`); params.push(city_id); }

    if (!updates.length) {
      res.status(400).json({ success: false, error: 'No updates provided' });
      return;
    }

    const result = await query(
      `UPDATE users SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${p} RETURNING *`,
      [...params, req.user!.id]
    );

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to update profile' });
  }
});

// ─── POST /auth/request-verification ─────────────────────────

router.post('/request-verification', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { role_applied, documents } = req.body;

    if (!role_applied || !documents?.length) {
      res.status(400).json({ success: false, error: 'role_applied and documents required' });
      return;
    }

    const result = await query(
      `INSERT INTO verification_requests (user_id, role_applied, documents)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [req.user!.id, role_applied, JSON.stringify(documents)]
    );

    // Update user status to pending
    await query(
      `UPDATE users SET verification_status = 'pending' WHERE id = $1`,
      [req.user!.id]
    );

    await logAudit(req.user!.id, 'verification_requested', 'verification_request', result.rows[0].id, { role_applied });

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to submit verification request' });
  }
});

// ─── GET /auth/verified-directory ─────────────────────────────

router.get('/verified-directory', async (req, res) => {
  try {
    const { role, city_id, search, page = '1', limit = '20' } = req.query as Record<string, string>;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const conditions = [`u.verification_status = 'verified' AND u.badge_type != 'none'`];
    const params: unknown[] = [];
    let p = 1;

    if (role) { conditions.push(`u.role = $${p++}`); params.push(role); }
    if (city_id) { conditions.push(`u.city_id = $${p++}`); params.push(city_id); }
    if (search) {
      conditions.push(`u.name ILIKE $${p++}`);
      params.push(`%${search}%`);
    }

    const result = await query(
      `SELECT u.id, u.name, u.role, u.badge_type, u.bio, u.avatar_url, u.civic_impact_score,
        c.name as city_name
       FROM users u
       LEFT JOIN cities c ON u.city_id = c.id
       WHERE ${conditions.join(' AND ')}
       ORDER BY u.civic_impact_score DESC
       LIMIT $${p++} OFFSET $${p++}`,
      [...params, parseInt(limit), offset]
    );

    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch directory' });
  }
});

// ─── POST /auth/send-otp ──────────────────────────────────────
// Sends a real OTP SMS to the given phone via Twilio Verify API.
// Phone must be a valid 10-digit Indian mobile number.
// Returns: { success: true, message: "OTP sent" }

router.post('/send-otp', otpSendLimiter, async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      phone: z.string().regex(/^\d{10}$/, 'Phone must be exactly 10 digits'),
    });

    const { phone } = schema.parse(req.body);
    const e164Phone = `+91${phone}`; // Format for Indian numbers

    const client = getTwilioClient();
    const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

    if (!client || !verifyServiceSid) {
      logger.warn('Twilio not configured — TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_VERIFY_SERVICE_SID required');
      res.status(503).json({
        success: false,
        error: 'OTP service not configured. Please contact support.',
      });
      return;
    }

    const verification = await client.verify.v2
      .services(verifyServiceSid)
      .verifications.create({ to: e164Phone, channel: 'sms' });

    logger.info(`OTP sent to ${e164Phone} — status: ${verification.status}`);

    res.json({
      success: true,
      message: `OTP sent to +91 ${phone}. Valid for 10 minutes.`,
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ success: false, error: err.issues[0]?.message || 'Invalid phone number' });
      return;
    }
    // Twilio-specific errors
    const twilioCode = err?.code;
    if (twilioCode === 60200) {
      res.status(400).json({ success: false, error: 'Invalid phone number format.' });
      return;
    }
    if (twilioCode === 60203) {
      res.status(429).json({ success: false, error: 'Max OTP send attempts reached. Please wait before retrying.' });
      return;
    }
    logger.error('send-otp error:', err);
    res.status(500).json({ success: false, error: 'Failed to send OTP. Please try again.' });
  }
});

// ─── POST /auth/verify-otp ─────────────────────────────────────
// Verifies the OTP code entered by the user via Twilio Verify API.
// On success: creates or fetches the user from PostgreSQL,
// returns user profile + a bearer token for subsequent API calls.
// Returns: { success: true, data: { user, token } }

router.post('/verify-otp', otpVerifyLimiter, async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      phone: z.string().regex(/^\d{10}$/, 'Phone must be exactly 10 digits'),
      code: z.string().regex(/^\d{4,6}$/, 'OTP must be 4-6 digits'),
      // Optional signup fields — only used when creating a new account
      name: z.string().optional(),
      email: z.string().email().optional().or(z.literal('')),
      role: z.enum(['citizen', 'ngo']).optional().default('citizen'),
    });

    const body = schema.parse(req.body);
    const e164Phone = `+91${body.phone}`;

    const client = getTwilioClient();
    const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

    if (!client || !verifyServiceSid) {
      res.status(503).json({ success: false, error: 'OTP service not configured.' });
      return;
    }

    // Verify the code against Twilio
    const check = await client.verify.v2
      .services(verifyServiceSid)
      .verificationChecks.create({ to: e164Phone, code: body.code });

    if (check.status !== 'approved') {
      res.status(400).json({ success: false, error: 'Invalid or expired OTP. Please try again.' });
      return;
    }

    // ── OTP approved — find or create the user in PostgreSQL ──
    // Use phone number as the unique identifier (firebase_uid = "phone:+91XXXXXXXXXX")
    const firebaseUid = `phone:${e164Phone}`;
    const defaultName = body.name?.trim() || `Citizen ${body.phone.slice(-4)}`;
    const defaultEmail = body.email?.trim() || `${body.phone}@sahay.org`;
    const defaultRole = body.role || 'citizen';

    const userResult = await query(
      `INSERT INTO users (firebase_uid, phone, name, email, role)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (firebase_uid) DO UPDATE
         SET phone = EXCLUDED.phone,
             updated_at = NOW()
       RETURNING id, firebase_uid, name, email, phone, role, city_id,
                 jurisdiction_id, badge_type, civic_impact_score, level,
                 avatar_url, bio, civic_credits`,
      [firebaseUid, body.phone, defaultName, defaultEmail, defaultRole]
    );

    const user = userResult.rows[0];

    // The bearer token the mobile app will use for all subsequent requests.
    // It's just the firebase_uid — the backend's requireAuth middleware
    // already accepts this format in dev mode and maps it to the user record.
    const token = firebaseUid;

    logger.info(`User authenticated via OTP: ${user.id} (${body.phone})`);

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          city_id: user.city_id,
          avatar_url: user.avatar_url,
          badge_type: user.badge_type,
          civic_impact_score: user.civic_impact_score,
          level: user.level,
          civic_credits: user.civic_credits,
        },
      },
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ success: false, error: err.issues[0]?.message || 'Invalid input' });
      return;
    }
    const twilioCode = err?.code;
    if (twilioCode === 60200 || twilioCode === 60202) {
      res.status(400).json({ success: false, error: 'Invalid OTP code. Please check and try again.' });
      return;
    }
    logger.error('verify-otp error:', err);
    res.status(500).json({ success: false, error: 'OTP verification failed. Please try again.' });
  }
});

// ─── POST /auth/twilio-status-webhook ─────────────────────────
// Twilio calls this URL when an SMS delivery status changes.
// Configure this in the Twilio Console under your Verify Service settings:
//   Status Callback URL: https://sahay-api-1bks.onrender.com/api/v1/auth/twilio-status-webhook
// Twilio signs every webhook request — we validate the signature for security.

router.post('/twilio-status-webhook', (req: Request, res: Response) => {
  try {
    const twilioSignature = req.headers['x-twilio-signature'] as string;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    // Validate Twilio's signature if auth token is configured
    if (authToken && twilioSignature) {
      const webhookUrl = `https://sahay-api-1bks.onrender.com/api/v1/auth/twilio-status-webhook`;
      const isValid = twilio.validateRequest(authToken, twilioSignature, webhookUrl, req.body);
      if (!isValid) {
        logger.warn('Twilio webhook: invalid signature — rejected');
        res.status(403).json({ success: false, error: 'Invalid signature' });
        return;
      }
    }

    const { To, MessageStatus, ErrorCode } = req.body;
    logger.info(`Twilio SMS status: ${To} → ${MessageStatus}${ErrorCode ? ` (error: ${ErrorCode})` : ''}`);

    // Respond with 200 + empty TwiML to acknowledge the webhook
    res.set('Content-Type', 'text/xml');
    res.send('<Response></Response>');
  } catch (err) {
    logger.error('Twilio webhook error:', err);
    res.status(500).send('<Response></Response>');
  }
});

export { router as authRouter };
