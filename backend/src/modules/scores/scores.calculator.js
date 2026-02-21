/**
 * modules/scores/scores.calculator.js
 *
 * Pure calculation functions — no DB calls, no side effects.
 * Import and call from scores.service.js (and unit tests).
 *
 * Calculation model (PRD §4.6):
 *   - Self ratings are EXCLUDED from final/colleague score (reference only).
 *   - All reviewer types carry equal weight (1.0×).
 *   - Each reviewer's contribution = simple average of their responses.
 *   - Colleague score = mean of all individual-reviewer averages.
 *   - Final label = round colleague_score to nearest int → 4-point label.
 *   - Competency score = mean of all ratings across all reviewers for
 *                        questions that belong to that competency.
 *   - Category score   = mean of per-reviewer averages grouped by
 *                        reviewer_type.
 */

// ── Label mapping ─────────────────────────────────────────────

export const SCORE_LABELS = {
  4: 'Outstanding Impact',
  3: 'Significant Impact',
  2: 'Moderate Impact',
  1: 'Not Enough Impact',
};

/**
 * Map a numeric average to the nearest 4-point label.
 * Scores below 1.5 → 1, above 3.5 → 4, etc.
 * @param {number} score
 * @returns {string}
 */
export function scoreToLabel(score) {
  const rounded = Math.min(4, Math.max(1, Math.round(score)));
  return SCORE_LABELS[rounded] ?? 'Not Enough Impact';
}

/**
 * Return the rounded integer band (1-4) from a score.
 * @param {number} score
 * @returns {number}
 */
export function scoreToBand(score) {
  return Math.min(4, Math.max(1, Math.round(score)));
}

// ── Per-reviewer average ─────────────────────────────────────

/**
 * Calculate a single reviewer's average rating across their responses.
 *
 * @param {Array<{rating: number}>} responses  — all responses from one reviewer
 * @returns {number|null}  null if reviewer has no responses
 */
export function reviewerAverage(responses) {
  if (!responses || responses.length === 0) return null;
  const sum = responses.reduce((acc, r) => acc + r.rating, 0);
  return sum / responses.length;
}

// ── Colleague (peer) overall score ────────────────────────────

/**
 * Calculate the overall colleague score from an array of reviewer objects.
 *
 * @param {Array<{ responses: Array<{rating:number}> }>} completedReviewers
 *   Array of COMPLETED reviewer rows, each with a `responses` array.
 * @returns {{ colleague_score: number, total_reviewers: number } | null}
 *   null if no completed reviewers exist.
 */
export function calculateColleagueScore(completedReviewers) {
  const averages = completedReviewers
    .map((r) => reviewerAverage(r.responses))
    .filter((avg) => avg !== null);

  if (averages.length === 0) return null;

  const sum = averages.reduce((acc, a) => acc + a, 0);
  return {
    colleague_score: sum / averages.length,
    total_reviewers: averages.length,
  };
}

// ── Competency-wise scores ────────────────────────────────────

/**
 * Calculate per-competency average scores across ALL completed reviewers.
 *
 * @param {Array<{ responses: Array<{rating:number, question_id:string}> }>} completedReviewers
 * @param {Map<string, string>} questionCompetencyMap  question_id → competency_id
 * @returns {Object}  { [competency_id]: { score: number, label: string, response_count: number } }
 */
export function calculateCompetencyScores(completedReviewers, questionCompetencyMap) {
  // Accumulate: { [competency_id]: { sum, count } }
  const buckets = {};

  for (const reviewer of completedReviewers) {
    for (const response of reviewer.responses ?? []) {
      const competencyId = questionCompetencyMap.get(response.question_id);
      if (!competencyId) continue;

      if (!buckets[competencyId]) {
        buckets[competencyId] = { sum: 0, count: 0 };
      }
      buckets[competencyId].sum += response.rating;
      buckets[competencyId].count += 1;
    }
  }

  const result = {};
  for (const [competencyId, { sum, count }] of Object.entries(buckets)) {
    const avg = sum / count;
    result[competencyId] = {
      score: Math.round(avg * 100) / 100, // 2 dp
      label: scoreToLabel(avg),
      response_count: count,
    };
  }
  return result;
}

// ── Reviewer-category-wise scores ────────────────────────────

/**
 * Calculate per-reviewer-type average scores.
 * For each category, take the mean of that category's reviewer averages
 * (i.e. each reviewer contributes equally within their category too).
 *
 * @param {Array<{ reviewer_type: string, responses: Array<{rating:number}> }>} completedReviewers
 * @returns {Object}  { [reviewer_type]: { score: number, label: string, reviewer_count: number } }
 */
export function calculateCategoryScores(completedReviewers) {
  // Accumulate: { [reviewer_type]: { sum_of_averages, count } }
  const buckets = {};

  for (const reviewer of completedReviewers) {
    const avg = reviewerAverage(reviewer.responses);
    if (avg === null) continue;

    const type = reviewer.reviewer_type;
    if (!buckets[type]) {
      buckets[type] = { sum: 0, count: 0 };
    }
    buckets[type].sum += avg;
    buckets[type].count += 1;
  }

  const result = {};
  for (const [type, { sum, count }] of Object.entries(buckets)) {
    const avg = sum / count;
    result[type] = {
      score: Math.round(avg * 100) / 100,
      label: scoreToLabel(avg),
      reviewer_count: count,
    };
  }
  return result;
}

// ── Self score ────────────────────────────────────────────────

/**
 * Calculate self-assessment average from competency_ratings JSONB array.
 *
 * @param {Array<{competency_id:string, rating:number}>} competencyRatings
 * @returns {number|null}  null if no ratings
 */
export function calculateSelfScore(competencyRatings) {
  if (!competencyRatings || competencyRatings.length === 0) return null;
  const sum = competencyRatings.reduce((acc, r) => acc + r.rating, 0);
  return Math.round((sum / competencyRatings.length) * 100) / 100;
}
