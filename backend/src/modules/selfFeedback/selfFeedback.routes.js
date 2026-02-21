/**
 * modules/selfFeedback/selfFeedback.routes.js
 *
 *   GET  /:cycleId              → get own self-feedback + form data  (any authenticated)
 *   POST /:cycleId              → save draft                          (any authenticated)
 *   POST /:cycleId/submit       → final submission (one-time lock)    (any authenticated)
 *   GET  /:cycleId/completion   → completion status for all employees (CXO only)
 *
 * Note: "/:cycleId/completion" is declared BEFORE "/:cycleId/submit" to
 * avoid Express treating "completion" as a :cycleId value.
 */

import { Router } from 'express';
import { authenticateSession } from '../../middleware/authenticateSession.js';
import { authorizeRoles }      from '../../middleware/authorizeRoles.js';
import { validate }            from '../../middleware/validate.js';
import { saveSelfFeedbackSchema } from './selfFeedback.validator.js';
import {
  getSelfFeedback,
  saveSelfFeedback,
  submitSelfFeedback,
  getCompletionStatus,
} from './selfFeedback.controller.js';

const router = Router();

router.use(authenticateSession);

// Admin — completion status (declare before /:cycleId/submit to avoid param capture)
router.get('/:cycleId/completion', authorizeRoles('CXO'), getCompletionStatus);

// Employee — get their own record + applicable competency list
router.get('/:cycleId', getSelfFeedback);

// Employee — save draft
router.post('/:cycleId', validate(saveSelfFeedbackSchema), saveSelfFeedback);

// Employee — final submit (body is same schema as save)
router.post('/:cycleId/submit', validate(saveSelfFeedbackSchema), submitSelfFeedback);

export default router;
