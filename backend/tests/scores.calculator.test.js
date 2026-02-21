/**
 * tests/scores.calculator.test.js
 *
 * Pure unit tests for scores.calculator.js — no mocks, no DB.
 *
 * Covers every exported function:
 *   scoreToLabel, scoreToBand, reviewerAverage,
 *   calculateColleagueScore, calculateCompetencyScores,
 *   calculateCategoryScores, calculateSelfScore
 */

import {
  SCORE_LABELS,
  scoreToLabel,
  scoreToBand,
  reviewerAverage,
  calculateColleagueScore,
  calculateCompetencyScores,
  calculateCategoryScores,
  calculateSelfScore,
} from '../src/modules/scores/scores.calculator.js';

// ── scoreToLabel ─────────────────────────────────────────

describe('scoreToLabel', () => {
  it('maps exact integers to correct labels', () => {
    expect(scoreToLabel(4)).toBe('Outstanding Impact');
    expect(scoreToLabel(3)).toBe('Significant Impact');
    expect(scoreToLabel(2)).toBe('Moderate Impact');
    expect(scoreToLabel(1)).toBe('Not Enough Impact');
  });

  it('rounds 3.5 → 4 (Outstanding Impact)', () => {
    expect(scoreToLabel(3.5)).toBe('Outstanding Impact');
  });

  it('rounds 3.49 → 3 (Significant Impact)', () => {
    expect(scoreToLabel(3.49)).toBe('Significant Impact');
  });

  it('rounds 2.5 → 3 (Significant Impact)', () => {
    expect(scoreToLabel(2.5)).toBe('Significant Impact');
  });

  it('rounds 1.5 → 2 (Moderate Impact)', () => {
    expect(scoreToLabel(1.5)).toBe('Moderate Impact');
  });

  it('clamps below 1 to Not Enough Impact', () => {
    expect(scoreToLabel(0)).toBe('Not Enough Impact');
    expect(scoreToLabel(-5)).toBe('Not Enough Impact');
  });

  it('clamps above 4 to Outstanding Impact', () => {
    expect(scoreToLabel(5)).toBe('Outstanding Impact');
    expect(scoreToLabel(100)).toBe('Outstanding Impact');
  });

  it('SCORE_LABELS object has all 4 entries', () => {
    expect(Object.keys(SCORE_LABELS)).toHaveLength(4);
  });
});

// ── scoreToBand ─────────────────────────────────────────

describe('scoreToBand', () => {
  it('returns integer bands 1-4', () => {
    expect(scoreToBand(3.7)).toBe(4);
    expect(scoreToBand(3.2)).toBe(3);
    expect(scoreToBand(1.4)).toBe(1);
  });

  it('clamps values outside 1-4 range', () => {
    expect(scoreToBand(0)).toBe(1);
    expect(scoreToBand(10)).toBe(4);
  });
});

// ── reviewerAverage ──────────────────────────────────────

describe('reviewerAverage', () => {
  it('returns the simple average of ratings', () => {
    const responses = [{ rating: 3 }, { rating: 4 }, { rating: 2 }];
    expect(reviewerAverage(responses)).toBeCloseTo(3);
  });

  it('returns null for empty response array', () => {
    expect(reviewerAverage([])).toBeNull();
  });

  it('returns null for undefined input', () => {
    expect(reviewerAverage(undefined)).toBeNull();
  });

  it('returns single rating when only one response', () => {
    expect(reviewerAverage([{ rating: 4 }])).toBe(4);
  });
});

// ── calculateColleagueScore ──────────────────────────────

describe('calculateColleagueScore', () => {
  it('calculates correct mean across multiple reviewers', () => {
    // PRD example: Manager=3, Peer1=4, Peer2=3, DR=4 → avg = 3.5
    const reviewers = [
      { responses: [{ rating: 3 }] },               // reviewer avg = 3
      { responses: [{ rating: 4 }] },               // reviewer avg = 4
      { responses: [{ rating: 3 }] },               // reviewer avg = 3
      { responses: [{ rating: 4 }] },               // reviewer avg = 4
    ];
    const result = calculateColleagueScore(reviewers);
    expect(result.colleague_score).toBeCloseTo(3.5);
    expect(result.total_reviewers).toBe(4);
  });

  it('returns null if no reviewers', () => {
    expect(calculateColleagueScore([])).toBeNull();
  });

  it('correctly averages multi-question reviewer', () => {
    // Reviewer has 4 responses: [4,4,2,2] → avg 3
    const reviewers = [
      { responses: [{ rating: 4 }, { rating: 4 }, { rating: 2 }, { rating: 2 }] },
    ];
    const result = calculateColleagueScore(reviewers);
    expect(result.colleague_score).toBeCloseTo(3);
    expect(result.total_reviewers).toBe(1);
  });

  it('skips reviewers with no responses', () => {
    const reviewers = [
      { responses: [{ rating: 4 }] },
      { responses: [] },                             // skip this reviewer
    ];
    const result = calculateColleagueScore(reviewers);
    expect(result.colleague_score).toBe(4);
    expect(result.total_reviewers).toBe(1);
  });
});

// ── calculateCompetencyScores ────────────────────────────

describe('calculateCompetencyScores', () => {
  it('groups responses by competency and averages correctly', () => {
    const qMap = new Map([
      ['Q1', 'COMM'],
      ['Q2', 'COMM'],
      ['Q3', 'TEAM'],
    ]);

    const reviewers = [
      { responses: [{ question_id: 'Q1', rating: 4 }, { question_id: 'Q2', rating: 2 }, { question_id: 'Q3', rating: 3 }] },
      { responses: [{ question_id: 'Q1', rating: 2 }, { question_id: 'Q2', rating: 4 }, { question_id: 'Q3', rating: 3 }] },
    ];

    const result = calculateCompetencyScores(reviewers, qMap);

    // COMM: (4+2+2+4)/4 = 3
    expect(result['COMM'].score).toBeCloseTo(3);
    expect(result['COMM'].label).toBe('Significant Impact');
    expect(result['COMM'].response_count).toBe(4);

    // TEAM: (3+3)/2 = 3
    expect(result['TEAM'].score).toBeCloseTo(3);
    expect(result['TEAM'].response_count).toBe(2);
  });

  it('returns empty object when no reviewers', () => {
    const result = calculateCompetencyScores([], new Map());
    expect(result).toEqual({});
  });

  it('ignores responses whose question_id is not in the map', () => {
    const qMap = new Map([['Q1', 'COMM']]);
    const reviewers = [
      { responses: [{ question_id: 'Q1', rating: 4 }, { question_id: 'UNKNOWN', rating: 1 }] },
    ];
    const result = calculateCompetencyScores(reviewers, qMap);
    expect(result['COMM'].score).toBe(4);
    expect(result['UNKNOWN']).toBeUndefined();
  });
});

// ── calculateCategoryScores ──────────────────────────────

describe('calculateCategoryScores', () => {
  it('groups by reviewer_type and averages correctly', () => {
    const reviewers = [
      { reviewer_type: 'MANAGER', responses: [{ rating: 4 }, { rating: 4 }] },      // avg=4
      { reviewer_type: 'PEER', responses: [{ rating: 3 }, { rating: 3 }] },           // avg=3
      { reviewer_type: 'PEER', responses: [{ rating: 3 }, { rating: 1 }] },           // avg=2
    ];

    const result = calculateCategoryScores(reviewers);

    expect(result['MANAGER'].score).toBeCloseTo(4);
    expect(result['MANAGER'].label).toBe('Outstanding Impact');
    expect(result['MANAGER'].reviewer_count).toBe(1);

    // PEER avg = (3 + 2) / 2 = 2.5 → rounded to 3 → Significant
    expect(result['PEER'].score).toBeCloseTo(2.5);
    expect(result['PEER'].reviewer_count).toBe(2);
  });

  it('returns empty object when no reviewers', () => {
    expect(calculateCategoryScores([])).toEqual({});
  });

  it('excludes reviewers with no responses from category buckets', () => {
    const reviewers = [
      { reviewer_type: 'PEER', responses: [] },
      { reviewer_type: 'PEER', responses: [{ rating: 4 }] },
    ];
    const result = calculateCategoryScores(reviewers);
    expect(result['PEER'].reviewer_count).toBe(1);
    expect(result['PEER'].score).toBe(4);
  });
});

// ── calculateSelfScore ───────────────────────────────────

describe('calculateSelfScore', () => {
  it('returns the average of competency ratings', () => {
    const ratings = [
      { competency_id: 'COMM', rating: 4 },
      { competency_id: 'TEAM', rating: 2 },
    ];
    expect(calculateSelfScore(ratings)).toBe(3);
  });

  it('returns null for empty array', () => {
    expect(calculateSelfScore([])).toBeNull();
  });

  it('returns null for undefined', () => {
    expect(calculateSelfScore(undefined)).toBeNull();
  });

  it('rounds to 2 decimal places', () => {
    const ratings = [{ rating: 4 }, { rating: 3 }, { rating: 3 }];
    // avg = 10/3 = 3.333...
    expect(calculateSelfScore(ratings)).toBe(3.33);
  });
});
