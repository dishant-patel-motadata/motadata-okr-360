/**
 * modules/competencies/competencies.repository.js
 */

import { supabaseAdmin } from '../../config/supabase.js';

export async function listCompetencies({ applicable_to, is_active }) {
  let query = supabaseAdmin
    .from('competencies')
    .select('*')
    .order('competency_name', { ascending: true });

  if (applicable_to) {
    // Filter where applicable_to array contains the given group
    query = query.contains('applicable_to', [applicable_to]);
  }
  if (is_active !== undefined) {
    query = query.eq('is_active', is_active === 'true');
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function getCompetencyById(competencyId) {
  const { data, error } = await supabaseAdmin
    .from('competencies')
    .select('*')
    .eq('competency_id', competencyId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data;
}

export async function createCompetency(payload) {
  const { data, error } = await supabaseAdmin
    .from('competencies')
    .insert(payload)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateCompetency(competencyId, updates) {
  const { data, error } = await supabaseAdmin
    .from('competencies')
    .update(updates)
    .eq('competency_id', competencyId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Bulk upsert competencies — used by seed script.
 * @param {object[]} rows
 */
export async function upsertCompetencies(rows) {
  const { data, error } = await supabaseAdmin
    .from('competencies')
    .upsert(rows, { onConflict: 'competency_id' })
    .select();

  if (error) throw error;
  return data ?? [];
}
