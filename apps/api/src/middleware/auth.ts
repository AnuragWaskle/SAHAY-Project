import { Request, Response, NextFunction } from 'express';
import { initializeApp, App, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { query } from '../db/pool';
import { logger } from '../utils/logger';
import { UserRole } from '@sahay/shared-types';

// ─── Firebase Admin Initialization ───────────────────────────

let firebaseApp: App | null = null;

function getFirebaseApp(): App {
  if (firebaseApp) return firebaseApp;

  const {
    FIREBASE_PROJECT_ID,
    FIREBASE_PRIVATE_KEY,
    FIREBASE_CLIENT_EMAIL,
  } = process.env;

  if (!FIREBASE_PROJECT_ID || !FIREBASE_PRIVATE_KEY || !FIREBASE_CLIENT_EMAIL) {
    logger.warn('Firebase credentials not fully configured — using dev mode (no token verification)');
    return null as unknown as App;
  }

  try {
    firebaseApp = initializeApp({
      credential: cert({
        projectId: FIREBASE_PROJECT_ID,
        privateKey: FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        clientEmail: FIREBASE_CLIENT_EMAIL,
      }),
    });
    logger.info('Firebase Admin initialized');
    return firebaseApp;
  } catch (err) {
    logger.error('Firebase Admin init failed:', err);
    return null as unknown as App;
  }
}

// ─── Extended Request Type ────────────────────────────────────

export interface AuthRequest extends Request {
  user?: {
    id: string;
    firebase_uid: string;
    role: UserRole;
    city_id: string | null;
    jurisdiction_id: string | null;
    name: string;
    badge_type: string;
    civic_impact_score: number;
    level: number;
  };
}

// ─── Middleware: Require Auth ─────────────────────────────────

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ success: false, error: 'No token provided' });
      return;
    }

    const token = authHeader.slice(7);
    let firebaseUid: string;

    // ── Dev mode: accept "demo_<uid>" tokens directly ──
    if (process.env.NODE_ENV === 'development' && token.startsWith('demo_')) {
      firebaseUid = token;
      logger.debug(`Dev mode: accepting demo token ${firebaseUid}`);
    } else {
      // ── Production: verify Firebase ID token ──
      const app = getFirebaseApp();
      if (!app) {
        // Fallback for unconfigured Firebase: decode as sub claim
        const parts = token.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
          firebaseUid = payload.sub || payload.uid;
        } else {
          res.status(401).json({ success: false, error: 'Invalid token' });
          return;
        }
      } else {
        const decoded = await getAuth(app).verifyIdToken(token);
        firebaseUid = decoded.uid;
      }
    }

    // ── Fetch user from PostgreSQL (create if new) ──
    let result = await query(
      'SELECT id, firebase_uid, role, city_id, jurisdiction_id, name, badge_type, civic_impact_score, level FROM users WHERE firebase_uid = $1',
      [firebaseUid]
    );

    if (result.rowCount === 0) {
      // Auto-create user on first login
      result = await query(
        `INSERT INTO users (firebase_uid, role, name)
         VALUES ($1, 'citizen', 'New User')
         ON CONFLICT (firebase_uid) DO UPDATE SET updated_at = NOW()
         RETURNING id, firebase_uid, role, city_id, jurisdiction_id, name, badge_type, civic_impact_score, level`,
        [firebaseUid]
      );
    }

    req.user = result.rows[0];
    next();
  } catch (err) {
    logger.error('Auth error:', err);
    res.status(401).json({ success: false, error: 'Authentication failed' });
  }
};

// ─── Middleware: Optional Auth ────────────────────────────────

export const optionalAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    next();
    return;
  }
  await requireAuth(req, res, next);
};

// ─── Middleware: Require Roles ────────────────────────────────

export const requireRole = (...roles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }
    if (!roles.includes(req.user.role as UserRole)) {
      res.status(403).json({
        success: false,
        error: `Access denied. Required role: ${roles.join(' or ')}`,
      });
      return;
    }
    next();
  };
};

// ─── Role Helpers ─────────────────────────────────────────────

export const isAdmin = requireRole('super_admin', 'sub_admin');
export const isSuperAdmin = requireRole('super_admin');
export const isGovOrAdmin = requireRole('municipal_officer', 'super_admin', 'sub_admin');
export const isVerifiedUser = requireRole(
  'verified_citizen', 'civic_leader', 'ngo', 'company_csr',
  'society_rwa', 'municipal_officer', 'elected_representative',
  'political_party', 'police', 'journalist', 'sub_admin', 'super_admin'
);

// ─── Audit Log Helper ─────────────────────────────────────────

export const logAudit = async (
  actorId: string,
  action: string,
  targetType: string,
  targetId: string | null,
  metadata: Record<string, unknown> = {}
) => {
  try {
    await query(
      'INSERT INTO audit_logs (actor_id, action, target_type, target_id, metadata) VALUES ($1, $2, $3, $4, $5)',
      [actorId, action, targetType, targetId, JSON.stringify(metadata)]
    );
  } catch (err) {
    logger.error('Audit log error:', err);
  }
};
