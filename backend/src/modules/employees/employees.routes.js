/**
 * modules/employees/employees.routes.js
 *
 * Route map:
 *   GET    /                → list all employees       (CXO only)
 *   GET    /sync/logs       → AD sync log history      (CXO only)
 *   POST   /sync            → trigger manual AD sync   (CXO only)
 *   GET    /:id             → get one employee         (self OR CXO)
 *   PATCH  /:id             → update managed fields    (CXO only)
 */

import { Router } from 'express';
import { authenticateSession } from '../../middleware/authenticateSession.js';
import { authorizeRoles } from '../../middleware/authorizeRoles.js';
import { validate } from '../../middleware/validate.js';
import { updateEmployeeSchema, listEmployeesQuerySchema } from './employees.validator.js';
import {
  listEmployees,
  getEmployee,
  updateEmployee,
  syncEmployees,
  getSyncLogs,
} from './employees.controller.js';

const router = Router();

// All employee routes require authentication
router.use(authenticateSession);

// ── AD Sync (must be before /:id to avoid param capture) ──
router.get('/sync/logs', authorizeRoles('CXO'), getSyncLogs);
router.post('/sync', authorizeRoles('CXO'), syncEmployees);

// ── Employee CRUD ─────────────────────────────────────────
router.get('/', authorizeRoles('CXO'), validate(listEmployeesQuerySchema, 'query'), listEmployees);
router.get('/:id', getEmployee);  // CXO or self; access enforced in service
router.patch('/:id', authorizeRoles('CXO'), validate(updateEmployeeSchema), updateEmployee);

export default router;
