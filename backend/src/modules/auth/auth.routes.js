/**
 * modules/auth/auth.routes.js
 *
 * Custom auth routes that complement better-auth's built-in endpoints.
 *
 * better-auth handles (at /api/auth/**):
 *   POST /api/auth/sign-in/email     → login with email + password
 *   POST /api/auth/sign-out          → logout + invalidate session
 *   GET  /api/auth/session           → get current session info
 *   POST /api/auth/change-password   → change password
 *
 * Custom helpers (at /api/v1/auth/**):
 *   GET  /api/v1/auth/me             → full employee profile for current session
 *   POST /api/v1/auth/seed-admin     → one-time first CXO account creation
 */

import { Router } from 'express';
import { asyncWrapper } from '../../utils/asyncWrapper.js';
import { authenticateSession } from '../../middleware/authenticateSession.js';
import { validate } from '../../middleware/validate.js';
import { seedAdminSchema } from './auth.validator.js';
import * as authController from './auth.controller.js';

const router = Router();

/**
 * GET /api/v1/auth/me
 * Returns the full employee profile + role for the currently logged-in user.
 * Protected — requires a valid better-auth session.
 */
router.get('/me', authenticateSession, asyncWrapper(authController.getMe));

/**
 * POST /api/v1/auth/seed-admin
 * One-time endpoint to create the very first CXO admin during platform setup.
 * Automatically locks itself once any CXO employee exists.
 *
 * Body: { employeeId, fullName, email, password }
 */
router.post(
  '/seed-admin',
  validate(seedAdminSchema),
  asyncWrapper(authController.seedAdmin)
);

export default router;
