/**
 * modules/auth/auth.service.js
 *
 * Business logic for auth-adjacent operations.
 * Session management is delegated entirely to better-auth.
 */

import { supabaseAdmin } from '../../config/supabase.js';
import { auth } from '../../config/auth.js';
import { logger } from '../../utils/logger.js';

/**
 * Returns the full employee profile for the dashboard "me" endpoint.
 * Fetches from the employees table using the employeeId from the session.
 *
 * @param {string} employeeId
 * @returns {Promise<object>}
 */
export const getProfile = async (employeeId) => {
  const { data, error } = await supabaseAdmin
    .from('employees')
    .select(
      `employee_id,
       full_name,
       email,
       department,
       designation,
       reporting_manager_id,
       date_of_joining,
       group_name,
       cross_functional_groups,
       applicable_competencies,
       is_active,
       synced_at,
       created_at`
    )
    .eq('employee_id', employeeId)
    .single();

  if (error || !data) {
    const err = new Error('Employee profile not found.');
    err.statusCode = 404;
    throw err;
  }

  return data;
};

/**
 * Seeds the first CXO admin account.
 *
 * Steps:
 *   1. Check if any CXO employee already exists — if so, block.
 *   2. Create the user in better-auth (handles password hashing).
 *   3. Upsert the employee row with group_name = 'CXO'.
 *      The better-auth user.id is set as the employee_id so the
 *      authenticateSession middleware can join the two records.
 *
 * @param {{ email: string, password: string, fullName: string, employeeId: string }}
 * @returns {Promise<{ alreadyExists: boolean, employeeId?: string }>}
 */
export const seedFirstAdmin = async ({ email, password, fullName, employeeId }) => {
  // ── 1. Check if CXO already exists ───────────────────────
  const { data: existing } = await supabaseAdmin
    .from('employees')
    .select('employee_id')
    .eq('group_name', 'CXO')
    .limit(1)
    .single();

  if (existing) {
    return { alreadyExists: true };
  }

  // ── 2. Create better-auth user ────────────────────────────
  // better-auth createUser API: creates user + hashes password
  const authUser = await auth.api.signUpEmail({
    body: {
      email,
      password,
      name: fullName,
    },
  });

  if (!authUser || !authUser.user) {
    const err = new Error('Failed to create auth account.');
    err.statusCode = 500;
    throw err;
  }

  // ── 3. Upsert employee record ─────────────────────────────
  //
  // The employee row uses the caller-supplied employeeId (e.g. 'EMP001')
  // as the PK.  The session middleware links the two records by email,
  // so the better-auth user.id does NOT need to match employee_id.
  const { error: empError } = await supabaseAdmin.from('employees').upsert(
    {
      employee_id: employeeId,
      full_name: fullName,
      email,
      department: 'Executive',
      designation: 'HR Admin / CXO',
      reporting_manager_id: null,
      date_of_joining: new Date().toISOString().split('T')[0],
      group_name: 'CXO',
      is_active: true,
      synced_at: new Date().toISOString(),
    },
    { onConflict: 'employee_id' }
  );

  if (empError) {
    logger.error('Failed to create employee record for seed admin', { error: empError.message });
    const err = new Error('Auth account created but employee record failed. Contact DBA.');
    err.statusCode = 500;
    throw err;
  }

  logger.info('Seed admin account created', { employeeId, email });
  return { alreadyExists: false, employeeId };
};
