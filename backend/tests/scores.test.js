/**
 * tests/scores.test.js
 *
 * Integration tests for the Score Calculation module.
 * Mocks Supabase and better-auth; exercises the Express routes only.
 *
 * Covers:
 *   GET  /api/v1/scores/my                                        — authenticated employee
 *   GET  /api/v1/scores/cycle/:cycleId                            — CXO only
 *   POST /api/v1/scores/cycle/:cycleId/recalculate                — CXO only
 *   GET  /api/v1/scores/employee/:employeeId/cycle/:cycleId       — self or TM/HOD/CXO
 */

import request from 'supertest';
import { jest } from '@jest/globals';

// ── Mock better-auth ──────────────────────────────────────
jest.unstable_mockModule('../src/config/auth.js', () => ({
  auth: { api: { getSession: jest.fn() } },
  pool: { end: jest.fn() },
}));

// ── Fixtures ───────────────────────────────────────────────

const CXO_EMPLOYEE = {
  employee_id: 'EMP001',
  full_name: 'Rajesh Kumar',
  email: 'cxo@motadata.com',
  group_name: 'CXO',
  is_active: true,
  department: 'Executive',
};

const IC_EMPLOYEE = {
  employee_id: 'EMP100',
  full_name: 'Priya Sharma',
  email: 'ic@motadata.com',
  group_name: 'IC',
  is_active: true,
  department: 'Engineering',
};

const CALC_SCORE = {
  calc_id: 'calc-uuid-1',
  employee_id: 'EMP100',
  cycle_id: 'cycle-uuid-1',
  colleague_score: 3.5,
  self_score: 3.0,
  final_label: 'Outstanding Impact',
  competency_scores: { COMM: { score: 3.5, label: 'Outstanding Impact', response_count: 4 } },
  reviewer_category_scores: { PEER: { score: 3.5, label: 'Outstanding Impact', reviewer_count: 2 } },
  total_reviewers: 4,
  calculated_at: '2026-02-01T00:00:00Z',
  employees: { employee_id: 'EMP100', full_name: 'Priya Sharma', department: 'Engineering' },
  review_cycles: { cycle_id: 'cycle-uuid-1', cycle_name: 'Q1 2026 Review', status: 'COMPLETED' },
};

const COMPLETED_CYCLE = {
  cycle_id: 'cycle-uuid-1',
  cycle_name: 'Q1 2026 Review',
  status: 'COMPLETED',
};

// ── Supabase mock factory ─────────────────────────────────

function makeSupabaseMock() {
  return {
    from: jest.fn((table) => {
      if (table === 'employees') return employeeChain();
      if (table === 'calculated_scores') return scoreChain();
      if (table === 'review_cycles') return cycleChain();
      if (table === 'survey_assignments') return assignmentChain();
      if (table === 'survey_reviewers') return reviewerChain();
      if (table === 'questions') return questionsChain();
      if (table === 'self_feedback') return selfChain();
      return defaultChain();
    }),
  };
}

function employeeChain(emp = CXO_EMPLOYEE) {
  return {
    select: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({ data: emp, error: null }),
        maybeSingle: jest.fn().mockResolvedValue({ data: emp, error: null }),
      }),
    }),
  };
}

function scoreChain(score = CALC_SCORE) {
  return {
    select: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: score, error: null }),
      maybeSingle: jest.fn().mockResolvedValue({ data: score, error: null }),
      range: jest.fn().mockResolvedValue({ data: [score], error: null, count: 1 }),
    }),
    upsert: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({ data: score, error: null }),
      }),
    }),
  };
}

function cycleChain(cycle = COMPLETED_CYCLE) {
  return {
    select: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({ data: cycle, error: null }),
        maybeSingle: jest.fn().mockResolvedValue({ data: cycle, error: null }),
      }),
      in: jest.fn().mockReturnValue({
        order: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue({ data: [cycle], error: null }),
        }),
      }),
    }),
  };
}

function assignmentChain() {
  return {
    select: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
        in: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({ data: [], error: null, count: 0 }),
      }),
    }),
  };
}

function reviewerChain() {
  return {
    select: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      range: jest.fn().mockResolvedValue({ data: [], error: null }),
    }),
  };
}

function questionsChain() {
  return {
    select: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnThis(),
      in: jest.fn().mockResolvedValue({ data: [], error: null }),
      order: jest.fn().mockResolvedValue({ data: [], error: null }),
    }),
  };
}

function selfChain() {
  return {
    select: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
      }),
    }),
  };
}

function defaultChain() {
  return {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
  };
}

jest.unstable_mockModule('../src/config/supabase.js', () => ({
  supabaseAdmin: makeSupabaseMock(),
}));

const { default: app } = await import('../src/app.js');
const { auth } = await import('../src/config/auth.js');
const { supabaseAdmin } = await import('../src/config/supabase.js');

// ── Session helpers ────────────────────────────────────────

function asCxo() {
  auth.api.getSession.mockResolvedValue({
    session: { id: 'sess-cxo' },
    user: { email: 'cxo@motadata.com' },
  });
  supabaseAdmin.from.mockImplementation((t) =>
    t === 'employees' ? employeeChain(CXO_EMPLOYEE) : makeSupabaseMock().from(t)
  );
}

function asIc() {
  auth.api.getSession.mockResolvedValue({
    session: { id: 'sess-ic' },
    user: { email: 'ic@motadata.com' },
  });
  supabaseAdmin.from.mockImplementation((t) =>
    t === 'employees' ? employeeChain(IC_EMPLOYEE) : makeSupabaseMock().from(t)
  );
}

// ── Tests: GET /api/v1/scores/my ──────────────────────────

describe('GET /api/v1/scores/my', () => {
  it('returns 401 when unauthenticated', async () => {
    auth.api.getSession.mockResolvedValueOnce(null);
    const res = await request(app).get('/api/v1/scores/my');
    expect(res.status).toBe(401);
  });

  it('returns 200 with data for authenticated IC', async () => {
    asIc();
    // Make scores return data for IC
    supabaseAdmin.from.mockImplementation((t) => {
      if (t === 'employees') return employeeChain(IC_EMPLOYEE);
      if (t === 'calculated_scores') return scoreChain();
      return defaultChain();
    });
    const res = await request(app).get('/api/v1/scores/my');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ── Tests: GET /api/v1/scores/cycle/:cycleId ─────────────

describe('GET /api/v1/scores/cycle/:cycleId', () => {
  it('returns 403 for IC user', async () => {
    asIc();
    const res = await request(app)
      .get('/api/v1/scores/cycle/cycle-uuid-1')
      .set('Cookie', 'session=test');
    expect(res.status).toBe(403);
  });

  it('returns 200 for CXO user', async () => {
    asCxo();
    supabaseAdmin.from.mockImplementation((t) => {
      if (t === 'employees') return employeeChain(CXO_EMPLOYEE);
      if (t === 'review_cycles') return cycleChain(COMPLETED_CYCLE);
      if (t === 'calculated_scores') return scoreChain();
      return defaultChain();
    });
    const res = await request(app)
      .get('/api/v1/scores/cycle/cycle-uuid-1')
      .set('Cookie', 'session=test');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ── Tests: POST /api/v1/scores/cycle/:cycleId/recalculate

describe('POST /api/v1/scores/cycle/:cycleId/recalculate', () => {
  it('returns 403 for non-CXO role', async () => {
    asIc();
    const res = await request(app)
      .post('/api/v1/scores/cycle/cycle-uuid-1/recalculate')
      .set('Cookie', 'session=test');
    expect(res.status).toBe(403);
  });

  it('returns 200 for CXO user with recalculation summary', async () => {
    asCxo();
    supabaseAdmin.from.mockImplementation((t) => {
      if (t === 'employees') return employeeChain(CXO_EMPLOYEE);
      if (t === 'review_cycles') return cycleChain(COMPLETED_CYCLE);
      if (t === 'survey_assignments') return assignmentChain();
      if (t === 'calculated_scores') return scoreChain();
      if (t === 'questions') return questionsChain();
      if (t === 'audit_log') return {
        insert: jest.fn().mockResolvedValue({ error: null }),
      };
      return defaultChain();
    });
    const res = await request(app)
      .post('/api/v1/scores/cycle/cycle-uuid-1/recalculate')
      .set('Cookie', 'session=test');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ── Tests: GET /api/v1/scores/employee/:id/cycle/:cid ────

describe('GET /api/v1/scores/employee/:employeeId/cycle/:cycleId', () => {
  it('returns 401 when no session', async () => {
    auth.api.getSession.mockResolvedValueOnce(null);
    const res = await request(app).get('/api/v1/scores/employee/EMP100/cycle/cycle-uuid-1');
    expect(res.status).toBe(401);
  });

  it('returns 200 when IC fetches own score', async () => {
    asIc();
    supabaseAdmin.from.mockImplementation((t) => {
      if (t === 'employees') return employeeChain(IC_EMPLOYEE);
      if (t === 'calculated_scores') return scoreChain();
      return defaultChain();
    });
    const res = await request(app)
      .get('/api/v1/scores/employee/EMP100/cycle/cycle-uuid-1')
      .set('Cookie', 'session=test');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('returns 403 when IC tries to view another employee score', async () => {
    asIc();
    const res = await request(app)
      .get('/api/v1/scores/employee/EMP002/cycle/cycle-uuid-1')
      .set('Cookie', 'session=test');
    expect(res.status).toBe(403);
  });
});
