/**
 * modules/assignments/assignments.repository.js
 *
 * DB operations for survey_assignments table.
 *
 * Table: survey_assignments
 *   assignment_id  UUID PK
 *   employee_id    TEXT FK → employees
 *   cycle_id       UUID FK → review_cycles
 *   status         TEXT  'PENDING' | 'IN_PROGRESS' | 'COMPLETED'
 *   created_at     TIMESTAMPTZ
 *   updated_at     TIMESTAMPTZ
 *
 *   UNIQUE (employee_id, cycle_id)
 */

import { supabaseAdmin } from '../../config/supabase.js';

// ─────────────────────────────────────────────────────────────

/**
 * List all assignments for a cycle with reviewer count.
 * Supports filtering by status, employee_id, department.
 */
export async function listAssignments({ cycle_id, status, employee_id, department, page, limit }) {
  const offset = (page - 1) * limit;

  // Base query joining employee details
  let query = supabaseAdmin
    .from('survey_assignments')
    .select(
      `assignment_id, employee_id, status, created_at, updated_at,
       employees!inner(employee_id, full_name, department, designation, group_name)`,
      { count: 'exact' }
    )
    .eq('cycle_id', cycle_id)
    .order('created_at', { ascending: true })
    .range(offset, offset + limit - 1);

  if (status)      query = query.eq('status', status);
  if (employee_id) query = query.eq('employee_id', employee_id);
  if (department)  query = query.eq('employees.department', department);

  const { data, error, count } = await query;
  if (error) throw error;
  return { rows: data ?? [], total: count ?? 0 };
}

// ─────────────────────────────────────────────────────────────

/**
 * Get one assignment by PK, including all reviewer rows.
 */
export async function getAssignmentById(assignmentId) {
  const { data, error } = await supabaseAdmin
    .from('survey_assignments')
    .select(
      `*,
       employees!inner(employee_id, full_name, department, designation, group_name),
       survey_reviewers(
         *,
         employees!reviewer_employee_id(employee_id, full_name, department, designation)
       )` 
    )
    .eq('assignment_id', assignmentId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data;
}

// ─────────────────────────────────────────────────────────────

/**
 * Lookup by employee + cycle (for uniqueness check).
 */
export async function getAssignmentByEmployeeAndCycle(employeeId, cycleId) {
  const { data, error } = await supabaseAdmin
    .from('survey_assignments')
    .select('*')
    .eq('employee_id', employeeId)
    .eq('cycle_id', cycleId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data;
}

// ─────────────────────────────────────────────────────────────

export async function createAssignment({ employee_id, cycle_id }) {
  const { data, error } = await supabaseAdmin
    .from('survey_assignments')
    .insert({ employee_id, cycle_id, status: 'PENDING' })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ─────────────────────────────────────────────────────────────

/**
 * Update assignment status (PENDING → IN_PROGRESS → COMPLETED).
 * Called by the survey response module when a reviewer submits.
 */
export async function updateAssignmentStatus(assignmentId, status) {
  const { data, error } = await supabaseAdmin
    .from('survey_assignments')
    .update({ status })
    .eq('assignment_id', assignmentId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ─────────────────────────────────────────────────────────────

/**
 * Delete an assignment (cascade deletes reviewers + responses via FK cascade).
 * Only called for rollback (SA-09) when no reviewer has COMPLETED.
 */
export async function deleteAssignment(assignmentId) {
  const { error } = await supabaseAdmin
    .from('survey_assignments')
    .delete()
    .eq('assignment_id', assignmentId);

  if (error) throw error;
}

// ─────────────────────────────────────────────────────────────

/**
 * Admin completion overview: assignment status for every active employee
 * in a given cycle (includes NOT_ENROLLED for employees without an assignment).
 */
export async function getAssignmentStatusByCycle(cycleId) {
  // All active employees
  const { data: employees, error: empErr } = await supabaseAdmin
    .from('employees')
    .select('employee_id, full_name, department, designation, group_name')
    .eq('is_active', true)
    .order('full_name', { ascending: true });

  if (empErr) throw empErr;

  // All assignments for this cycle
  const { data: assignments, error: asgErr } = await supabaseAdmin
    .from('survey_assignments')
    .select('assignment_id, employee_id, status')
    .eq('cycle_id', cycleId);

  if (asgErr) throw asgErr;

  const asgMap = {};
  for (const a of assignments ?? []) {
    asgMap[a.employee_id] = a;
  }

  return (employees ?? []).map((emp) => ({
    ...emp,
    assignment_id:       asgMap[emp.employee_id]?.assignment_id ?? null,
    assignment_status:   asgMap[emp.employee_id]?.status ?? 'NOT_ENROLLED',
  }));
}

// ─────────────────────────────────────────────────────────────

/**
 * Upsert an assignment — used by bulk CSV import.
 * Returns existing row if (employee_id, cycle_id) already exists.
 */
export async function upsertAssignment({ employee_id, cycle_id }) {
  const { data, error } = await supabaseAdmin
    .from('survey_assignments')
    .upsert({ employee_id, cycle_id, status: 'PENDING' }, { onConflict: 'employee_id,cycle_id', ignoreDuplicates: false })
    .select()
    .single();

  if (error) throw error;
  return data;
}
