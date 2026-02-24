/**
 * modules/reviewers/reviewers.service.js
 *
 * Business logic for reviewer-facing endpoints:
 *  SC-01  Reviewer sees list of assigned surveys on login.
 *  SC-02  Survey list shows employee name, designation, department, deadline.
 */

import {
  listPendingSurveysForReviewer,
  getReviewerById,
  getReviewerByAccessToken,
} from './reviewers.repository.js';

// ─────────────────────────────────────────────────────────────

/**
 * Get all PENDING or IN_PROGRESS surveys assigned to the current reviewer.
 * Only returns surveys where the cycle is ACTIVE.
 */
export async function getPendingSurveysService(reviewerEmployeeId) {
  const rows = await listPendingSurveysForReviewer(reviewerEmployeeId);

  // Shape the response for the survey list view (SC-02)
  return rows.map((r) => {
    const assignment = r.survey_assignments;
    const cycle = assignment?.review_cycles;
    const ratee = assignment?.employees;

    return {
      reviewer_id: r.reviewer_id,
      access_token: r.access_token,
      reviewer_type: r.reviewer_type,
      question_set: r.question_set,
      status: r.status,
      // Ratee info (SC-02)
      employee_id: ratee?.employee_id,
      employee_name: ratee?.full_name,
      employee_department: ratee?.department,
      employee_designation: ratee?.designation,
      // Cycle / deadline (SC-13)
      cycle_id: cycle?.cycle_id,
      cycle_name: cycle?.cycle_name,
      end_date: cycle?.end_date,
      cycle_status: cycle?.status,
      // Assignment context
      assignment_id: assignment?.assignment_id,
    };
  });
}

// ─────────────────────────────────────────────────────────────

/**
 * Get reviewer detail by reviewer_id — for authenticated reviewers.
 */
export async function getReviewerService(reviewerId, requestingUser) {
  const reviewer = await getReviewerById(reviewerId);
  if (!reviewer) {
    const err = new Error(`Reviewer record "${reviewerId}" not found.`);
    err.status = 404;
    throw err;
  }

  // Reviewer may only view their own record (unless CXO)
  if (
    requestingUser.group_name !== 'CXO' &&
    reviewer.reviewer_employee_id !== requestingUser.employeeId
  ) {
    const err = new Error('You do not have access to this reviewer record.');
    err.status = 403;
    throw err;
  }

  return reviewer;

}

// ─────────────────────────────────────────────────────────────

/**
 * Validate an access_token and return reviewer + assignment context.
 * Used by the survey response module (token-based, no login required).
 */
export async function getReviewerByTokenService(token) {
  const reviewer = await getReviewerByAccessToken(token);
  if (!reviewer) {
    const err = new Error('Invalid or expired survey access token.');
    err.status = 401;
    throw err;
  }
  return reviewer;
}
