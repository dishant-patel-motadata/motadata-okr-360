/**
 * modules/scores/scores.repository.js
 *
 * DB operations for the calculated_scores table.
 *
 * Table: calculated_scores
 *   calc_id                  UUID PK
 *   employee_id              TEXT FK → employees
 *   cycle_id                 UUID FK → review_cycles
 *   self_score               DECIMAL          (reference only)
 *   colleague_score          DECIMAL
 *   final_label              TEXT
 *   competency_scores        JSONB
 *   reviewer_category_scores JSONB
 *   total_reviewers          INTEGER
 *   calculated_at            TIMESTAMPTZ
 *   UNIQUE (employee_id, cycle_id)
 */

import { supabaseAdmin } from '../../config/supabase.js';

// ── Write ─────────────────────────────────────────────────────

/**
 * Upsert a calculated score record.
 * If (employee_id, cycle_id) already exists, overwrites it
 * (safe to recalculate).
 *
 * @param {{
 *   employee_id: string,
 *   cycle_id: string,
 *   self_score: number|null,
 *   colleague_score: number,
 *   final_label: string,
 *   competency_scores: object,
 *   reviewer_category_scores: object,
 *   total_reviewers: number,
 * }} payload
 */
export async function upsertCalculatedScore(payload) {
  const row = {
    ...payload,
    calculated_at: new Date().toISOString(),
  };

  const { data, error } = await supabaseAdmin
    .from('calculated_scores')
    .upsert(row, { onConflict: 'employee_id,cycle_id', ignoreDuplicates: false })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ─────────────────────────────────────────────────────────────

/**
 * Delete all calculated scores for a cycle (used before recalculation).
 * In practice upsert is idempotent; this is only needed for a full reset.
 */
export async function deleteScoresByCycle(cycleId) {
  const { error } = await supabaseAdmin
    .from('calculated_scores')
    .delete()
    .eq('cycle_id', cycleId);

  if (error) throw error;
}

// ── Read ──────────────────────────────────────────────────────

/**
 * Get a single employee's calculated score for one cycle.
 * Returns null if not found.
 */
export async function getCalculatedScore(employeeId, cycleId) {
  const { data, error } = await supabaseAdmin
    .from('calculated_scores')
    .select(
      `calc_id, employee_id, cycle_id, self_score, colleague_score,
       final_label, competency_scores, reviewer_category_scores,
       total_reviewers, calculated_at,
       employees(full_name, department, designation, group_name),
       review_cycles(cycle_name, status)`
    )
    .eq('employee_id', employeeId)
    .eq('cycle_id', cycleId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data;
}

// ─────────────────────────────────────────────────────────────

/**
 * Get all calculated scores for a cycle (CXO / admin view).
 * Optionally filter by department.
 */
export async function getCalculatedScoresByCycle(cycleId, { department } = {}) {
  let query = supabaseAdmin
    .from('calculated_scores')
    .select(
      `calc_id, employee_id, cycle_id, self_score, colleague_score,
       final_label, competency_scores, reviewer_category_scores,
       total_reviewers, calculated_at,
       employees(full_name, department, designation, group_name)`
    )
    .eq('cycle_id', cycleId)
    .order('colleague_score', { ascending: false });

  if (department) {
    query = query.eq('employees.department', department);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

// ─────────────────────────────────────────────────────────────

/**
 * Get all historical calculated scores for one employee.
 * Ordered by cycle start_date descending (latest first).
 */
export async function getCalculatedScoresByEmployee(employeeId) {
  const { data, error } = await supabaseAdmin
    .from('calculated_scores')
    .select(
      `calc_id, employee_id, cycle_id, self_score, colleague_score,
       final_label, competency_scores, reviewer_category_scores,
       total_reviewers, calculated_at,
       review_cycles(cycle_name, start_date, end_date, status)`
    )
    .eq('employee_id', employeeId)
    .order('calculated_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

// ─────────────────────────────────────────────────────────────

/**
 * Get department average scores for a cycle.
 * Used for "self vs department" comparison.
 * Returns the raw rows — caller aggregates.
 */
export async function getDepartmentScoresByCycle(cycleId, department) {
  const { data, error } = await supabaseAdmin
    .from('calculated_scores')
    .select(
      `colleague_score, competency_scores,
       employees!inner(department)`
    )
    .eq('cycle_id', cycleId)
    .eq('employees.department', department);

  if (error) throw error;
  return data ?? [];
}
