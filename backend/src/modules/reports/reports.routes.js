/**
 * modules/reports/reports.routes.js
 *
 * Mounts at /api/v1/reports
 * All endpoints are CXO-only (admin).
 *
 * Routes:
 *   GET /individual/:employeeId/cycle/:cycleId   RPT-01/02/03  Individual PDF
 *   GET /department/cycle/:cycleId               RPT-04  Department PDF  (?department=)
 *   GET /org/cycle/:cycleId                      RPT-05  Org summary PDF
 *   GET /export/cycle/:cycleId                   RPT-06  Raw CSV export
 */

import { Router } from 'express';
import { authenticateSession } from '../../middleware/authenticateSession.js';
import { authorizeRoles } from '../../middleware/authorizeRoles.js';
import {
  generateIndividualPdf,
  generateDepartmentPdf,
  generateOrgPdf,
  exportCsv,
} from './reports.controller.js';

const router = Router();

// All report generation endpoints require CXO role
router.use(authenticateSession, authorizeRoles('CXO'));

// Static paths before parameterised
router.get('/department/cycle/:cycleId', generateDepartmentPdf);
router.get('/org/cycle/:cycleId', generateOrgPdf);
router.get('/export/cycle/:cycleId', exportCsv);
router.get('/individual/:employeeId/cycle/:cycleId', generateIndividualPdf);

export default router;
