/**
 * modules/reviewers/reviewers.routes.js
 *
 *  GET  /pending              → list pending/in-progress surveys for the reviewer  (any auth)
 *  GET  /by-token/:token      → validate survey access token                       (public)
 *  GET  /:id                  → get a reviewer record                              (own or CXO)
 */

import { Router } from 'express';
import { authenticateSession } from '../../middleware/authenticateSession.js';
import {
  getPendingSurveys,
  getReviewer,
  getReviewerByToken,
} from './reviewers.controller.js';

const router = Router();

// Token-based route — no login required (reviewer may not have a session)
router.get('/by-token/:token', getReviewerByToken);

// Authenticated routes
router.use(authenticateSession);
router.get('/pending', getPendingSurveys);
router.get('/:id',     getReviewer);

export default router;
