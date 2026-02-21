/**
 * modules/admin/admin.routes.js
 *
 * Route map (all CXO-only):
 *   GET   /dashboard          → system health overview
 *   GET   /reviewer-config    → current min/max reviewer limits
 *   PATCH /reviewer-config    → update reviewer limits
 *   GET   /audit-logs         → paginated audit log viewer
 */

import { Router } from 'express';
import { authenticateSession } from '../../middleware/authenticateSession.js';
import { authorizeRoles } from '../../middleware/authorizeRoles.js';
import { validate } from '../../middleware/validate.js';
import {
  updateReviewerConfigSchema,
  auditLogQuerySchema,
  dashboardQuerySchema,
} from './admin.validator.js';
import {
  getReviewerConfig,
  updateReviewerConfig,
  getAuditLogs,
  getSystemDashboard,
} from './admin.controller.js';

const router = Router();

// All admin routes require authentication and CXO role
router.use(authenticateSession, authorizeRoles('CXO'));

// ── System Dashboard ──────────────────────────────────────
router.get(
  '/dashboard',
  validate(dashboardQuerySchema, 'query'),
  getSystemDashboard
);

// ── Reviewer Config ───────────────────────────────────────
router.get('/reviewer-config', getReviewerConfig);
router.patch(
  '/reviewer-config',
  validate(updateReviewerConfigSchema),
  updateReviewerConfig
);

// ── Audit Log ─────────────────────────────────────────────
router.get(
  '/audit-logs',
  validate(auditLogQuerySchema, 'query'),
  getAuditLogs
);

export default router;
