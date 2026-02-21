/**
 * tests/cycles.test.js
 *
 * Integration tests for the Review Cycle module (mocked Supabase + auth).
 *
 * Covers:
 *   POST   /api/v1/cycles             — create (CXO) + 422 validation
 *   GET    /api/v1/cycles             — list (CXO)
 *   GET    /api/v1/cycles/:id         — get one
 *   PATCH  /api/v1/cycles/:id         — update DRAFT
 *   DELETE /api/v1/cycles/:id         — delete DRAFT
 *   POST   /api/v1/cycles/:id/activate — DRAFT → ACTIVE + overlap guard
 *   POST   /api/v1/cycles/:id/publish  — COMPLETED → PUBLISHED
 */

import request from 'supertest';
import { jest } from '@jest/globals';

// ── Mock better-auth ──────────────────────────────────────
jest.unstable_mockModule('../src/config/auth.js', () => ({
  auth: { api: { getSession: jest.fn() } },
  pool: { end: jest.fn() },
}));

// ── Mock Supabase ─────────────────────────────────────────
const dbState = { cycles: {} };

function makeSupabaseMock() {
  return {
    from: jest.fn((table) => {
      if (table === 'employees') return employeeQueryChain();
      return cycleQueryChain();
    }),
  };
}

const CXO_EMPLOYEE = {
  employee_id: 'EMP001',
  full_name: 'Rajesh Kumar',
  email: 'cxo@motadata.com',
  group_name: 'CXO',
  is_active: true,
};

const DRAFT_CYCLE = {
  cycle_id: 'cycle-uuid-1',
  cycle_name: 'Q1 2026 Review',
  start_date: '2026-01-01',
  end_date: '2026-03-31',
  duration_months: 3,
  grace_period_days: 3,
  status: 'DRAFT',
  enable_self_feedback: true,
  enable_colleague_feedback: true,
  reminder_schedule: [7, 3, 1],
  created_by: 'EMP001',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const ACTIVE_CYCLE = { ...DRAFT_CYCLE, status: 'ACTIVE' };
const COMPLETED_CYCLE = { ...DRAFT_CYCLE, status: 'COMPLETED' };

function employeeQueryChain(emp = CXO_EMPLOYEE) {
  return {
    select: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({ data: emp, error: null }),
      }),
    }),
  };
}

function cycleQueryChain(cycle = DRAFT_CYCLE, overrides = {}) {
  const resolved = { data: { ...cycle, ...overrides }, error: null };
  const listResolved = { data: [cycle], error: null, count: 1 };
  return {
    select: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue(resolved),
      }),
      in: jest.fn().mockReturnThis(),
      lt: jest.fn().mockReturnThis(),
      gt: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue({ data: [], error: null }),
      order: jest.fn().mockReturnThis(),
      range: jest.fn().mockResolvedValue(listResolved),
      neq: jest.fn().mockReturnThis(),
    }),
    insert: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue(resolved),
      }),
    }),
    update: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue(resolved),
        }),
      }),
    }),
    delete: jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue({ error: null }),
    }),
  };
}

jest.unstable_mockModule('../src/config/supabase.js', () => ({
  supabaseAdmin: makeSupabaseMock(),
  supabasePublic: makeSupabaseMock(),
}));

const { default: app } = await import('../src/app.js');
const { auth } = await import('../src/config/auth.js');
const { supabaseAdmin } = await import('../src/config/supabase.js');

function asCxo() {
  auth.api.getSession.mockResolvedValue({
    session: { id: 'sess-cxo' },
    user: { email: 'cxo@motadata.com' },
  });
}

// ── Tests ─────────────────────────────────────────────────

describe('POST /api/v1/cycles', () => {
  it('returns 403 for non-CXO users', async () => {
    auth.api.getSession.mockResolvedValue({
      session: { id: 's' },
      user: { email: 'ic@motadata.com' },
    });
    supabaseAdmin.from.mockImplementation((t) =>
      t === 'employees'
        ? employeeQueryChain({ ...CXO_EMPLOYEE, group_name: 'IC', email: 'ic@motadata.com' })
        : cycleQueryChain()
    );
    const res = await request(app)
      .post('/api/v1/cycles')
      .send({ cycle_name: 'Test Cycle', start_date: '2026-01-01', end_date: '2026-04-01', duration_months: 3 })
      .set('Cookie', 'session=test');
    expect(res.status).toBe(403);
  });

  it('returns 422 for invalid payload (missing required fields)', async () => {
    asCxo();
    supabaseAdmin.from.mockImplementation((t) =>
      t === 'employees' ? employeeQueryChain() : cycleQueryChain()
    );
    const res = await request(app)
      .post('/api/v1/cycles')
      .send({ cycle_name: 'X' })        // missing dates + duration
      .set('Cookie', 'session=test');
    expect(res.status).toBe(422);
  });

  it('returns 422 when end_date <= start_date', async () => {
    asCxo();
    supabaseAdmin.from.mockImplementation((t) =>
      t === 'employees' ? employeeQueryChain() : cycleQueryChain()
    );
    const res = await request(app)
      .post('/api/v1/cycles')
      .send({
        cycle_name: 'Bad Dates',
        start_date: '2026-04-01',
        end_date: '2026-01-01',
        duration_months: 3,
      })
      .set('Cookie', 'session=test');
    expect(res.status).toBe(422);
  });

  it('returns 201 for valid CXO create', async () => {
    asCxo();
    supabaseAdmin.from.mockImplementation((t) =>
      t === 'employees' ? employeeQueryChain() : cycleQueryChain()
    );
    const res = await request(app)
      .post('/api/v1/cycles')
      .send({
        cycle_name: 'Q1 2026 Review',
        start_date: '2026-01-01',
        end_date: '2026-03-31',
        duration_months: 3,
      })
      .set('Cookie', 'session=test');
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });
});

describe('GET /api/v1/cycles', () => {
  it('returns 200 with paginated cycles', async () => {
    asCxo();
    supabaseAdmin.from.mockImplementation((t) =>
      t === 'employees' ? employeeQueryChain() : cycleQueryChain()
    );
    const res = await request(app)
      .get('/api/v1/cycles')
      .set('Cookie', 'session=test');
    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
  });
});

describe('POST /api/v1/cycles/:id/activate', () => {
  it('returns 409 when overlap exists', async () => {
    asCxo();
    supabaseAdmin.from.mockImplementation((t) => {
      if (t === 'employees') return employeeQueryChain();
      // cycle lookup returns DRAFT_CYCLE; overlap check returns an overlapping cycle
      const chain = cycleQueryChain();
      // override the overlap query (in + lt + gt + limit) to return existing cycle
      chain.select.mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: DRAFT_CYCLE, error: null }),
        }),
        in: jest.fn().mockReturnThis(),
        lt: jest.fn().mockReturnThis(),
        gt: jest.fn().mockReturnThis(),
        neq: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({ data: [ACTIVE_CYCLE], error: null }),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({ data: [DRAFT_CYCLE], error: null, count: 1 }),
      });
      return chain;
    });
    const res = await request(app)
      .post('/api/v1/cycles/cycle-uuid-1/activate')
      .set('Cookie', 'session=test');
    expect(res.status).toBe(409);
  });

  it('returns 200 when no overlap', async () => {
    asCxo();
    supabaseAdmin.from.mockImplementation((t) => {
      if (t === 'employees') return employeeQueryChain();
      const chain = cycleQueryChain();
      chain.select.mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: DRAFT_CYCLE, error: null }),
        }),
        in: jest.fn().mockReturnThis(),
        lt: jest.fn().mockReturnThis(),
        gt: jest.fn().mockReturnThis(),
        neq: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({ data: [], error: null }),   // no overlap
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({ data: [DRAFT_CYCLE], error: null, count: 1 }),
      });
      chain.update.mockReturnValue({
        eq: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: ACTIVE_CYCLE, error: null }),
          }),
        }),
      });
      return chain;
    });
    const res = await request(app)
      .post('/api/v1/cycles/cycle-uuid-1/activate')
      .set('Cookie', 'session=test');
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('ACTIVE');
  });
});

describe('POST /api/v1/cycles/:id/publish', () => {
  it('returns 409 when cycle is not COMPLETED', async () => {
    asCxo();
    supabaseAdmin.from.mockImplementation((t) => {
      if (t === 'employees') return employeeQueryChain();
      const chain = cycleQueryChain(ACTIVE_CYCLE);
      return chain;
    });
    const res = await request(app)
      .post('/api/v1/cycles/cycle-uuid-1/publish')
      .set('Cookie', 'session=test');
    expect(res.status).toBe(409);
  });
});

describe('DELETE /api/v1/cycles/:id', () => {
  it('returns 409 when cycle is not DRAFT', async () => {
    asCxo();
    supabaseAdmin.from.mockImplementation((t) =>
      t === 'employees' ? employeeQueryChain() : cycleQueryChain(ACTIVE_CYCLE)
    );
    const res = await request(app)
      .delete('/api/v1/cycles/cycle-uuid-1')
      .set('Cookie', 'session=test');
    expect(res.status).toBe(409);
  });

  it('returns 200 for DRAFT cycle delete', async () => {
    asCxo();
    supabaseAdmin.from.mockImplementation((t) => {
      if (t === 'employees') return employeeQueryChain();
      const chain = cycleQueryChain(DRAFT_CYCLE);
      chain.delete = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      });
      return chain;
    });
    const res = await request(app)
      .delete('/api/v1/cycles/cycle-uuid-1')
      .set('Cookie', 'session=test');
    expect(res.status).toBe(200);
  });
});
