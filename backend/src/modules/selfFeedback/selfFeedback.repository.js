/**
 * modules/selfFeedback/selfFeedback.repository.js
 *
 * All Supabase operations for the self_feedback table.
 *
 * Table: self_feedback
 *   self_feedback_id  UUID  PK
 *   employee_id       TEXT  FK → employees
 *   cycle_id          UUID  FK → review_cycles
 *   competency_ratings JSONB
 *   status            TEXT  ('DRAFT' | 'SUBMITTED')
 *   submitted_at      TIMESTAMPTZ
 *   created_at        TIMESTAMPTZ
 *   updated_at        TIMESTAMPTZ
 *
 * Unique constraint: (employee_id, cycle_id)
 */

import { supabaseAdmin } from '../../config/supabase.js';

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch a self-feedback record for one employee in one cycle.
 * @returns {object|null}
 */
export async function getSelfFeedback(employeeId, cycleId) {
  const { data, error } = await supabaseAdmin
    .from('self_feedback')
    .select('*')
    .eq('employee_id', employeeId)
    .eq('cycle_id', cycleId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;  // 0 rows — not started
    throw error;
  }
  return data;
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a new DRAFT self-feedback record.
 * Only called when no record exists yet.
 */
export async function createSelfFeedback({ employee_id, cycle_id, competency_ratings }) {
  const { data, error } = await supabaseAdmin
    .from('self_feedback')
    .insert({ employee_id, cycle_id, competency_ratings, status: 'DRAFT' })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Overwrite the ratings on an existing DRAFT record.
 * The `.eq('status', 'DRAFT')` filter is a safety guard against
 * accidentally updating already-submitted records.
 */
export async function updateSelfFeedbackDraft(selfFeedbackId, competency_ratings) {
  const { data, error } = await supabaseAdmin
    .from('self_feedback')
    .update({ competency_ratings })
    .eq('self_feedback_id', selfFeedbackId)
    .eq('status', 'DRAFT')
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Lock a self-feedback record as SUBMITTED.
 * Updates ratings one final time then sets status + submitted_at.
 * The `.eq('status', 'DRAFT')` prevents double-submission races.
 */
export async function submitSelfFeedback(selfFeedbackId, competency_ratings) {
  const { data, error } = await supabaseAdmin
    .from('self_feedback')
    .update({
      competency_ratings,
      status: 'SUBMITTED',
      submitted_at: new Date().toISOString(),
    })
    .eq('self_feedback_id', selfFeedbackId)
    .eq('status', 'DRAFT')
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Admin — get self-feedback completion status for every active employee
 * in a given cycle.
 *
 * Returns an array of employee rows plus their self_feedback status:
 *   'NOT_STARTED' | 'DRAFT' | 'SUBMITTED'
 */
export async function getCompletionStatusByCycle(cycleId) {
  // Fetch all active employees
  const { data: employees, error: empErr } = await supabaseAdmin
    .from('employees')
    .select('employee_id, full_name, department, designation, group_name')
    .eq('is_active', true)
    .order('full_name', { ascending: true });

  if (empErr) throw empErr;

  // Fetch all self-feedback records for this cycle (any status)
  const { data: feedbacks, error: fbErr } = await supabaseAdmin
    .from('self_feedback')
    .select('employee_id, status, submitted_at')
    .eq('cycle_id', cycleId);

  if (fbErr) throw fbErr;

  // Build lookup map: employeeId → feedback
  const fbMap = {};
  for (const fb of feedbacks ?? []) {
    fbMap[fb.employee_id] = fb;
  }

  // Merge
  return (employees ?? []).map((emp) => ({
    ...emp,
    self_feedback_status: fbMap[emp.employee_id]?.status ?? 'NOT_STARTED',
    submitted_at:         fbMap[emp.employee_id]?.submitted_at ?? null,
  }));
}
