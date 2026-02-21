/**
 * middleware/authenticateSession.js
 *
 * Verifies the better-auth session on every protected request.
 *
 * Flow:
 *   1. Call auth.api.getSession() with incoming request headers
 *   2. If no valid session → 401 Unauthorized
 *   3. Fetch the employee record linked to the session user id
 *      (better-auth user.id maps to employees.employee_id)
 *   4. If employee not found or is_active = false → 403 Forbidden
 *   5. Attach req.user to the request for downstream use
 *
 * req.user shape:
 * {
 *   userId     : string  — better-auth user.id
 *   employeeId : string  — employees.employee_id
 *   email      : string
 *   group_name : 'IC' | 'TM' | 'HOD' | 'CXO'
 *   isActive   : boolean
 * }
 *
 * Routes that bypass this middleware:
 *   - /api/auth/**                      (better-auth handles these)
 *   - GET /api/v1/survey/token/:token  (anonymous reviewer access)
 */

import { auth } from '../config/auth.js';
import { supabaseAdmin } from '../config/supabase.js';
import { sendError } from '../utils/response.js';
import { logger } from '../utils/logger.js';

export const authenticateSession = async (req, res, next) => {
  try {
    // ── 1. Verify session via better-auth ─────────────────
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    if (!session || !session.user) {
      return sendError(res, 'Authentication required. Please log in.', 401);
    }

    // ── 2. Fetch linked employee record by email ─────────
    //
    // We join on email (not user.id) so that AD-synced employees
    // can log in without needing their better-auth UUID pre-loaded
    // into the employees table.  Email is the natural stable key
    // shared between the AD record and the better-auth account.
    const { data: employee, error } = await supabaseAdmin
      .from('employees')
      .select('employee_id, email, full_name, group_name, department, designation, is_active')
      .eq('email', session.user.email)
      .single();

    if (error || !employee) {
      logger.warn('Session user has no linked employee record', {
        userId: session.user.id,
        email: session.user.email,
      });
      return sendError(
        res,
        'Your account is not registered as an employee. Contact HR admin.',
        403
      );
    }

    // ── 3. Check active status ─────────────────────────────
    if (!employee.is_active) {
      logger.warn('Inactive employee attempted to access API', {
        employeeId: employee.employee_id,
      });
      return sendError(res, 'Your account has been deactivated. Contact HR admin.', 403);
    }

    // ── 4. Attach user context to request ─────────────────
    req.user = {
      userId: session.user.id,
      employeeId: employee.employee_id,
      email: employee.email,
      fullName: employee.full_name,
      group_name: employee.group_name,   // 'IC' | 'TM' | 'HOD' | 'CXO'
      department: employee.department,
      designation: employee.designation,
      isActive: employee.is_active,
    };

    return next();
  } catch (err) {
    logger.error('authenticateSession error', { error: err.message });
    return sendError(res, 'Authentication failed. Please log in again.', 401);
  }
};
