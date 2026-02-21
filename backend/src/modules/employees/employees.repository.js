/**
 * modules/employees/employees.repository.js
 *
 * All database access for the employees module.
 * Uses supabaseAdmin (service-role key) so RLS is bypassed.
 *
 * Convention:
 *  - Every function returns plain JS objects (no SDK wrappers).
 *  - Throws on unexpected DB errors; callers may catch and re-throw
 *    with domain-specific error messages.
 */

import { supabaseAdmin } from '../../config/supabase.js';

// ── Employees ──────────────────────────────────────────────

/**
 * Paginated, filtered employee list.
 * @param {{ page:number, limit:number, department?:string, group_name?:string, is_active?:string, search?:string }} opts
 * @returns {{ employees: object[], total: number }}
 */
export async function listEmployees({ page, limit, department, group_name, is_active, search }) {
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabaseAdmin
    .from('employees')
    .select(
      'employee_id, full_name, email, department, designation, reporting_manager_id,' +
        ' group_name, cross_functional_groups, applicable_competencies, is_active,' +
        ' date_of_joining, synced_at, created_at, updated_at',
      { count: 'exact' }
    )
    .order('full_name', { ascending: true })
    .range(from, to);

  if (department) query = query.eq('department', department);
  if (group_name) query = query.eq('group_name', group_name);
  if (is_active !== undefined) query = query.eq('is_active', is_active === 'true');
  if (search) {
    query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
  }

  const { data, error, count } = await query;
  if (error) throw error;
  return { employees: data ?? [], total: count ?? 0 };
}

/**
 * Fetch a single employee by their employee_id (PK).
 * @param {string} employeeId
 * @returns {object|null}
 */
export async function getEmployeeById(employeeId) {
  const { data, error } = await supabaseAdmin
    .from('employees')
    .select('*')
    .eq('employee_id', employeeId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // row not found
    throw error;
  }
  return data;
}

/**
 * Fetch a single employee by email address.
 * Used by auth middleware and seed script.
 * @param {string} email
 * @returns {object|null}
 */
export async function getEmployeeByEmail(email) {
  const { data, error } = await supabaseAdmin
    .from('employees')
    .select('*')
    .eq('email', email)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data;
}

/**
 * Update only CXO-managed fields on an employee record.
 * AD-sourced fields (full_name, email, department, etc.) are blocked here.
 * @param {string} employeeId
 * @param {{ group_name?:string, cross_functional_groups?:any, applicable_competencies?:any }} updates
 * @returns {object} updated employee
 */
export async function updateEmployee(employeeId, updates) {
  const allowed = {};
  if (updates.group_name !== undefined) allowed.group_name = updates.group_name;
  if (updates.cross_functional_groups !== undefined)
    allowed.cross_functional_groups = updates.cross_functional_groups;
  if (updates.applicable_competencies !== undefined)
    allowed.applicable_competencies = updates.applicable_competencies;

  const { data, error } = await supabaseAdmin
    .from('employees')
    .update(allowed)
    .eq('employee_id', employeeId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Insert a brand-new employee from AD sync data.
 * Defaults group_name to 'IC' — admin should update after sync.
 * @param {object} employeeData  AD-sourced fields
 * @returns {object} inserted employee
 */
export async function insertEmployeeFromAd(employeeData) {
  const { data, error } = await supabaseAdmin
    .from('employees')
    .insert({
      employee_id: employeeData.employee_id,
      full_name: employeeData.full_name,
      email: employeeData.email,
      department: employeeData.department,
      designation: employeeData.designation,
      reporting_manager_id: employeeData.reporting_manager_id ?? null,
      date_of_joining: employeeData.date_of_joining,
      is_active: employeeData.is_active ?? true,
      group_name: 'IC',       // default; CXO sets the real group after sync
      synced_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update only AD-sourced fields on an existing employee (preserves
 * system-managed fields: group_name, cross_functional_groups,
 * applicable_competencies).
 * @param {string} employeeId
 * @param {object} adData  AD-sourced fields
 * @returns {object} updated employee
 */
export async function updateEmployeeAdFields(employeeId, adData) {
  const { data, error } = await supabaseAdmin
    .from('employees')
    .update({
      full_name: adData.full_name,
      email: adData.email,
      department: adData.department,
      designation: adData.designation,
      reporting_manager_id: adData.reporting_manager_id ?? null,
      date_of_joining: adData.date_of_joining,
      is_active: adData.is_active ?? true,
      synced_at: new Date().toISOString(),
    })
    .eq('employee_id', employeeId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ── AD Sync Log ────────────────────────────────────────────

/**
 * Insert a new sync log row (at start of sync run).
 * Initial status is PARTIAL — updated to SUCCESS/PARTIAL/FAILED when done.
 * (The schema has no IN_PROGRESS state; PARTIAL serves as the interim sentinel.)
 * @param {{ sync_type: 'SCHEDULED'|'MANUAL' }} opts
 * @returns {object} created log row
 */
export async function createAdSyncLog({ sync_type }) {
  const { data, error } = await supabaseAdmin
    .from('ad_sync_log')
    .insert({
      sync_type,
      status: 'PARTIAL',       // sentinel: sync started, not yet complete
      employees_added: 0,
      employees_updated: 0,
      employees_deactivated: 0,
      started_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update an existing sync log row with final results.
 * @param {string} syncId
 * @param {{ status:string, employees_added:number, employees_updated:number,
 *           employees_deactivated:number, error_message?:string }} updates
 * @returns {object} updated log row
 */
export async function updateAdSyncLog(syncId, updates) {
  const { data, error } = await supabaseAdmin
    .from('ad_sync_log')
    .update({
      ...updates,
      completed_at: new Date().toISOString(),
    })
    .eq('sync_id', syncId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Fetch recent AD sync log entries.
 * @param {number} limit
 * @returns {object[]}
 */
export async function getRecentSyncLogs(limit = 10) {
  const { data, error } = await supabaseAdmin
    .from('ad_sync_log')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}
