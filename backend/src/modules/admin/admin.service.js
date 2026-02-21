/**
 * modules/admin/admin.service.js
 *
 * Business logic layer for the Admin module.
 * Covers: reviewer_config management, audit log viewer,
 * and system health dashboard.
 */

import {
  getReviewerConfig,
  upsertReviewerConfig,
  getAuditLogs,
  getActiveCycleSummary,
  getEmployeeGroupSummary,
} from './admin.repository.js';
import { writeAuditLog } from '../../utils/auditLogger.js';
import { logger } from '../../utils/logger.js';

// ── Reviewer Config ────────────────────────────────────────

/**
 * Fetch current reviewer config.
 * Falls back to DB defaults (min=2, max=8) if no row exists.
 */
export async function getReviewerConfigService() {
  const config = await getReviewerConfig();
  if (!config) {
    // Return the hardcoded defaults before first admin setup
    return { min_reviewers: 2, max_reviewers: 8, _default: true };
  }
  return config;
}

/**
 * Update reviewer config and write an audit trail.
 *
 * @param {{ min_reviewers?: number, max_reviewers?: number }} updates  validated body
 * @param {{ employeeId: string }}                              user     CXO actor
 * @returns {object} updated config
 */
export async function updateReviewerConfigService(updates, user) {
  const existing = await getReviewerConfig();

  // Cross-field validation: ensure min ≤ max after merge
  const currentMin = existing?.min_reviewers ?? 2;
  const currentMax = existing?.max_reviewers ?? 8;
  const newMin = updates.min_reviewers ?? currentMin;
  const newMax = updates.max_reviewers ?? currentMax;

  if (newMin > newMax) {
    const err = new Error(
      `min_reviewers (${newMin}) must be ≤ max_reviewers (${newMax}) after merge.`
    );
    err.status = 422;
    throw err;
  }

  const updated = await upsertReviewerConfig({
    min_reviewers: updates.min_reviewers,
    max_reviewers: updates.max_reviewers,
    updated_by: user.employeeId,
  });

  await writeAuditLog({
    userId: user.employeeId,
    actionType: 'UPDATE',
    entityType: 'reviewer_config',
    entityId: updated.config_id,
    oldValue: existing ?? null,
    newValue: updated,
  });

  logger.info('Reviewer config updated', {
    by: user.employeeId,
    min_reviewers: updated.min_reviewers,
    max_reviewers: updated.max_reviewers,
  });

  return updated;
}

// ── Audit Log ──────────────────────────────────────────────

/**
 * Return paginated audit log entries.
 * All filters are optional.
 *
 * @param {object} queryParams  validated query from auditLogQuerySchema
 * @returns {{ logs, meta }}
 */
export async function getAuditLogsService(queryParams) {
  const { page, limit, ...filters } = queryParams;

  const { logs, total } = await getAuditLogs({ page, limit, ...filters });

  return {
    logs,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

// ── System Dashboard ───────────────────────────────────────

/**
 * Aggregate system health overview for the CXO dashboard.
 *
 * @param {{ cycle_id?: string }} opts  optional cycle_id filter
 * @returns {object}
 */
export async function getSystemDashboardService({ cycle_id } = {}) {
  const [cycleSummary, employeeGroups] = await Promise.all([
    getActiveCycleSummary(cycle_id ?? null),
    getEmployeeGroupSummary(),
  ]);

  return {
    employees: employeeGroups,
    cycle: cycleSummary,
  };
}
