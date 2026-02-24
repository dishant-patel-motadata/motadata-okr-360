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
import { supabaseAdmin } from '../../config/supabase.js';

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
  const [cycleSummary, employeeGroups, departmentStats, recentAuditLogs] = await Promise.all([
    getActiveCycleSummary(cycle_id ?? null),
    getEmployeeGroupSummary(),
    getDepartmentStatsForCycle(cycle_id ?? null),
    getAuditLogs({ page: 1, limit: 5 }),
  ]);

  // Transform to match frontend AdminDashboard interface
  return {
    total_employees: employeeGroups?.total ?? 0,
    total_assignments: cycleSummary?.assignments?.total ?? 0,
    completed_assignments: cycleSummary?.assignments?.completed ?? 0,
    pending_assignments: cycleSummary?.assignments?.pending ?? 0,
    in_progress_assignments: cycleSummary?.assignments?.in_progress ?? 0,
    self_feedback_completion: cycleSummary?.self_feedback?.completion_pct ?? 0,
    department_stats: departmentStats ?? [],
    recent_audit_logs: recentAuditLogs?.logs ?? [],
  };
}

/**
 * Get department-level assignment completion stats for a cycle.
 * @param {string|null} cycleId
 * @returns {Array<{ department: string, total: number, completed: number, completion_rate: number }>}
 */
async function getDepartmentStatsForCycle(cycleId) {
  const { getActiveCycleId } = await import('./admin.repository.js');

  // Resolve cycle_id if not provided
  let targetCycleId = cycleId;
  if (!targetCycleId) {
    const { data, error } = await supabaseAdmin
      .from('review_cycles')
      .select('cycle_id')
      .in('status', ['ACTIVE', 'CLOSING', 'COMPLETED', 'PUBLISHED'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    targetCycleId = data?.cycle_id;
  }

  if (!targetCycleId) return [];

  // Get assignments with employee department info
  const { data, error } = await supabaseAdmin
    .from('survey_assignments')
    .select('status, employee:employees!survey_assignments_employee_id_fkey(department)')
    .eq('cycle_id', targetCycleId);

  if (error) throw error;
  if (!data || data.length === 0) return [];

  // Group by department
  const deptMap = new Map();
  for (const assignment of data) {
    const dept = assignment.employee?.department ?? 'Unknown';
    if (!deptMap.has(dept)) {
      deptMap.set(dept, { total: 0, completed: 0 });
    }
    const stats = deptMap.get(dept);
    stats.total++;
    if (assignment.status === 'COMPLETED') {
      stats.completed++;
    }
  }

  // Convert to array format expected by frontend
  return Array.from(deptMap.entries())
    .map(([department, stats]) => ({
      department,
      total: stats.total,
      completed: stats.completed,
      completion_rate: stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0,
    }))
    .sort((a, b) => b.completion_rate - a.completion_rate);
}
