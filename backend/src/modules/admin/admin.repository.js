/**
 * modules/admin/admin.repository.js
 *
 * Data-access layer for the Admin module.
 * Covers: reviewer_config, audit_log.
 */

import { supabaseAdmin } from '../../config/supabase.js';

// ── Reviewer Config ────────────────────────────────────────

/**
 * Fetch the single reviewer_config row.
 * Returns null if no config row exists yet.
 * @returns {object|null}
 */
export async function getReviewerConfig() {
  const { data, error } = await supabaseAdmin
    .from('reviewer_config')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * Update the reviewer_config singleton row.
 * If no row exists, inserts one with sensible defaults.
 *
 * @param {{ min_reviewers?: number, max_reviewers?: number, updated_by: string }} updates
 * @returns {object} persisted config row
 */
export async function upsertReviewerConfig({ min_reviewers, max_reviewers, updated_by }) {
  // Fetch existing row first to handle min/max merge
  const existing = await getReviewerConfig();

  if (!existing) {
    // No config yet — insert with defaults merged with provided values
    const { data, error } = await supabaseAdmin
      .from('reviewer_config')
      .insert({
        min_reviewers: min_reviewers ?? 2,
        max_reviewers: max_reviewers ?? 8,
        updated_by,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  const updated = {};
  if (min_reviewers !== undefined) updated.min_reviewers = min_reviewers;
  if (max_reviewers !== undefined) updated.max_reviewers = max_reviewers;
  updated.updated_by = updated_by;

  const { data, error } = await supabaseAdmin
    .from('reviewer_config')
    .update(updated)
    .eq('config_id', existing.config_id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ── Audit Log ──────────────────────────────────────────────

/**
 * Paginated query of audit_log with optional filters.
 *
 * @param {Object} opts
 * @param {number} opts.page
 * @param {number} opts.limit
 * @param {string} [opts.action_type]
 * @param {string} [opts.entity_type]
 * @param {string} [opts.entity_id]
 * @param {string} [opts.user_id]
 * @param {string} [opts.from]   ISO-8601 datetime
 * @param {string} [opts.to]     ISO-8601 datetime
 * @returns {{ logs: object[], total: number }}
 */
export async function getAuditLogs({
  page = 1,
  limit = 50,
  action_type,
  entity_type,
  entity_id,
  user_id,
  from,
  to,
}) {
  const offset = (page - 1) * limit;

  let query = supabaseAdmin
    .from('audit_log')
    .select(
      `log_id,
       user_id,
       action_type,
       entity_type,
       entity_id,
       old_value,
       new_value,
       ip_address,
       created_at,
       user:employees!audit_log_user_id_fkey(employee_id, full_name, email, group_name)`,
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (action_type) query = query.eq('action_type', action_type);
  if (entity_type) query = query.eq('entity_type', entity_type);
  if (entity_id) query = query.eq('entity_id', entity_id);
  if (user_id) query = query.eq('user_id', user_id);
  if (from) query = query.gte('created_at', from);
  if (to) query = query.lte('created_at', to);

  const { data, error, count } = await query;
  if (error) throw error;

  return { logs: data ?? [], total: count ?? 0 };
}

// ── System Dashboard ───────────────────────────────────────

/**
 * Fetch active/closing cycle with enrollment + completion summary.
 * If cycle_id is provided, returns stats for that specific cycle.
 *
 * @param {string|null} cycleId
 * @returns {object|null}
 */
export async function getActiveCycleSummary(cycleId) {
  // Resolve which cycle to summarise
  let cycle;
  if (cycleId) {
    const { data, error } = await supabaseAdmin
      .from('review_cycles')
      .select('*')
      .eq('cycle_id', cycleId)
      .single();
    if (error) throw error;
    cycle = data;
  } else {
    // Default: most recent non-DRAFT cycle
    const { data, error } = await supabaseAdmin
      .from('review_cycles')
      .select('*')
      .in('status', ['ACTIVE', 'CLOSING', 'COMPLETED', 'PUBLISHED'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    cycle = data;
  }

  if (!cycle) return null;

  // Assignment-level stats
  const { data: assignmentStats, error: aErr } = await supabaseAdmin
    .from('survey_assignments')
    .select('status')
    .eq('cycle_id', cycle.cycle_id);

  if (aErr) throw aErr;

  const totalAssignments = assignmentStats?.length ?? 0;
  const completedAssignments = assignmentStats?.filter((a) => a.status === 'COMPLETED').length ?? 0;
  const inProgressAssignments = assignmentStats?.filter((a) => a.status === 'IN_PROGRESS').length ?? 0;
  const pendingAssignments = assignmentStats?.filter((a) => a.status === 'PENDING').length ?? 0;

  // Reviewer-level stats
  const { data: reviewerStats, error: rErr } = await supabaseAdmin
    .from('survey_reviewers')
    .select('status, survey_assignments!inner(cycle_id)')
    .eq('survey_assignments.cycle_id', cycle.cycle_id);

  if (rErr) throw rErr;

  const totalReviewers = reviewerStats?.length ?? 0;
  const completedReviewers = reviewerStats?.filter((r) => r.status === 'COMPLETED').length ?? 0;

  // Self-feedback stats
  const { data: selfStats, error: sErr } = await supabaseAdmin
    .from('self_feedback')
    .select('status')
    .eq('cycle_id', cycle.cycle_id);

  if (sErr) throw sErr;

  const totalSelf = selfStats?.length ?? 0;
  const completedSelf = selfStats?.filter((s) => s.status === 'SUBMITTED').length ?? 0;

  return {
    cycle,
    assignments: {
      total: totalAssignments,
      completed: completedAssignments,
      in_progress: inProgressAssignments,
      pending: pendingAssignments,
      completion_pct:
        totalAssignments > 0 ? Math.round((completedAssignments / totalAssignments) * 100) : 0,
    },
    reviewers: {
      total: totalReviewers,
      completed: completedReviewers,
      completion_pct:
        totalReviewers > 0 ? Math.round((completedReviewers / totalReviewers) * 100) : 0,
    },
    self_feedback: {
      total: totalSelf,
      submitted: completedSelf,
      completion_pct: totalSelf > 0 ? Math.round((completedSelf / totalSelf) * 100) : 0,
    },
  };
}

/**
 * Count employees by group across the entire system.
 * @returns {object}
 */
export async function getEmployeeGroupSummary() {
  const { data, error } = await supabaseAdmin
    .from('employees')
    .select('group_name')
    .eq('is_active', true);

  if (error) throw error;

  const counts = { IC: 0, TM: 0, HOD: 0, CXO: 0 };
  for (const { group_name } of data ?? []) {
    if (counts[group_name] !== undefined) counts[group_name]++;
  }
  counts.total = (data ?? []).length;
  return counts;
}
