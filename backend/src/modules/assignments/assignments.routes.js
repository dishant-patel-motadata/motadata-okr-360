/**
 * modules/assignments/assignments.routes.js
 *
 *  GET    /status                     → completion overview per employee  (CXO)
 *  GET    /                           → list assignments for a cycle       (CXO)
 *  POST   /                           → create one assignment              (CXO)
 *  POST   /bulk-csv                   → bulk assign via CSV upload         (CXO)
 *  POST   /reviewers                  → add a reviewer to an assignment   (CXO)
 *  DELETE /reviewers/:reviewerId      → remove a reviewer                  (CXO)
 *  GET    /:id                        → get assignment + reviewer list     (CXO)
 *  DELETE /:id                        → rollback / delete assignment       (CXO)
 *  GET    /:id/suggestions            → auto-suggest reviewers             (CXO)
 */

import { Router } from 'express';
import { authenticateSession } from '../../middleware/authenticateSession.js';
import { authorizeRoles }      from '../../middleware/authorizeRoles.js';
import { validate }            from '../../middleware/validate.js';
import {
  createAssignmentSchema,
  listAssignmentsQuerySchema,
  addReviewerSchema,
} from './assignments.validator.js';
import {
  listAssignments,
  getAssignmentStatus,
  getAssignment,
  createAssignment,
  deleteAssignment,
  suggestReviewers,
  bulkCsvAssign,
  addReviewer,
  removeReviewer,
  csvUpload,
} from './assignments.controller.js';

const router = Router();

// All assignment routes are CXO-only
router.use(authenticateSession, authorizeRoles('CXO'));

// ── Static paths first (before /:id to avoid param capture) ──
router.get('/status',                               getAssignmentStatus);
router.post('/bulk-csv', csvUpload.single('file'),  bulkCsvAssign);
router.post('/reviewers', validate(addReviewerSchema), addReviewer);
router.delete('/reviewers/:reviewerId',             removeReviewer);

// ── Collection + item ─────────────────────────────────────────
router.get('/',    validate(listAssignmentsQuerySchema, 'query'), listAssignments);
router.post('/',   validate(createAssignmentSchema),              createAssignment);
router.get('/:id',                                                getAssignment);
router.delete('/:id',                                             deleteAssignment);
router.get('/:id/suggestions',                                    suggestReviewers);

export default router;
