/**
 * modules/reviewers/reviewers.repository.js
 *
 * DB operations for survey_reviewers table.
 *
 * Table: survey_reviewers
 *   reviewer_id          UUID PK
 *   assignment_id        UUID FK → survey_assignments
 *   reviewer_employee_id TEXT FK → employees
 *   reviewer_type        TEXT (MANAGER|PEER|DIRECT_REPORT|INDIRECT_REPORT|CROSS_FUNCTIONAL|CXO)
 *   question_set         TEXT (IC|TM|HOD)
 *   status               TEXT (PENDING|IN_PROGRESS|COMPLETED)
 *   access_token         UUID UNIQUE
 *   reminded_at          TIMESTAMPTZ
 *   completed_at         TIMESTAMPTZ
 *   created_at           TIMESTAMPTZ
 */

import { supabaseAdmin } from '../../config/supabase.js';

// ─────────────────────────────────────────────────────────────

export async function listReviewersByAssignment(assignmentId) {
  const { data, error } = await supabaseAdmin
    .from('survey_reviewers')
    .select(
      `reviewer_id, reviewer_type, question_set, status,
       access_token, reminded_at, completed_at, created_at,
       employees!reviewer_employee_id(employee_id, full_name, department, designation)`
    )
    .eq('assignment_id', assignmentId)
    .order('reviewer_type', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

// ─────────────────────────────────────────────────────────────

export async function getReviewerById(reviewerId) {
  const { data, error } = await supabaseAdmin
    .from('survey_reviewers')
    .select('*, survey_assignments(*)')
    .eq('reviewer_id', reviewerId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data;
}

// ─────────────────────────────────────────────────────────────

/**
 * Get a reviewer row by access_token for token-based survey access.
 */
export async function getReviewerByAccessToken(token) {
  const { data, error } = await supabaseAdmin
    .from('survey_reviewers')
    .select('*, survey_assignments(*)')
    .eq('access_token', token)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data;
}

// ─────────────────────────────────────────────────────────────

/**
 * Count reviewers for an assignment (for min/max validation).
 */
export async function countReviewersByAssignment(assignmentId) {
  const { count, error } = await supabaseAdmin
    .from('survey_reviewers')
    .select('reviewer_id', { count: 'exact', head: true })
    .eq('assignment_id', assignmentId);

  if (error) throw error;
  return count ?? 0;
}

// ─────────────────────────────────────────────────────────────

/**
 * Check if a specific reviewer is already assigned to this assignment.
 */
export async function getReviewerByAssignmentAndEmployee(assignmentId, reviewerEmployeeId) {
  const { data, error } = await supabaseAdmin
    .from('survey_reviewers')
    .select('reviewer_id')
    .eq('assignment_id', assignmentId)
    .eq('reviewer_employee_id', reviewerEmployeeId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data;
}

// ─────────────────────────────────────────────────────────────

export async function addReviewer({ assignment_id, reviewer_employee_id, reviewer_type, question_set }) {
  const { data, error } = await supabaseAdmin
    .from('survey_reviewers')
    .insert({ assignment_id, reviewer_employee_id, reviewer_type, question_set })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ─────────────────────────────────────────────────────────────

/**
 * Remove a reviewer from an assignment.
 * Only called when reviewer status is PENDING (not yet started).
 */
export async function removeReviewer(reviewerId) {
  const { error } = await supabaseAdmin
    .from('survey_reviewers')
    .delete()
    .eq('reviewer_id', reviewerId);

  if (error) throw error;
}

// ─────────────────────────────────────────────────────────────

/**
 * Update reviewer status + completed_at/reminded_at.
 * Called by the survey response module.
 */
export async function updateReviewerStatus(reviewerId, updates) {
  const { data, error } = await supabaseAdmin
    .from('survey_reviewers')
    .update(updates)
    .eq('reviewer_id', reviewerId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ─────────────────────────────────────────────────────────────

/**
 * List all PENDING surveys assigned to a specific reviewer employee
 * across all cycles (for the "my pending surveys" dashboard feed).
 */
export async function listPendingSurveysForReviewer(reviewerEmployeeId) {
  const { data, error } = await supabaseAdmin
    .from('survey_reviewers')
    .select(
      `reviewer_id, reviewer_type, question_set, status, access_token, created_at,
       survey_assignments!inner(
         assignment_id, cycle_id,
         employees!inner(employee_id, full_name, department, designation),
         review_cycles!inner(cycle_id, cycle_name, end_date, status)
       )`
    )
    .eq('reviewer_employee_id', reviewerEmployeeId)
    .in('status', ['PENDING', 'IN_PROGRESS'])
    .eq('survey_assignments.review_cycles.status', 'ACTIVE')
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

// ─────────────────────────────────────────────────────────────

/**
 * Bulk insert reviewers — used by CSV import.
 * Uses upsert to be idempotent (same assignment + same reviewer_employee → skip).
 */
export async function bulkUpsertReviewers(rows) {
  if (rows.length === 0) return [];

  const { data, error } = await supabaseAdmin
    .from('survey_reviewers')
    .upsert(rows, { onConflict: 'assignment_id,reviewer_employee_id', ignoreDuplicates: true })
    .select();

  if (error) throw error;
  return data ?? [];
}
