/**
 * modules/cycles/cycles.repository.js
 *
 * All database access for the review_cycles table.
 * Uses supabaseAdmin (service-role) to bypass RLS.
 */

import { supabaseAdmin } from '../../config/supabase.js';

// ── Read ───────────────────────────────────────────────────

/**
 * Paginated cycle list, optionally filtered by status.
 * @param {{ page:number, limit:number, status?:string }} opts
 */
export async function listCycles({ page, limit, status }) {
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabaseAdmin
    .from('review_cycles')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (status) {
    // Support comma-separated status values e.g. "COMPLETED,PUBLISHED"
    const statuses = status.split(',').map((s) => s.trim()).filter(Boolean);
    if (statuses.length === 1) {
      query = query.eq('status', statuses[0]);
    } else if (statuses.length > 1) {
      query = query.in('status', statuses);
    }
  }

  const { data, error, count } = await query;
  if (error) throw error;
  return { cycles: data ?? [], total: count ?? 0 };
}

/**
 * Fetch a single cycle by UUID.
 * @param {string} cycleId
 * @returns {object|null}
 */
export async function getCycleById(cycleId) {
  const { data, error } = await supabaseAdmin
    .from('review_cycles')
    .select('*')
    .eq('cycle_id', cycleId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data;
}

/**
 * Check whether any cycle currently has an overlapping active period.
 * "Active" in this context means status IN ('ACTIVE', 'CLOSING').
 * Used to enforce RC-12: prevent overlapping active cycles.
 *
 * Two cycles overlap if one's start is before the other's end AND
 * one's end is after the other's start.
 *
 * @param {{ start_date:string, end_date:string, excludeCycleId?:string }} opts
 * @returns {object|null}  overlapping cycle row, or null if none
 */
export async function findOverlappingActiveCycle({ start_date, end_date, excludeCycleId }) {
  let query = supabaseAdmin
    .from('review_cycles')
    .select('cycle_id, cycle_name, start_date, end_date, status')
    .in('status', ['ACTIVE', 'CLOSING'])
    .lt('start_date', end_date)   // existing.start < new.end
    .gt('end_date', start_date);  // existing.end   > new.start

  if (excludeCycleId) {
    query = query.neq('cycle_id', excludeCycleId);
  }

  const { data, error } = await query.limit(1);
  if (error) throw error;
  return data?.[0] ?? null;
}

/**
 * Find all cycles that need auto-transition based on today's date.
 *
 * ACTIVE  → CLOSING   : end_date < today
 * CLOSING → COMPLETED : end_date + grace_period_days < today
 *
 * @returns {{ toClosing: object[], toCompleted: object[] }}
 */
export async function findCyclesForTransition() {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  // ACTIVE cycles whose end_date has passed
  const { data: toClosing, error: e1 } = await supabaseAdmin
    .from('review_cycles')
    .select('*')
    .eq('status', 'ACTIVE')
    .lt('end_date', today);

  if (e1) throw e1;

  // CLOSING cycles — need to compute end_date + grace_period_days in JS
  const { data: closingAll, error: e2 } = await supabaseAdmin
    .from('review_cycles')
    .select('*')
    .eq('status', 'CLOSING');

  if (e2) throw e2;

  const toCompleted = (closingAll ?? []).filter((c) => {
    const graceEnd = new Date(c.end_date);
    graceEnd.setDate(graceEnd.getDate() + (c.grace_period_days ?? 0));
    return graceEnd < new Date(today);
  });

  return { toClosing: toClosing ?? [], toCompleted };
}

// ── Write ──────────────────────────────────────────────────

/**
 * Insert a new cycle (DRAFT status).
 * @param {object} cycleData  validated + enriched data
 * @returns {object} created cycle
 */
export async function createCycle(cycleData) {
  const { data, error } = await supabaseAdmin
    .from('review_cycles')
    .insert(cycleData)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update arbitrary fields on a cycle row.
 * Caller is responsible for ensuring the update is allowed.
 * @param {string} cycleId
 * @param {object} updates
 * @returns {object} updated cycle
 */
export async function updateCycle(cycleId, updates) {
  const { data, error } = await supabaseAdmin
    .from('review_cycles')
    .update(updates)
    .eq('cycle_id', cycleId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Transition a cycle to a new status.
 * Convenience wrapper around updateCycle.
 * @param {string} cycleId
 * @param {string} newStatus
 * @returns {object} updated cycle
 */
export async function transitionCycleStatus(cycleId, newStatus) {
  return updateCycle(cycleId, { status: newStatus });
}

/**
 * Hard-delete a cycle. Only allowed while status is DRAFT.
 * @param {string} cycleId
 */
export async function deleteCycle(cycleId) {
  const { error } = await supabaseAdmin
    .from('review_cycles')
    .delete()
    .eq('cycle_id', cycleId);

  if (error) throw error;
}
