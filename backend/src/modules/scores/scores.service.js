/**
 * modules/scores/scores.service.js
 *
 * Score calculation orchestrator.
 *
 * Entry points:
 *   calculateScoresForCycle(cycleId)     — called by cycles.service.js when
 *                                          a cycle transitions to COMPLETED.
 *   recalculateScoresForCycle(cycleId)   — CXO-triggered recalculation (idempotent).
 *   getScoreForEmployeeService(...)      — read a single employee's scorecard.
 *   getCycleScoresService(...)           — read all scorecards for a cycle.
 *   getMyScoresService(employeeId)       — historical scores for one employee.
 *
 * Calculation summary (PRD §4.6):
 *   1. Fetch all COMPLETED reviewers for each assignment in the cycle.
 *   2. Each reviewer contributes one equally-weighted entry = average of
 *      their submitted question ratings.
 *   3. colleague_score = mean of all reviewer averages.
 *   4. final_label = scoreToLabel(round(colleague_score)).
 *   5. competency_scores = per-competency mean across all responses.
 *   6. reviewer_category_scores = per-reviewer-type mean-of-reviewer-averages.
 *   7. self_score = simple average of self_feedback.competency_ratings (reference only).
 */

import { supabaseAdmin } from '../../config/supabase.js';
import {
  scoreToLabel,
  calculateColleagueScore,
  calculateCompetencyScores,
  calculateCategoryScores,
  calculateSelfScore,
} from './scores.calculator.js';
import {
  upsertCalculatedScore,
  getCalculatedScore,
  getCalculatedScoresByCycle,
  getCalculatedScoresByEmployee,
  getDepartmentScoresByCycle,
} from './scores.repository.js';

// ── Internal data loaders ─────────────────────────────────────

/**
 * Build a Map<question_id, competency_id> from the DB.
 * Called once per cycle calculation.
 */
async function buildQuestionCompetencyMap() {
  const { data, error } = await supabaseAdmin
    .from('questions')
    .select('question_id, competency_id')
    .eq('is_active', true);

  if (error) throw error;

  const map = new Map();
  for (const q of data ?? []) {
    map.set(q.question_id, q.competency_id);
  }
  return map;
}

// ─────────────────────────────────────────────────────────────

/**
 * Load all COMPLETED reviewers + their responses for one assignment.
 *
 * Returns:
 *   Array<{
 *     reviewer_id, reviewer_type,
 *     responses: Array<{ question_id, rating }>
 *   }>
 */
async function loadCompletedReviewersWithResponses(assignmentId) {
  const { data, error } = await supabaseAdmin
    .from('survey_reviewers')
    .select(
      `reviewer_id, reviewer_type,
       survey_responses(question_id, rating)`
    )
    .eq('assignment_id', assignmentId)
    .eq('status', 'COMPLETED');

  if (error) throw error;

  return (data ?? []).map((r) => ({
    reviewer_id: r.reviewer_id,
    reviewer_type: r.reviewer_type,
    responses: r.survey_responses ?? [],
  }));
}

// ─────────────────────────────────────────────────────────────

/**
 * Load self_feedback for one employee in one cycle.
 * Returns null if not submitted yet.
 */
async function loadSelfFeedback(employeeId, cycleId) {
  const { data, error } = await supabaseAdmin
    .from('self_feedback')
    .select('competency_ratings, status')
    .eq('employee_id', employeeId)
    .eq('cycle_id', cycleId)
    .eq('status', 'SUBMITTED')
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data;
}

// ─────────────────────────────────────────────────────────────

/**
 * Load all survey assignments for a cycle.
 */
async function loadAssignmentsForCycle(cycleId) {
  const { data, error } = await supabaseAdmin
    .from('survey_assignments')
    .select('assignment_id, employee_id')
    .eq('cycle_id', cycleId);

  if (error) throw error;
  return data ?? [];
}

// ── Core: Calculate for one employee ─────────────────────────

/**
 * Calculate and upsert scores for a single employee in a cycle.
 *
 * @returns {object}  The upserted calculated_scores row, or null if skipped
 *                    (no completed reviewers).
 */
async function calculateForEmployee(employeeId, cycleId, assignmentId, questionCompetencyMap) {
  // 1. Load all completed reviewers with their responses
  const completedReviewers = await loadCompletedReviewersWithResponses(assignmentId);

  if (completedReviewers.length === 0) {
    // No completed reviewers — skip (don't write a meaningless row)
    return null;
  }

  // 2. Colleague score
  const colleagueResult = calculateColleagueScore(completedReviewers);
  if (!colleagueResult) return null;

  const { colleague_score, total_reviewers } = colleagueResult;
  const final_label = scoreToLabel(colleague_score);

  // 3. Competency breakdown
  const competency_scores = calculateCompetencyScores(completedReviewers, questionCompetencyMap);

  // 4. Reviewer-category breakdown
  const reviewer_category_scores = calculateCategoryScores(completedReviewers);

  // 5. Self score (reference only — may be null)
  const selfFeedback = await loadSelfFeedback(employeeId, cycleId);
  const self_score = selfFeedback
    ? calculateSelfScore(selfFeedback.competency_ratings ?? [])
    : null;

  // 6. Upsert
  return upsertCalculatedScore({
    employee_id: employeeId,
    cycle_id: cycleId,
    self_score,
    colleague_score: Math.round(colleague_score * 10000) / 10000, // 4 dp
    final_label,
    competency_scores,
    reviewer_category_scores,
    total_reviewers,
  });
}

// ── Public: Calculate for all employees in a cycle ───────────

/**
 * CALC-07  Calculate scores for every employee in a cycle.
 * Called automatically when a cycle transitions to COMPLETED.
 *
 * Processes all assignments in parallel (Promise.allSettled) so a
 * single failing employee doesn't block the rest.
 *
 * @param {string} cycleId
 * @returns {{ calculated: number, skipped: number, errors: number }}
 */
export async function calculateScoresForCycle(cycleId) {
  const [assignments, questionCompetencyMap] = await Promise.all([
    loadAssignmentsForCycle(cycleId),
    buildQuestionCompetencyMap(),
  ]);

  const results = await Promise.allSettled(
    assignments.map(({ employee_id, assignment_id }) =>
      calculateForEmployee(employee_id, cycleId, assignment_id, questionCompetencyMap)
    )
  );

  let calculated = 0;
  let skipped = 0;
  let errors = 0;

  for (const result of results) {
    if (result.status === 'fulfilled') {
      result.value ? calculated++ : skipped++;
    } else {
      errors++;
      console.error('[scores.service] calculateScoresForCycle error:', result.reason?.message);
    }
  }

  return { calculated, skipped, errors };
}

// ─────────────────────────────────────────────────────────────

/**
 * CXO-triggered recalculation for a cycle.
 * Idempotent — safe to call multiple times.
 *
 * @param {string} cycleId
 * @param {object} requestingUser
 */
export async function recalculateScoresForCycle(cycleId, requestingUser) {
  // Verify cycle exists and is in a calculable state
  const { data: cycle, error } = await supabaseAdmin
    .from('review_cycles')
    .select('cycle_id, cycle_name, status')
    .eq('cycle_id', cycleId)
    .single();

  if (error || !cycle) {
    const err = new Error('Cycle not found.');
    err.statusCode = 404;
    throw err;
  }

  if (!['COMPLETED', 'PUBLISHED'].includes(cycle.status)) {
    const err = new Error(
      `Scores can only be recalculated for COMPLETED or PUBLISHED cycles. Current status: ${cycle.status}`
    );
    err.statusCode = 409;
    throw err;
  }

  const summary = await calculateScoresForCycle(cycleId);
  return {
    message: `Recalculation complete for cycle "${cycle.cycle_name}".`,
    ...summary,
  };
}

// ── Read services ─────────────────────────────────────────────

/**
 * Get a single employee's scorecard for one cycle.
 *
 * Access rules:
 *   - Employee can see their own score (label only — numeric suppressed at route level)
 *   - TM/HOD can see their direct/indirect reports' numeric scores
 *   - CXO can see any score
 */
export async function getScoreForEmployeeService(employeeId, cycleId) {
  const score = await getCalculatedScore(employeeId, cycleId);

  if (!score) {
    const err = new Error('Score not found. The cycle may not have been calculated yet.');
    err.statusCode = 404;
    throw err;
  }

  return score;
}

// ─────────────────────────────────────────────────────────────

/**
 * Get all scores for a cycle (CXO / overview dashboard).
 * Optionally filter by department.
 */
export async function getCycleScoresService(cycleId, { department } = {}) {
  const { data: cycle, error } = await supabaseAdmin
    .from('review_cycles')
    .select('cycle_id, cycle_name, status')
    .eq('cycle_id', cycleId)
    .single();

  if (error || !cycle) {
    const err = new Error('Cycle not found.');
    err.statusCode = 404;
    throw err;
  }

  const scores = await getCalculatedScoresByCycle(cycleId, { department });
  return { cycle, scores };
}

// ─────────────────────────────────────────────────────────────

/**
 * Get all historical scores for one employee.
 * Used in the "Historical Trends" section of the dashboard.
 */
export async function getMyScoresService(employeeId) {
  const scores = await getCalculatedScoresByEmployee(employeeId);
  return scores;
}

// ─────────────────────────────────────────────────────────────

/**
 * Get a department comparison for one employee's score.
 * Used in the "Self vs Department" section.
 * Returns: { employee_score, department_avg, competency_comparison }
 */
export async function getDepartmentComparisonService(employeeId, cycleId) {
  const [myScore, deptRows] = await Promise.all([
    getCalculatedScore(employeeId, cycleId),
    (async () => {
      // First get employee's department
      const { data: emp } = await supabaseAdmin
        .from('employees')
        .select('department')
        .eq('employee_id', employeeId)
        .single();

      if (!emp) return [];
      return getDepartmentScoresByCycle(cycleId, emp.department);
    })(),
  ]);

  if (!myScore) {
    const err = new Error('Score not found for this employee and cycle.');
    err.statusCode = 404;
    throw err;
  }

  if (deptRows.length === 0) {
    return { my_score: myScore, department_avg: null, competency_comparison: {} };
  }

  // Department overall average
  const deptOverallAvg =
    deptRows.reduce((sum, r) => sum + (r.colleague_score ?? 0), 0) / deptRows.length;

  // Per-competency department average
  const competencyTotals = {};
  for (const row of deptRows) {
    for (const [compId, val] of Object.entries(row.competency_scores ?? {})) {
      if (!competencyTotals[compId]) competencyTotals[compId] = { sum: 0, count: 0 };
      competencyTotals[compId].sum += val.score ?? val;
      competencyTotals[compId].count += 1;
    }
  }

  const competency_comparison = {};
  for (const [compId, { sum, count }] of Object.entries(competencyTotals)) {
    const deptAvg = sum / count;
    const myCompScore = myScore.competency_scores?.[compId]?.score ?? null;
    competency_comparison[compId] = {
      my_score: myCompScore,
      dept_avg: Math.round(deptAvg * 100) / 100,
      diff: myCompScore !== null ? Math.round((myCompScore - deptAvg) * 100) / 100 : null,
    };
  }

  return {
    my_score: myScore,
    department_avg: Math.round(deptOverallAvg * 100) / 100,
    competency_comparison,
  };
}
