/**
 * middleware/authorizeRoles.js
 *
 * RBAC guard middleware — restricts route access to specific
 * employee group_name values.
 *
 * Must run AFTER authenticateSession (requires req.user).
 *
 * Role hierarchy (for reference):
 *   CXO  → full system access
 *   HOD  → department-level access
 *   TM   → team-level access
 *   IC   → self-only access
 *
 * Usage in routes:
 *   // Single role
 *   router.post('/cycles', authenticateSession, authorizeRoles('CXO'), handler);
 *
 *   // Multiple roles
 *   router.get('/results/team', authenticateSession, authorizeRoles('TM', 'HOD', 'CXO'), handler);
 *
 * @param {...string} allowedRoles - list of group_name values that may access the route
 * @returns {import('express').RequestHandler}
 */

import { sendError } from '../utils/response.js';
import { logger } from '../utils/logger.js';

export const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    // Ensure authenticateSession ran first
    if (!req.user) {
      return sendError(res, 'Authentication required.', 401);
    }

    const { group_name, employeeId } = req.user;

    if (!allowedRoles.includes(group_name)) {
      logger.warn('Unauthorized role access attempt', {
        employeeId,
        group_name,
        requiredRoles: allowedRoles,
        path: req.path,
        method: req.method,
      });
      return sendError(
        res,
        `Access denied. This action requires one of: [${allowedRoles.join(', ')}].`,
        403
      );
    }

    return next();
  };
};
