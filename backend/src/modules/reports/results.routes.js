/**
 * modules/reports/results.routes.js
 *
 * Mounts at /api/v1/results
 *
 * Routes:
 *   GET /employee/:employeeId/cycle/:cycleId            Full dashboard (own | TM/HOD/CXO)
 *   GET /employee/:employeeId/cycle/:cycleId/comments   Anonymised comments
 *   GET /team/cycle/:cycleId                            TM team overview
 *   GET /department/cycle/:cycleId                      HOD dept overview
 *   GET /org/cycle/:cycleId                             CXO org overview
 */

import { Router } from 'express';
import { authenticateSession } from '../../middleware/authenticateSession.js';
import { authorizeRoles } from '../../middleware/authorizeRoles.js';
import {
  getEmployeeDashboard,
  getEmployeeComments,
  getTeamDashboard,
  getDepartmentDashboard,
  getOrgDashboard,
} from './results.controller.js';

const router = Router();

// All routes require a valid session
router.use(authenticateSession);

// Static paths BEFORE parameterised to avoid Express capture

// GET /results/team/cycle/:cycleId  — TM own team (TM/HOD/CXO)
router.get('/team/cycle/:cycleId', authorizeRoles('TM', 'HOD', 'CXO'), getTeamDashboard);

// GET /results/department/cycle/:cycleId  — HOD dept (HOD/CXO)
router.get('/department/cycle/:cycleId', authorizeRoles('HOD', 'CXO'), getDepartmentDashboard);

// GET /results/org/cycle/:cycleId  — CXO org summary
router.get('/org/cycle/:cycleId', authorizeRoles('CXO'), getOrgDashboard);

// GET /results/employee/:employeeId/cycle/:cycleId  — own or TM/HOD/CXO
router.get(
  '/employee/:employeeId/cycle/:cycleId',
  (req, res, next) => {
    if (req.user.employeeId === req.params.employeeId) return next();
    return authorizeRoles('TM', 'HOD', 'CXO')(req, res, next);
  },
  getEmployeeDashboard
);

// GET /results/employee/:employeeId/cycle/:cycleId/comments
router.get(
  '/employee/:employeeId/cycle/:cycleId/comments',
  (req, res, next) => {
    if (req.user.employeeId === req.params.employeeId) return next();
    return authorizeRoles('TM', 'HOD', 'CXO')(req, res, next);
  },
  getEmployeeComments
);

export default router;
