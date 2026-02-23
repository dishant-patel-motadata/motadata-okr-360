/**
 * app.js
 *
 * Express application setup.
 * Registers middleware, mounts better-auth handler, and
 * wires all v1 API route modules.
 *
 * Route namespace layout:
 *   /api/auth/**         → better-auth (sign-in, sign-out, session)
 *   /api/v1/auth/**      → custom auth helpers (me, seed)
 *   /api/v1/employees    → employee management + AD sync
 *   /api/v1/cycles       → review cycle management
 *   /api/v1/competencies → competency catalogue
 *   /api/v1/questions    → question bank
 *   /api/v1/self-feedback        → self-assessment forms
 *   /api/v1/assignments          → survey assignment management
 *   /api/v1/reviewers            → reviewer management
 *   /api/v1/surveys              → survey completion
 *   /api/v1/scores               → score calculation engine
 *   /api/v1/results              → dashboard result APIs
 *   /api/v1/notifications        → notification management
 *   /api/v1/reports              → PDF / CSV reports
 *   /api/v1/admin                → admin utilities, audit log
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { toNodeHandler } from 'better-auth/node';

import { env } from './config/env.js';
import { auth } from './config/auth.js';
import { requestLogger } from './middleware/requestLogger.js';
import { notFound } from './middleware/notFound.js';
import { errorHandler } from './middleware/errorHandler.js';

// ── Route imports (modules added incrementally each step) ──
// Uncomment each import as the corresponding module is built.
import authRoutes from './modules/auth/auth.routes.js';
import employeeRoutes from './modules/employees/employees.routes.js';
import cycleRoutes from './modules/cycles/cycles.routes.js';
import competencyRoutes from './modules/competencies/competencies.routes.js';
import questionRoutes from './modules/questions/questions.routes.js';
import selfFeedbackRoutes from './modules/selfFeedback/selfFeedback.routes.js';
import assignmentRoutes from './modules/assignments/assignments.routes.js';
import reviewerRoutes from './modules/reviewers/reviewers.routes.js';
import surveyRoutes from './modules/responses/responses.routes.js';
import scoreRoutes from './modules/scores/scores.routes.js';
import resultRoutes from './modules/reports/results.routes.js';
import reportRoutes from './modules/reports/reports.routes.js';
// import notificationRoutes   from './modules/notifications/notifications.routes.js';
import adminRoutes from './modules/admin/admin.routes.js';

const app = express();

// ── Security headers ───────────────────────────────────────
app.use(helmet());

// ── CORS ───────────────────────────────────────────────────
const allowedOrigins = env.CORS_ORIGINS.split(',').map((o) => o.trim());
app.use(
  cors({
    origin: (origin, cb) => {
      // Allow non-browser requests (curl, server-to-server) in dev
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      cb(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,          // required for better-auth cookie sessions
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// ── Body parsing ───────────────────────────────────────────
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// ── Request logging ────────────────────────────────────────
app.use(requestLogger);

// ── General API rate limiter ───────────────────────────────
app.use(
  '/api',
  rateLimit({
    windowMs: parseInt(env.RATE_LIMIT_WINDOW_MS, 10),
    max: parseInt(env.RATE_LIMIT_MAX, 10),
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      message: 'Too many requests. Please slow down and try again later.',
      error: 'RATE_LIMITED',
    },
  })
);

// Stricter limiter for auth endpoints
app.use(
  '/api/auth',
  rateLimit({
    windowMs: 15 * 60 * 1000,  // 15 minutes
    max: 20,
    message: {
      success: false,
      message: 'Too many authentication attempts. Please wait 15 minutes.',
      error: 'AUTH_RATE_LIMITED',
    },
  })
);

// ── ✅ better-auth handler ─────────────────────────────────
// Handles: /api/auth/sign-in, /api/auth/sign-out, /api/auth/session, etc.
// Must be registered BEFORE custom routes to avoid route conflicts.
app.all('/api/auth/*', toNodeHandler(auth));

// ── Health check (unauthenticated) ────────────────────────
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'OKR-360 API is healthy',
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
  });
});

// ── Root route — API index ─────────────────────────────────
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'OKR-360 API',
    version: 'v1',
    health: '/health',
    routes: {
      auth: '/api/auth/*  (sign-in, sign-out, session)',
      me: '/api/v1/auth/me',
      employees: '/api/v1/employees',
      cycles: '/api/v1/cycles',
      competencies: '/api/v1/competencies',
      questions: '/api/v1/questions',
      selfFeedback: '/api/v1/self-feedback',
      assignments: '/api/v1/assignments',
      reviewers: '/api/v1/reviewers',
      surveys: '/api/v1/surveys',
      scores: '/api/v1/scores',
      results: '/api/v1/results',
      reports: '/api/v1/reports',
      admin: '/api/v1/admin',
    },
  });
});

// ── API v1 routes ─────────────────────────────────────────
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/employees', employeeRoutes);
app.use('/api/v1/cycles', cycleRoutes);
app.use('/api/v1/competencies', competencyRoutes);
app.use('/api/v1/questions', questionRoutes);
app.use('/api/v1/self-feedback', selfFeedbackRoutes);
app.use('/api/v1/assignments', assignmentRoutes);
app.use('/api/v1/reviewers', reviewerRoutes);
app.use('/api/v1/surveys', surveyRoutes);
app.use('/api/v1/scores', scoreRoutes);
app.use('/api/v1/results', resultRoutes);
app.use('/api/v1/reports', reportRoutes);
// app.use('/api/v1/notifications',  notificationRoutes);
app.use('/api/v1/admin', adminRoutes);

// ── 404 + Global error handler (must be last) ──────────────
app.use(notFound);
app.use(errorHandler);

export default app;
