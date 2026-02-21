/**
 * modules/scores/scores.controller.js
 *
 * Thin controllers for the Scores module.
 * Access filtering (label-only vs. numeric) is applied here
 * based on req.user.group_name per PRD §3.4 Anonymity Rules.
 */

import {
  getScoreForEmployeeService,
  getCycleScoresService,
  getMyScoresService,
  getDepartmentComparisonService,
  recalculateScoresForCycle,
} from './scores.service.js';

// ── Helper: strip numeric scores for IC self-view ─────────────

/**
 * Per §3.4:
 *   - Employee sees: label only (no numeric colleague_score)
 *   - TM / HOD / CXO: label + numeric
 *
 * @param {object} score  raw score row
 * @param {object} user   req.user
 * @param {string} targetEmployeeId  who the score belongs to
 * @returns {object}  shaped score
 */
function shapeScoreForUser(score, user, targetEmployeeId) {
  const isOwnScore = user.employeeId === targetEmployeeId;
  const canSeeNumeric =
    !isOwnScore || ['TM', 'HOD', 'CXO'].includes(user.group_name);

  if (canSeeNumeric) return score;

  // Label-only view: remove numeric fields
  const { colleague_score, self_score, competency_scores, reviewer_category_scores, ...rest } =
    score;

  // Keep competency_scores but replace numeric score with label only
  const labelOnlyCompetencies = {};
  for (const [key, val] of Object.entries(competency_scores ?? {})) {
    labelOnlyCompetencies[key] = { label: val.label };
  }

  // Keep category breakdown as label-only
  const labelOnlyCategories = {};
  for (const [key, val] of Object.entries(reviewer_category_scores ?? {})) {
    labelOnlyCategories[key] = { label: val.label, reviewer_count: val.reviewer_count };
  }

  return {
    ...rest,
    competency_scores: labelOnlyCompetencies,
    reviewer_category_scores: labelOnlyCategories,
  };
}

// ── GET /scores/my ────────────────────────────────────────────

/**
 * Get all historical scores for the authenticated employee.
 * Returns label-only values (employee self-view).
 */
export async function getMyScores(req, res, next) {
  try {
    const scores = await getMyScoresService(req.user.employeeId);

    // Shape: label-only for IC own view; numeric available in other contexts
    const shaped = scores.map((s) =>
      shapeScoreForUser(s, req.user, req.user.employeeId)
    );

    return res.status(200).json({ success: true, data: shaped });
  } catch (err) {
    next(err);
  }
}

// ── GET /scores/employee/:employeeId/cycle/:cycleId ───────────

/**
 * Get a specific employee's score for a specific cycle.
 * TM/HOD/CXO see numeric; employee sees label-only for own record.
 */
export async function getEmployeeScore(req, res, next) {
  try {
    const { employeeId, cycleId } = req.params;
    const score = await getScoreForEmployeeService(employeeId, cycleId);
    const shaped = shapeScoreForUser(score, req.user, employeeId);
    return res.status(200).json({ success: true, data: shaped });
  } catch (err) {
    next(err);
  }
}

// ── GET /scores/cycle/:cycleId ────────────────────────────────

/**
 * Get all scores for a cycle.
 * CXO only — returns full numeric data for all employees.
 * Optional ?department= filter.
 */
export async function getCycleScores(req, res, next) {
  try {
    const { cycleId } = req.params;
    const { department } = req.query;
    const data = await getCycleScoresService(cycleId, { department });
    return res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

// ── GET /scores/employee/:employeeId/cycle/:cycleId/comparison ─

/**
 * Get self-vs-department comparison for an employee.
 * Employee (own) or CXO.
 */
export async function getDepartmentComparison(req, res, next) {
  try {
    const { employeeId, cycleId } = req.params;
    const data = await getDepartmentComparisonService(employeeId, cycleId);
    return res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

// ── POST /scores/cycle/:cycleId/recalculate ───────────────────

/**
 * CXO: manually trigger recalculation for a COMPLETED / PUBLISHED cycle.
 */
export async function recalculateCycleScores(req, res, next) {
  try {
    const { cycleId } = req.params;
    const result = await recalculateScoresForCycle(cycleId, req.user);
    return res.status(200).json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}
