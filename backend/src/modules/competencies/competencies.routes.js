/**
 * modules/competencies/competencies.routes.js
 *
 *   GET    /                 → list competencies          (authenticated)
 *   GET    /:id              → get one competency          (authenticated)
 *   POST   /                 → create competency           (CXO only)
 *   PATCH  /:id              → update / deactivate         (CXO only)
 */

import { Router } from 'express';
import { authenticateSession } from '../../middleware/authenticateSession.js';
import { authorizeRoles } from '../../middleware/authorizeRoles.js';
import { validate } from '../../middleware/validate.js';
import {
  createCompetencySchema,
  updateCompetencySchema,
  listCompetenciesQuerySchema,
} from './competencies.validator.js';
import {
  listCompetencies,
  getCompetency,
  createCompetency,
  updateCompetency,
} from './competencies.controller.js';

const router = Router();

router.use(authenticateSession);

// Read — any authenticated user
router.get('/', validate(listCompetenciesQuerySchema, 'query'), listCompetencies);
router.get('/:id', getCompetency);

// Write — CXO only
router.post('/',    authorizeRoles('CXO'), validate(createCompetencySchema), createCompetency);
router.patch('/:id', authorizeRoles('CXO'), validate(updateCompetencySchema), updateCompetency);

export default router;
