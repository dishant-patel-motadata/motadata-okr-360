/**
 * modules/questions/questions.repository.js
 */

import { supabaseAdmin } from '../../config/supabase.js';

export async function listQuestions({ set_type, competency_id, is_active }) {
  let query = supabaseAdmin
    .from('questions')
    .select(
      'question_id, set_type, order_number, question_text, category, competency_id, is_active, created_at, updated_at'
    )
    .order('set_type', { ascending: true })
    .order('order_number', { ascending: true });

  if (set_type) query = query.eq('set_type', set_type);
  if (competency_id) query = query.eq('competency_id', competency_id);
  if (is_active !== undefined) query = query.eq('is_active', is_active === 'true');

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function getQuestionById(questionId) {
  const { data, error } = await supabaseAdmin
    .from('questions')
    .select('*')
    .eq('question_id', questionId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data;
}

/**
 * Fetch all active questions for a given set_type (IC/TM/HOD).
 * Used by the survey module when building the reviewer form.
 */
export async function getActiveQuestionsBySetType(setType) {
  const { data, error } = await supabaseAdmin
    .from('questions')
    .select('question_id, order_number, question_text, category, competency_id')
    .eq('set_type', setType)
    .eq('is_active', true)
    .order('order_number', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function createQuestion(payload) {
  const { data, error } = await supabaseAdmin
    .from('questions')
    .insert(payload)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateQuestion(questionId, updates) {
  const { data, error } = await supabaseAdmin
    .from('questions')
    .update(updates)
    .eq('question_id', questionId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get the next available order_number for a given set_type.
 */
export async function getNextOrderNumber(setType) {
  const { data, error } = await supabaseAdmin
    .from('questions')
    .select('order_number')
    .eq('set_type', setType)
    .order('order_number', { ascending: false })
    .limit(1);

  if (error) throw error;
  return ((data?.[0]?.order_number) ?? 0) + 1;
}

/**
 * Bulk upsert questions — used by seed script and CSV import.
 * @param {object[]} rows
 */
export async function upsertQuestions(rows) {
  const { data, error } = await supabaseAdmin
    .from('questions')
    .upsert(rows, { onConflict: 'question_id' })
    .select();

  if (error) throw error;
  return data ?? [];
}
