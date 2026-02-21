/**
 * utils/scoreCalculator.js
 *
 * Pure score calculation functions — no DB access, no side effects.
 * Independently testable. Called by scores/service.js.
 *
 * PRD §4.6 Calculation Rules (STRICTLY FOLLOWED):
 *
 *   1. Each reviewer's score  = AVG of their ratings across all
 *                               questions in the assigned set
 *   2. Colleague score        = AVG of all reviewer scores
 *                               (equal weight 1.0× for all types)
 *   3. Self score             = AVG of self_feedback competency
 *                               ratings — REFERENCE ONLY, excluded
 *                               from colleague_score
 *   4. Competency score       = per competency_id: AVG of all
 *                               ratings for questions under that
 *                               competency across all reviewers
 *   5. Reviewer category score= per reviewer_type: AVG of all
 *                               ratings given by that type
 *   6. Final label            = ROUND(colleague_score) mapped to
 *                               4-point label scale
 *
 * Example (from PRD §4.6.3):
 *   Manager: 3 | Peer1: 4 | Peer2: 3 | DR: 4
 *   Colleague = (3+4+3+4) / 4 = 3.5 → ROUND → 4 → "Outstanding Impact"
 */

// ── Label mapping ──────────────────────────────────────────
const LABEL_MAP = {
  4: 'Outstanding Impact',
  3: 'Significant Impact',
  2: 'Moderate Impact',
  1: 'Not Enough Impact',
};

/**
 * Maps a numeric score to its 4-point label.
 * Score is rounded to nearest integer before lookup.
 * Clipped to [1, 4] to handle edge-case averages.
 *
 * @param {number} score
 * @returns {string}
 */
export const scoreToLabel = (score) => {
  const rounded = Math.round(score);
  const clamped = Math.max(1, Math.min(4, rounded));
  return LABEL_MAP[clamped];
};

/**
 * Calculates the average of an array of numbers.
 * Returns null for empty arrays (no data).
 *
 * @param {number[]} values
 * @returns {number|null}
 */
const avg = (values) => {
  if (!values || values.length === 0) return null;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
};

/**
 * Computes all scores for one employee in one cycle.
 *
 * @param {Object} params
 * @param {Array}  params.reviewerResponses
 *   Array of { reviewer_id, reviewer_type, question_id, rating, competency_id }
 *   — Join of survey_reviewers + survey_responses + questions
 * @param {Array}  params.selfRatings
 *   Array of { competency_id, rating } from self_feedback.competency_ratings
 *
 * @returns {{
 *   selfScore             : number|null,
 *   colleagueScore        : number|null,
 *   finalLabel            : string|null,
 *   competencyScores      : Record<string, number>,
 *   reviewerCategoryScores: Record<string, number>,
 *   totalReviewers        : number
 * }}
 */
export const calculateScores = ({ reviewerResponses, selfRatings }) => {
  // ── 1. Group responses by reviewer ──────────────────────
  const byReviewer = {};
  for (const row of reviewerResponses) {
    if (!byReviewer[row.reviewer_id]) {
      byReviewer[row.reviewer_id] = {
        reviewer_type: row.reviewer_type,
        ratings: [],
      };
    }
    byReviewer[row.reviewer_id].ratings.push(row.rating);
  }

  const reviewerIds = Object.keys(byReviewer);
  const totalReviewers = reviewerIds.length;

  // ── 2. Calculate per-reviewer average ───────────────────
  const reviewerAverages = reviewerIds.map((id) => ({
    reviewer_id: id,
    reviewer_type: byReviewer[id].reviewer_type,
    avgScore: avg(byReviewer[id].ratings),
  }));

  // ── 3. Colleague score = AVG of all reviewer averages ───
  const colleagueScore = avg(reviewerAverages.map((r) => r.avgScore));

  // ── 4. Final label ──────────────────────────────────────
  const finalLabel = colleagueScore !== null ? scoreToLabel(colleagueScore) : null;

  // ── 5. Competency scores ────────────────────────────────
  // Group all ratings by competency_id across all reviewers
  const byCompetency = {};
  for (const row of reviewerResponses) {
    if (!row.competency_id) continue;
    if (!byCompetency[row.competency_id]) {
      byCompetency[row.competency_id] = [];
    }
    byCompetency[row.competency_id].push(row.rating);
  }

  const competencyScores = {};
  for (const [compId, ratings] of Object.entries(byCompetency)) {
    const score = avg(ratings);
    if (score !== null) {
      competencyScores[compId] = parseFloat(score.toFixed(2));
    }
  }

  // ── 6. Reviewer category scores ───────────────────────
  const byCategory = {};
  for (const row of reviewerResponses) {
    if (!byCategory[row.reviewer_type]) {
      byCategory[row.reviewer_type] = [];
    }
    byCategory[row.reviewer_type].push(row.rating);
  }

  const reviewerCategoryScores = {};
  for (const [type, ratings] of Object.entries(byCategory)) {
    const score = avg(ratings);
    if (score !== null) {
      reviewerCategoryScores[type] = parseFloat(score.toFixed(2));
    }
  }

  // ── 7. Self score (reference only — not in colleague score)
  const selfScore =
    selfRatings && selfRatings.length > 0
      ? avg(selfRatings.map((r) => r.rating))
      : null;

  return {
    selfScore: selfScore !== null ? parseFloat(selfScore.toFixed(2)) : null,
    colleagueScore: colleagueScore !== null ? parseFloat(colleagueScore.toFixed(2)) : null,
    finalLabel,
    competencyScores,
    reviewerCategoryScores,
    totalReviewers,
  };
};
