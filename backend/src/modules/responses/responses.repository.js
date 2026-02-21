/**
 * modules/responses/responses.repository.js
 *
 * DB operations for survey_responses and survey_comments tables.
 *
 * survey_responses:
 *   response_id  UUID PK
 *   reviewer_id  UUID FK → survey_reviewers
 *   question_id  TEXT FK → questions
 *   rating       INTEGER 1–4
 *   created_at   TIMESTAMPTZ
 *   UNIQUE (reviewer_id, question_id)
 *
 * survey_comments:
 *   comment_id   UUID PK
 *   reviewer_id  UUID FK → survey_reviewers
 *   comment_text TEXT
 *   created_at   TIMESTAMPTZ
 */

import { supabaseAdmin } from '../../config/supabase.js';

// ── Rich reviewer fetch (with nested context) ─────────────────

/**
 * Fetch a reviewer row with full context needed by the response services:
 *   survey_assignments → employees (ratee) + review_cycles (cycle status)
 * Returns null if not found.
 */
export async function getReviewerWithContext(reviewerId) {
  const { data, error } = await supabaseAdmin
    .from('survey_reviewers')
    .select(
      `reviewer_id, reviewer_type, question_set, status, access_token, completed_at,
       assignment_id,
       survey_assignments(
         assignment_id,
         status,
         employees!employee_id(employee_id, full_name, department, designation),
         review_cycles(cycle_id, cycle_name, status)
       )`
    )
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
 * Fetch a reviewer row by access_token with full context.
 * Returns null if not found.
 */
export async function getReviewerWithContextByToken(token) {
  const { data, error } = await supabaseAdmin
    .from('survey_reviewers')
    .select(
      `reviewer_id, reviewer_type, question_set, status, access_token, completed_at,
       assignment_id,
       survey_assignments(
         assignment_id,
         status,
         employees!employee_id(employee_id, full_name, department, designation),
         review_cycles(cycle_id, cycle_name, status)
       )`
    )
    .eq('access_token', token)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data;
}

// ── Responses ─────────────────────────────────────────────────

/**
 * Fetch all existing responses for a reviewer (for draft pre-fill).
 */
export async function getResponsesByReviewer(reviewerId) {
  const { data, error } = await supabaseAdmin
    .from('survey_responses')
    .select('response_id, question_id, rating, created_at')
    .eq('reviewer_id', reviewerId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

// ─────────────────────────────────────────────────────────────

/**
 * Upsert a batch of responses for a reviewer.
 * Uses onConflict on (reviewer_id, question_id) — safe to call multiple times.
 * "ignoreDuplicates: false" means existing rows are overwritten (update rating).
 */
export async function upsertResponses(reviewerId, responseEntries) {
  if (responseEntries.length === 0) return [];

  const rows = responseEntries.map(({ question_id, rating }) => ({
    reviewer_id: reviewerId,
    question_id,
    rating,
  }));

  const { data, error } = await supabaseAdmin
    .from('survey_responses')
    .upsert(rows, { onConflict: 'reviewer_id,question_id', ignoreDuplicates: false })
    .select();

  if (error) throw error;
  return data ?? [];
}

// ─────────────────────────────────────────────────────────────

/**
 * Count responses submitted by a reviewer (for completeness check).
 */
export async function countResponsesByReviewer(reviewerId) {
  const { count, error } = await supabaseAdmin
    .from('survey_responses')
    .select('response_id', { count: 'exact', head: true })
    .eq('reviewer_id', reviewerId);

  if (error) throw error;
  return count ?? 0;
}

// ─────────────────────────────────────────────────────────────

/**
 * Delete all responses for a reviewer — used by reopen (RC-15).
 */
export async function deleteResponsesByReviewer(reviewerId) {
  const { error } = await supabaseAdmin
    .from('survey_responses')
    .delete()
    .eq('reviewer_id', reviewerId);

  if (error) throw error;
}

// ── Comments ──────────────────────────────────────────────────

/**
 * Get the comment for a reviewer (at most one per reviewer in this schema).
 */
export async function getCommentByReviewer(reviewerId) {
  const { data, error } = await supabaseAdmin
    .from('survey_comments')
    .select('comment_id, comment_text, created_at')
    .eq('reviewer_id', reviewerId)
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) throw error;
  return data?.[0] ?? null;
}

// ─────────────────────────────────────────────────────────────

/**
 * Upsert a comment for a reviewer.
 * Deletes existing comment(s) then inserts fresh — keeps it simple.
 */
export async function upsertComment(reviewerId, commentText) {
  // Delete any existing comment first
  await supabaseAdmin
    .from('survey_comments')
    .delete()
    .eq('reviewer_id', reviewerId);

  if (!commentText || commentText.trim() === '') return null;

  const { data, error } = await supabaseAdmin
    .from('survey_comments')
    .insert({ reviewer_id: reviewerId, comment_text: commentText.trim() })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ─────────────────────────────────────────────────────────────

/**
 * Delete all comments for a reviewer — used by reopen (RC-15).
 */
export async function deleteCommentsByReviewer(reviewerId) {
  const { error } = await supabaseAdmin
    .from('survey_comments')
    .delete()
    .eq('reviewer_id', reviewerId);

  if (error) throw error;
}

// ── Admin read: raw responses for a specific assignment (audit) ─

/**
 * Get all responses + rater meta for every reviewer in an assignment.
 * Visible to admin only (anonymity rules §3.4).
 */
export async function getResponsesByAssignment(assignmentId) {
  const { data, error } = await supabaseAdmin
    .from('survey_reviewers')
    .select(
      `reviewer_id, reviewer_type, question_set, status,
       employees!reviewer_employee_id(employee_id, full_name, department),
       survey_responses(question_id, rating),
       survey_comments(comment_text)`
    )
    .eq('assignment_id', assignmentId);

  if (error) throw error;
  return data ?? [];
}

// ─────────────────────────────────────────────────────────────

/**
 * Get anonymised comments for an assignment.
 * Returns comment_text only — no reviewer identity.
 * Visible to TM/HOD/CXO for their direct reports.
 */
export async function getAnonymisedCommentsByAssignment(assignmentId) {
  const { data, error } = await supabaseAdmin
    .from('survey_reviewers')
    .select(
      `reviewer_type,
       survey_comments(comment_text)`
    )
    .eq('assignment_id', assignmentId)
    .eq('status', 'COMPLETED');

  if (error) throw error;

  // Flatten: [ { reviewer_type, comment_text } ]
  const result = [];
  for (const row of data ?? []) {
    for (const c of row.survey_comments ?? []) {
      result.push({ reviewer_type: row.reviewer_type, comment_text: c.comment_text });
    }
  }
  return result;
}
