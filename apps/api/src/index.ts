import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import dotenv from 'dotenv';
import { rateLimit } from 'express-rate-limit';
import path from 'path';

import { authRouter } from './routes/auth';
import { reportsRouter } from './routes/reports';
import { incidentsRouter } from './routes/incidents';
import { demandsRouter } from './routes/demands';
import { workOrdersRouter } from './routes/workOrders';
import { organizationsRouter } from './routes/organizations';
import { initiativesRouter } from './routes/initiatives';
import { cityRouter } from './routes/city';
import { missionsRouter } from './routes/missions';
import { circlesRouter } from './routes/circles';
import { adminRouter } from './routes/admin';
import { userRouter } from './routes/users';
import { sosRouter } from './routes/sos';
import { integrityRouter } from './routes/integrity';
import { notificationsRouter } from './routes/notifications';
import { leaderboardRouter } from './routes/leaderboard';
import { predictionsRouter } from './routes/predictions';
import { petitionsRouter } from './routes/petitions';
import { uploadRouter } from './routes/upload';
import { creditsRouter } from './routes/credits';
import { rewardsRouter } from './routes/rewards';
import { campaignsRouter } from './routes/campaigns';
import { sponsorsRouter } from './routes/sponsors';
import { fraudRouter } from './routes/fraud';
import { aiTrackingRouter } from './routes/ai-tracking';
import { revenueRouter } from './routes/revenue';
import { referralsRouter } from './routes/referrals';

import { initSocketIO } from './realtime/socket';
import { logger } from './utils/logger';

dotenv.config();

const app = express();
const httpServer = createServer(app);

// ─── Socket.IO ───────────────────────────────────────────────
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:5173'],
    methods: ['GET', 'POST'],
  },
});
initSocketIO(io);

// ─── Middleware ───────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));

const corsOrigins = process.env.CORS_ORIGINS?.split(',') || ['http://localhost:5173', 'http://localhost:8081'];
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || corsOrigins.some(o => origin.startsWith(o))) {
      callback(null, true);
    } else if (process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('combined', { stream: { write: (msg) => logger.info(msg.trim()) } }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Rate limiting
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(globalLimiter);

// ─── Routes ──────────────────────────────────────────────────
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/reports', reportsRouter);
app.use('/api/v1/incidents', incidentsRouter);
app.use('/api/v1/demands', demandsRouter);
app.use('/api/v1/work-orders', workOrdersRouter);
app.use('/api/v1/organizations', organizationsRouter);
app.use('/api/v1/initiatives', initiativesRouter);
app.use('/api/v1/city', cityRouter);
app.use('/api/v1/missions', missionsRouter);
app.use('/api/v1/circles', circlesRouter);
app.use('/api/v1/admin', adminRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/sos', sosRouter);
app.use('/api/v1/integrity', integrityRouter);
app.use('/api/v1/notifications', notificationsRouter);
app.use('/api/v1/leaderboard', leaderboardRouter);
app.use('/api/v1/predictions', predictionsRouter);
app.use('/api/v1/petitions', petitionsRouter);
app.use('/api/v1/upload', uploadRouter);
app.use('/api/v1/credits', creditsRouter);
app.use('/api/v1/rewards', rewardsRouter);
app.use('/api/v1/campaigns', campaignsRouter);
app.use('/api/v1/sponsors', sponsorsRouter);
app.use('/api/v1/fraud', fraudRouter);
app.use('/api/v1/ai', aiTrackingRouter);
app.use('/api/v1/revenue', revenueRouter);
app.use('/api/v1/referrals', referralsRouter);

// Health check
app.get('/healthz', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'sahay-api',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// 404
app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error(err.stack);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

// ─── Start ───────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT || '3000', 10);
httpServer.listen(PORT, () => {
  logger.info(`🚀 Sahay API running on http://localhost:${PORT}`);
  logger.info(`🔌 Socket.IO ready`);
  logger.info(`🌍 Environment: ${process.env.NODE_ENV}`);
});

export { app, io };
