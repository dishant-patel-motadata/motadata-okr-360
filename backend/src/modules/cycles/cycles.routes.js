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

// All cycle routes require authentication + CXO role
router.use(authenticateSession, authorizeRoles('CXO'));

router.get('/',    validate(listCyclesQuerySchema, 'query'), listCycles);
router.post('/',   validate(createCycleSchema), createCycle);
router.get('/:id',    getCycle);
router.patch('/:id',  validate(updateCycleSchema), updateCycle);
router.delete('/:id', deleteCycle);

// State transitions
router.post('/:id/activate', activateCycle);
router.post('/:id/publish',  publishCycle);

export default router;
