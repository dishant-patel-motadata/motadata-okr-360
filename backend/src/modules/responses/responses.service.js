/**
 * modules/responses/responses.service.js
 *
 * Business logic for the Survey Response module.
 *
 * Access model:
 *   - getSurveyForm / saveSurveyDraft / submitSurvey:
 *       Accessible by (a) the reviewer employee via normal session auth, OR
 *       (b) anyone with the reviewer's access_token (token-link survey).
 *   - submitOnBehalf:  CXO only  (RC-14)
 *   - reopenSurvey:    CXO only  (RC-15)
 *
 * Status flow (survey_reviewers.status):
 *   PENDING → IN_PROGRESS → COMPLETED
 *
 * Assignment auto-sync after every reviewer COMPLETED:
 *   If ALL reviewers COMPLETED  → assignment.status = COMPLETED
 *   Else if SOME COMPLETED      → assignment.status = IN_PROGRESS
 *
 * NB: The service receives a resolved `reviewer` row from the route layer
 * (via `authenticateSurveyAccess` middleware) to avoid double-fetching.
 */

import { supabaseAdmin } from '../../config/supabase.js';
import {
  getReviewerWithContext,
  getResponsesByReviewer,
  upsertResponses,
  countResponsesByReviewer,
  deleteResponsesByReviewer,
  getCommentByReviewer,
  upsertComment,
  deleteCommentsByReviewer,
} from './responses.repository.js';
import {
  updateReviewerStatus,
  listReviewersByAssignment,
} from '../reviewers/reviewers.repository.js';

// ── Helpers ───────────────────────────────────────────────────

/**
 * Pull active questions for a question_set from the DB.
 */
async function getActiveQuestionsForSet(questionSet) {
  const { data, error } = await supabaseAdmin
    .from('questions')
    .select('question_id, question_text, category, order_number, competency_id, competencies(competency_name)')
    .eq('set_type', questionSet)
    .eq('is_active', true)
    .order('order_number', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

// ─────────────────────────────────────────────────────────────

/**
 * After a reviewer submits, sync the parent assignment's status.
 * Called internally — does NOT throw on failure (best-effort sync).
 */
async function _syncAssignmentStatus(assignmentId) {
  try {
    const reviewers = await listReviewersByAssignment(assignmentId);
    const total = reviewers.length;
    if (total === 0) return;

    const completedCount = reviewers.filter((r) => r.status === 'COMPLETED').length;

    let newStatus;
    if (completedCount === total) {
      newStatus = 'COMPLETED';
    } else if (completedCount > 0) {
      newStatus = 'IN_PROGRESS';
    } else {
      return; // No change needed
    }

    const { error } = await supabaseAdmin
      .from('survey_assignments')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('assignment_id', assignmentId);

    if (error) {
      console.error('[responses.service] _syncAssignmentStatus DB error:', error.message);
    }
  } catch (err) {
    // Non-fatal — log but don't surface to caller
    console.error('[responses.service] _syncAssignmentStatus error:', err.message);
  }
}

// ─────────────────────────────────────────────────────────────

/**
 * Verify the reviewer exists and retrieve a full reviewer row.
 * Throws 404 if not found.
 */
async function _requireReviewer(reviewerId) {
  const reviewer = await getReviewerWithContext(reviewerId);
  if (!reviewer) {
    const err = new Error('Reviewer not found.');
    err.statusCode = 404;
    throw err;
  }
  return reviewer;
}

// ─────────────────────────────────────────────────────────────

/**
 * Check that the reviewer belongs to an ACTIVE or CLOSING cycle.
 * Throws 403 if not.
 */
function _requireActiveCycle(reviewer) {
  const cycleStatus = reviewer.survey_assignments?.review_cycles?.status;
  if (!['ACTIVE', 'CLOSING'].includes(cycleStatus)) {
    const err = new Error('This survey is not currently open.');
    err.statusCode = 403;
    throw err;
  }
}

// ─────────────────────────────────────────────────────────────

/**
 * Check that the reviewer has not already COMPLETED the survey.
 * Throws 409 if already submitted.
 */
function _requireNotCompleted(reviewer) {
  if (reviewer.status === 'COMPLETED') {
    const err = new Error('This survey has already been submitted and cannot be modified.');
    err.statusCode = 409;
    throw err;
  }
}

// ── Services ──────────────────────────────────────────────────

/**
 * SS-01  GET survey form + existing draft responses.
 *
 * Returns:
 *   {
 *     reviewer: { ... },
 *     ratee: { employee_id, full_name, department, designation },
 *     questions: [ { question_id, question_text, competency_id, competency_name } ],
 *     existing_responses: [ { question_id, rating } ],
 *     existing_comment: string | null,
 *   }
 */
export async function getSurveyFormService(reviewerId) {
  const reviewer = await _requireReviewer(reviewerId);
  _requireActiveCycle(reviewer);

  const questions = await getActiveQuestionsForSet(reviewer.question_set);
  const existingResponses = await getResponsesByReviewer(reviewerId);
  const commentRow = await getCommentByReviewer(reviewerId);

  // Shape questions
  const shapedQuestions = questions.map((q) => ({
    question_id: q.question_id,
    question_text: q.question_text,
    category: q.category,
    order_number: q.order_number,
    competency_id: q.competency_id,
    competency_name: q.competencies?.competency_name ?? null,
  }));

  return {
    reviewer: {
      reviewer_id: reviewer.reviewer_id,
      reviewer_type: reviewer.reviewer_type,
      question_set: reviewer.question_set,
      status: reviewer.status,
    },
    ratee: {
      employee_id: reviewer.survey_assignments?.employees?.employee_id ?? null,
      full_name: reviewer.survey_assignments?.employees?.full_name ?? null,
      department: reviewer.survey_assignments?.employees?.department ?? null,
      designation: reviewer.survey_assignments?.employees?.designation ?? null,
    },
    cycle: {
      cycle_id: reviewer.survey_assignments?.review_cycles?.cycle_id ?? null,
      cycle_name: reviewer.survey_assignments?.review_cycles?.cycle_name ?? null,
    },
    questions: shapedQuestions,
    existing_responses: existingResponses.map(({ question_id, rating }) => ({ question_id, rating })),
    existing_comment: commentRow?.comment_text ?? null,
  };
}

// ─────────────────────────────────────────────────────────────

/**
 * SS-02  Save survey draft (partial responses are allowed).
 *
 * - Cycle must be ACTIVE
 * - Reviewer must NOT be COMPLETED
 * - Upserts responses + comment
 * - Advances reviewer status to IN_PROGRESS if still PENDING
 */
export async function saveSurveyDraftService(reviewerId, body) {
  const reviewer = await _requireReviewer(reviewerId);
  _requireActiveCycle(reviewer);
  _requireNotCompleted(reviewer);

  const { responses, comment } = body;

  await upsertResponses(reviewerId, responses);

  if (comment !== undefined) {
    await upsertComment(reviewerId, comment);
  }

  // Advance status PENDING → IN_PROGRESS
  if (reviewer.status === 'PENDING') {
    await updateReviewerStatus(reviewerId, { status: 'IN_PROGRESS' });
    await _syncAssignmentStatus(reviewer.survey_assignments.assignment_id);
  }

  return { message: 'Survey draft saved successfully.' };
}

// ─────────────────────────────────────────────────────────────

/**
 * SS-03  Submit survey (final submission).
 *
 * - Cycle must be ACTIVE
 * - Reviewer must NOT already be COMPLETED
 * - ALL active questions in the reviewer's question_set must be answered
 * - Sets reviewer status = COMPLETED + completed_at = NOW()
 * - Syncs parent assignment status
 */
export async function submitSurveyService(reviewerId, body) {
  const reviewer = await _requireReviewer(reviewerId);
  _requireActiveCycle(reviewer);
  _requireNotCompleted(reviewer);

  const { responses, comment } = body;

  // Completeness check
  const activeQuestions = await getActiveQuestionsForSet(reviewer.question_set);
  const requiredIds = new Set(activeQuestions.map((q) => q.question_id));
  const submittedIds = new Set(responses.map((r) => r.question_id));

  const missing = [...requiredIds].filter((id) => !submittedIds.has(id));
  if (missing.length > 0) {
    const err = new Error(
      `Survey is incomplete. ${missing.length} question(s) have not been answered.`
    );
    err.statusCode = 422;
    err.details = { missing_question_ids: missing };
    throw err;
  }

  // Persist
  await upsertResponses(reviewerId, responses);
  await upsertComment(reviewerId, comment ?? '');

  // Finalise reviewer
  await updateReviewerStatus(reviewerId, {
    status: 'COMPLETED',
    completed_at: new Date().toISOString(),
  });

  // Sync assignment
  await _syncAssignmentStatus(reviewer.survey_assignments.assignment_id);

  return { message: 'Survey submitted successfully.' };
}

// ─────────────────────────────────────────────────────────────

/**
 * RC-14  Admin submits survey on behalf of a reviewer.
 *
 * - CXO only (enforced at route level)
 * - Bypasses ACTIVE cycle guard (admin may need to close late surveys)
 * - Same completeness check applies
 */
export async function submitOnBehalfService(reviewerId, body) {
  const reviewer = await _requireReviewer(reviewerId);
  _requireNotCompleted(reviewer);

  const { responses, comment } = body;

  // Completeness check
  const activeQuestions = await getActiveQuestionsForSet(reviewer.question_set);
  const requiredIds = new Set(activeQuestions.map((q) => q.question_id));
  const submittedIds = new Set(responses.map((r) => r.question_id));
  const missing = [...requiredIds].filter((id) => !submittedIds.has(id));

  if (missing.length > 0) {
    const err = new Error(
      `Survey is incomplete. ${missing.length} question(s) have not been answered.`
    );
    err.statusCode = 422;
    err.details = { missing_question_ids: missing };
    throw err;
  }

  await upsertResponses(reviewerId, responses);
  await upsertComment(reviewerId, comment ?? '');

  await updateReviewerStatus(reviewerId, {
    status: 'COMPLETED',
    completed_at: new Date().toISOString(),
  });

  await _syncAssignmentStatus(reviewer.survey_assignments.assignment_id);

  return { message: `Survey submitted on behalf of reviewer ${reviewerId}.` };
}

// ─────────────────────────────────────────────────────────────

/**
 * RC-15  Admin reopens a completed survey.
 *
 * - CXO only (enforced at route level)
 * - Deletes all responses + comments
 * - Resets reviewer status to PENDING
 * - Resyncs assignment status
 */
export async function reopenSurveyService(reviewerId) {
  const reviewer = await _requireReviewer(reviewerId);

  if (reviewer.status !== 'COMPLETED') {
    const err = new Error('Only COMPLETED surveys can be reopened.');
    err.statusCode = 409;
    throw err;
  }

  await deleteResponsesByReviewer(reviewerId);
  await deleteCommentsByReviewer(reviewerId);

  await updateReviewerStatus(reviewerId, {
    status: 'PENDING',
    completed_at: null,
  });

  await _syncAssignmentStatus(reviewer.survey_assignments.assignment_id);

  return { message: `Survey for reviewer ${reviewerId} has been reopened.` };
}
