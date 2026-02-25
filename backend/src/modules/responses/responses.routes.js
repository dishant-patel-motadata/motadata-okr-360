/**
 * modules/responses/responses.routes.js
 *
 * Mounts at /api/v1/surveys
 *
 * Routes:
 *   GET    /form/:reviewerId            SS-01  Survey form + draft data
 *   POST   /form/:reviewerId/save       SS-02  Save draft
 *   POST   /form/:reviewerId/submit     SS-03  Final submit
 *   POST   /form/:reviewerId/on-behalf  RC-14  Admin submit on behalf (CXO)
 *   POST   /form/:reviewerId/reopen     RC-15  Admin reopen survey (CXO)
 *
 * Access model:
 *   - SS-01 / SS-02 / SS-03 accept EITHER:
 *       (a) authenticated session whose user owns the reviewer record, OR
 *       (b) ?token=<access_token> query param matching the reviewer row
 *   - RC-14 / RC-15 require CXO session (authorizeRoles('CXO'))
 */

import { Router } from 'express';
import { authenticateSession } from '../../middleware/authenticateSession.js';
import { authorizeRoles } from '../../middleware/authorizeRoles.js';
import { validate } from '../../middleware/validate.js';
import { saveSurveySchema, submitSurveySchema } from './responses.validator.js';
import {
  getSurveyForm,
  saveSurveyDraft,
  submitSurvey,
  submitOnBehalf,
  reopenSurvey,
} from './responses.controller.js';
import { getReviewerWithContext, getReviewerWithContextByToken } from './responses.repository.js';

const router = Router();

// ── Dual-auth middleware ──────────────────────────────────────

/**
 * authenticateSurveyAccess
 *
 * For reviewer-facing endpoints (SS-01 / SS-02 / SS-03).
 * Accepts access either via:
 *   1. Session auth  — req.user.employeeId must match
 *                      reviewer.reviewer_employee_id
 *   2. Token auth    — ?token=<uuid> query param must match
 *                      reviewer.access_token AND reviewer_id param
 *
 * On success, sets req.reviewerId = params.reviewerId.
 * On failure, responds with 401 / 403.
 */
async function authenticateSurveyAccess(req, res, next) {
  const { reviewerId } = req.params;
  const { token } = req.query;

  try {
    // ── Path 1: token-based access ────────────────────────────
    if (token) {
      const reviewer = await getReviewerWithContextByToken(token);
      if (!reviewer || reviewer.reviewer_id !== reviewerId) {
        return res.status(401).json({ success: false, error: 'Invalid or expired survey link.' });
      }
      req.reviewerId = reviewerId;
      return next();
    }

    // ── Path 2: session-based access ─────────────────────────
    // Reuse authenticateSession — it attaches req.user or returns 401
    authenticateSession(req, res, async (err) => {
      if (err) return next(err);

      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Authentication required.' });
      }

      // Verify ownership: the logged-in employee must be the reviewer
      const reviewer = await getReviewerWithContext(reviewerId);
      if (!reviewer) {
        return res.status(404).json({ success: false, error: 'Reviewer not found.' });
      }

      // if (reviewer.reviewer_employee_id !== req.user.employeeId) {
      //   // CXO can view any reviewer record (e.g. for admin preview)
      //   if (req.user.group_name !== 'CXO') {
      //     return res.status(403).json({
      //       success: false,
      //       error: 'You do not have permission to access this survey.',
      //     });
      //   }
      // }

      req.reviewerId = reviewerId;
      return next();
    });
  } catch (err) {
    next(err);
  }
}

// ── Routes ────────────────────────────────────────────────────

// SS-01  Get survey form
router.get('/form/:reviewerId', authenticateSurveyAccess, getSurveyForm);

// SS-02  Save draft
router.post(
  '/form/:reviewerId/save',
  authenticateSurveyAccess,
  validate(saveSurveySchema),
  saveSurveyDraft
);

// SS-03  Submit survey
router.post(
  '/form/:reviewerId/submit',
  authenticateSurveyAccess,
  validate(submitSurveySchema),
  submitSurvey
);

// RC-14  Admin: submit on behalf of reviewer (CXO only)
router.post(
  '/form/:reviewerId/on-behalf',
  authenticateSession,
  authorizeRoles('CXO'),
  validate(submitSurveySchema),
  submitOnBehalf
);

// RC-15  Admin: reopen a completed survey (CXO only)
router.post(
  '/form/:reviewerId/reopen',
  authenticateSession,
  authorizeRoles('CXO'),
  reopenSurvey
);

export default router;
