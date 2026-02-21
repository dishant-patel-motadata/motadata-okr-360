/**
 * modules/admin/admin.controller.js
 *
 * Controllers for the Admin module.
 * All routes are CXO-only; authentication/authorisation
 * is enforced at the route level via middleware.
 */

import {
  getReviewerConfigService,
  updateReviewerConfigService,
  getAuditLogsService,
  getSystemDashboardService,
} from './admin.service.js';
import { sendSuccess, sendError } from '../../utils/response.js';
import { logger } from '../../utils/logger.js';

// ── Reviewer Config ────────────────────────────────────────

/**
 * GET /api/v1/admin/reviewer-config
 * Retrieve current min/max reviewer limits.
 */
export const getReviewerConfig = async (req, res, next) => {
  try {
    const config = await getReviewerConfigService();
    return sendSuccess(res, config, 'Reviewer config retrieved.');
  } catch (err) {
    logger.error('getReviewerConfig error', { error: err.message });
    next(err);
  }
};

/**
 * PATCH /api/v1/admin/reviewer-config
 * Update min_reviewers and/or max_reviewers.
 * Body: { min_reviewers?, max_reviewers? }
 */
export const updateReviewerConfig = async (req, res, next) => {
  try {
    const updated = await updateReviewerConfigService(req.body, req.user);
    return sendSuccess(res, updated, 'Reviewer config updated.');
  } catch (err) {
    if (err.status) return sendError(res, err.message, err.status);
    logger.error('updateReviewerConfig error', { error: err.message });
    next(err);
  }
};

// ── Audit Log ──────────────────────────────────────────────

/**
 * GET /api/v1/admin/audit-logs
 * Query audit_log with optional filters.
 *
 * Query params:
 *   page, limit, action_type, entity_type, entity_id,
 *   user_id, from (ISO-8601), to (ISO-8601)
 */
export const getAuditLogs = async (req, res, next) => {
  try {
    const { logs, meta } = await getAuditLogsService(req.query);
    return res.status(200).json({
      success: true,
      data: logs,
      message: 'Audit logs retrieved.',
      error: null,
      meta,
    });
  } catch (err) {
    logger.error('getAuditLogs error', { error: err.message });
    next(err);
  }
};

// ── System Dashboard ───────────────────────────────────────

/**
 * GET /api/v1/admin/dashboard
 * System health: employee group counts + active cycle completion stats.
 *
 * Query params:
 *   cycle_id? — UUID of a specific cycle to summarise
 */
export const getSystemDashboard = async (req, res, next) => {
  try {
    const data = await getSystemDashboardService({ cycle_id: req.query.cycle_id });
    return sendSuccess(res, data, 'Dashboard data retrieved.');
  } catch (err) {
    logger.error('getSystemDashboard error', { error: err.message });
    next(err);
  }
};
