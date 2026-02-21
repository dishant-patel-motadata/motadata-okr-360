/**
 * modules/reviewers/reviewers.controller.js
 */

import {
  getPendingSurveysService,
  getReviewerService,
  getReviewerByTokenService,
} from './reviewers.service.js';
import { asyncWrapper } from '../../utils/asyncWrapper.js';
import { sendSuccess }  from '../../utils/response.js';

// ── GET /reviewers/pending  ───────────────────────────────────
// Returns all PENDING/IN_PROGRESS surveys for the logged-in reviewer.
export const getPendingSurveys = asyncWrapper(async (req, res) => {
  const surveys = await getPendingSurveysService(req.user.employeeId);
  return sendSuccess(res, surveys, 'Pending surveys retrieved.');
});

// ── GET /reviewers/:id  ───────────────────────────────────────
// Returns a single reviewer record.
export const getReviewer = asyncWrapper(async (req, res) => {
  const reviewer = await getReviewerService(req.params.id, req.user);
  return sendSuccess(res, reviewer, 'Reviewer retrieved.');
});

// ── GET /reviewers/by-token/:token  ──────────────────────────
// Token-based access for survey links (no login required at router level,
// but this validates the token before the response module uses it).
export const getReviewerByToken = asyncWrapper(async (req, res) => {
  const reviewer = await getReviewerByTokenService(req.params.token);
  return sendSuccess(res, reviewer, 'Survey access token validated.');
});
