/**
 * modules/auth/auth.controller.js
 *
 * Thin controller — delegates to authService, returns standardised response.
 * Zero business logic lives here.
 */

import * as authService from './auth.service.js';
import { sendSuccess, sendError } from '../../utils/response.js';

/**
 * GET /api/v1/auth/me
 *
 * Returns the full employee profile for the authenticated session.
 * The req.user context is already built by authenticateSession middleware,
 * but we fetch the full row here including all JSONB fields.
 */
export const getMe = async (req, res) => {
  const profile = await authService.getProfile(req.user.employeeId);
  return sendSuccess(res, profile, 'Profile retrieved successfully');
};

/**
 * POST /api/v1/auth/seed-admin
 *
 * Creates the first CXO user. Disabled once any CXO record exists.
 * Input is pre-validated by validate(seedAdminSchema) middleware.
 */
export const seedAdmin = async (req, res) => {
  const { email, password, fullName, employeeId } = req.body;
  const result = await authService.seedFirstAdmin({ email, password, fullName, employeeId });

  if (result.alreadyExists) {
    return sendError(
      res,
      'An admin account already exists. This endpoint is disabled after initial setup.',
      403
    );
  }

  return sendSuccess(
    res,
    { employeeId: result.employeeId, email },
    'Admin account created successfully. You can now sign in at POST /api/auth/sign-in/email',
    201
  );
};
