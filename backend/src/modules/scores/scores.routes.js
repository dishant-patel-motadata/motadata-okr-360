/**
 * modules/scores/scores.routes.js
 *
 * Mounts at /api/v1/scores
 *
 * Routes:
 *   GET  /my                                         Own historical scores
 *   GET  /cycle/:cycleId                             All scores for a cycle     (CXO)
 *   GET  /cycle/:cycleId/department                  Dept scores               (CXO/HOD)
 *   GET  /employee/:employeeId/cycle/:cycleId        One employee's scorecard   (own | TM | CXO)
 *   GET  /employee/:employeeId/cycle/:cycleId/comparison  Self vs dept          (own | CXO)
 *   POST /cycle/:cycleId/recalculate                 Force recalculate          (CXO)
 */

import { Router } from 'express';
import { authenticateSession } from '../../middleware/authenticateSession.js';
import { authorizeRoles } from '../../middleware/authorizeRoles.js';
import {
  getMyScores,
  getEmployeeScore,
  getCycleScores,
  getDepartmentComparison,
  recalculateCycleScores,
} from './scores.controller.js';

const router = Router();

// All routes require a valid session
router.use(authenticateSession);

// GET /scores/my  — own historical scores (any authenticated user)
router.get('/my', getMyScores);

// GET /scores/cycle/:cycleId  — full cycle scoreboard (CXO only)
router.get('/cycle/:cycleId', authorizeRoles('CXO'), getCycleScores);

// POST /scores/cycle/:cycleId/recalculate  — force recalc (CXO only)
// Declared before /:cycleId param routes to prevent Express capture
router.post('/cycle/:cycleId/recalculate', authorizeRoles('CXO'), recalculateCycleScores);

// GET /scores/employee/:employeeId/cycle/:cycleId  — one employee's scorecard
// Own record: any authenticated employee
// Other employee: TM / HOD / CXO
router.get(
  '/employee/:employeeId/cycle/:cycleId',
  (req, res, next) => {
    // Allow own access; otherwise require TM+
    if (req.user.employeeId === req.params.employeeId) return next();
    return authorizeRoles('TM', 'HOD', 'CXO')(req, res, next);
  },
  getEmployeeScore
);

// GET /scores/employee/:employeeId/cycle/:cycleId/comparison
router.get(
  '/employee/:employeeId/cycle/:cycleId/comparison',
  (req, res, next) => {
    if (req.user.employeeId === req.params.employeeId) return next();
    return authorizeRoles('TM', 'HOD', 'CXO')(req, res, next);
  },
  getDepartmentComparison
);

export default router;
