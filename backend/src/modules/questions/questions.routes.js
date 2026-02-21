/**
 * modules/questions/questions.routes.js
 *
 *   GET    /                 → list questions             (authenticated)
 *   GET    /:id              → get one question           (authenticated)
 *   POST   /                 → create question            (CXO only)
 *   PATCH  /:id              → update / deactivate        (CXO only)
 *   POST   /import/csv       → bulk import via CSV upload (CXO only)
 */

import { Router } from 'express';
import multer from 'multer';
import { authenticateSession } from '../../middleware/authenticateSession.js';
import { authorizeRoles } from '../../middleware/authorizeRoles.js';
import { validate } from '../../middleware/validate.js';
import {
  createQuestionSchema,
  updateQuestionSchema,
  listQuestionsQuerySchema,
} from './questions.validator.js';
import {
  listQuestions,
  getQuestion,
  createQuestion,
  updateQuestion,
  importQuestionsCsv,
} from './questions.controller.js';

const router = Router();

// Memory storage for CSV upload (max 1 MB)
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 1_048_576 } });

router.use(authenticateSession);

// Read — any authenticated user
router.get('/', validate(listQuestionsQuerySchema, 'query'), listQuestions);
router.get('/:id', getQuestion);

// Write — CXO only
router.post('/import/csv', authorizeRoles('CXO'), upload.single('file'), importQuestionsCsv);
router.post('/',    authorizeRoles('CXO'), validate(createQuestionSchema), createQuestion);
router.patch('/:id', authorizeRoles('CXO'), validate(updateQuestionSchema), updateQuestion);

export default router;
