/**
 * modules/cycles/cycles.routes.js
 *
 * Route map (all require CXO for mutations):
 *   GET    /                 → list cycles               (CXO)
 *   POST   /                 → create cycle              (CXO)
 *   GET    /:id              → get cycle detail          (CXO)
 *   PATCH  /:id              → update DRAFT cycle        (CXO)
 *   DELETE /:id              → delete DRAFT cycle        (CXO)
 *   POST   /:id/activate     → DRAFT → ACTIVE            (CXO)
 *   POST   /:id/publish      → COMPLETED → PUBLISHED     (CXO)
 */

import { Router } from 'express';
import { authenticateSession } from '../../middleware/authenticateSession.js';
import { authorizeRoles } from '../../middleware/authorizeRoles.js';
import { validate } from '../../middleware/validate.js';
import {
  createCycleSchema,
  updateCycleSchema,
  listCyclesQuerySchema,
} from './cycles.validator.js';
import {
  listCycles,
  getCycle,
  createCycle,
  updateCycle,
  deleteCycle,
  activateCycle,
  publishCycle,
} from './cycles.controller.js';

const router = Router();

// Read endpoints: any authenticated user can list / view cycles
router.get('/',    authenticateSession, validate(listCyclesQuerySchema, 'query'), listCycles);
router.get('/:id', authenticateSession, getCycle);

// Write endpoints: CXO only
router.post('/',   authenticateSession, authorizeRoles('CXO'), validate(createCycleSchema), createCycle);
router.patch('/:id',  authenticateSession, authorizeRoles('CXO'), validate(updateCycleSchema), updateCycle);
router.delete('/:id', authenticateSession, authorizeRoles('CXO'), deleteCycle);

// State transitions: CXO only
router.post('/:id/activate', authenticateSession, authorizeRoles('CXO'), activateCycle);
router.post('/:id/publish',  authenticateSession, authorizeRoles('CXO'), publishCycle);

export default router;
