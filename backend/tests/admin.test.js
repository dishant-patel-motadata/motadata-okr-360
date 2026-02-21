/**
 * tests/admin.test.js
 *
 * Integration tests for the Admin module (CXO-only endpoints).
 * Mocks Supabase and better-auth; exercises the Express routes only.
 *
 * Covers:
 *   GET   /api/v1/admin/dashboard          — system health overview
 *   GET   /api/v1/admin/reviewer-config    — read config
 *   PATCH /api/v1/admin/reviewer-config    — update config + validation
 *   GET   /api/v1/admin/audit-logs         — paginated audit viewer
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

const TM_EMPLOYEE = {
  employee_id: 'EMP050',
  full_name: 'Anita Desai',
  email: 'tm@motadata.com',
  group_name: 'TM',
  is_active: true,
  department: 'Engineering',
};

const REVIEWER_CONFIG = {
  config_id: 'config-uuid-1',
  min_reviewers: 2,
  max_reviewers: 8,
  updated_by: 'EMP001',
  updated_at: '2026-01-01T00:00:00Z',
};

const AUDIT_LOG_ENTRY = {
  log_id: 'log-uuid-1',
  user_id: 'EMP001',
  action_type: 'UPDATE',
  entity_type: 'review_cycles',
  entity_id: 'cycle-uuid-1',
  old_value: { status: 'DRAFT' },
  new_value: { status: 'ACTIVE' },
  ip_address: '127.0.0.1',
  created_at: '2026-02-01T00:00:00Z',
};

const ACTIVE_CYCLE = {
  cycle_id: 'cycle-uuid-1',
  cycle_name: 'Q1 2026',
  status: 'ACTIVE',
};

// ── Supabase mock factory ─────────────────────────────────

function makeSupabaseMock(overrideEmployee = CXO_EMPLOYEE) {
  return {
    from: jest.fn((table) => {
      if (table === 'employees') return employeeChain(overrideEmployee);
      if (table === 'reviewer_config') return configChain();
      if (table === 'audit_log') return auditChain();
      if (table === 'review_cycles') return cycleChain();
      if (table === 'survey_assignments') return countChain([]);
      if (table === 'survey_reviewers') return countChain([]);
      if (table === 'self_feedback') return countChain([]);
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
      in: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
    }),
  };
}

function configChain(config = REVIEWER_CONFIG) {
  return {
    select: jest.fn().mockReturnValue({
      order: jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue({
          maybeSingle: jest.fn().mockResolvedValue({ data: config, error: null }),
        }),
      }),
      eq: jest.fn().mockReturnThis(),
    }),
    insert: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({ data: config, error: null }),
      }),
    }),
    update: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { ...config, max_reviewers: 10 },
            error: null,
          }),
        }),
      }),
    }),
  };
}

function auditChain() {
  // Build a thenable terminal object: awaitable (resolves to data) AND chainable (.eq, .gte, .lte)
  // This is needed because getAuditLogs builds the query dynamically:
  //   let query = .select().order().range();
  //   if (filter) query = query.eq(...);
  //   const { data } = await query;
  const resolvedResult = { data: [AUDIT_LOG_ENTRY], error: null, count: 1 };
  const terminal = {
    eq: jest.fn(),
    gte: jest.fn(),
    lte: jest.fn(),
    then: (onFulfilled, onRejected) => Promise.resolve(resolvedResult).then(onFulfilled, onRejected),
  };
  terminal.eq.mockReturnValue(terminal);
  terminal.gte.mockReturnValue(terminal);
  terminal.lte.mockReturnValue(terminal);

  return {
    select: jest.fn().mockReturnValue({
      order: jest.fn().mockReturnValue({
        range: jest.fn().mockReturnValue(terminal),
      }),
    }),
    insert: jest.fn().mockResolvedValue({ error: null }),
  };
}

function cycleChain() {
  return {
    select: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({ data: ACTIVE_CYCLE, error: null }),
      }),
      in: jest.fn().mockReturnValue({
        order: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({ data: ACTIVE_CYCLE, error: null }),
          }),
        }),
      }),
    }),
  };
}

function countChain(rows) {
  return {
    select: jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue({ data: rows, error: null }),
    }),
  };
}

function defaultChain() {
  return {
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockResolvedValue({ error: null }),
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
  supabaseAdmin.from.mockImplementation(makeSupabaseMock(CXO_EMPLOYEE).from);
}

function asTm() {
  auth.api.getSession.mockResolvedValue({
    session: { id: 'sess-tm' },
    user: { email: 'tm@motadata.com' },
  });
  supabaseAdmin.from.mockImplementation(makeSupabaseMock(TM_EMPLOYEE).from);
}

// ── Tests: GET /api/v1/admin/dashboard ────────────────────

describe('GET /api/v1/admin/dashboard', () => {
  it('returns 401 when unauthenticated', async () => {
    auth.api.getSession.mockResolvedValueOnce(null);
    const res = await request(app).get('/api/v1/admin/dashboard');
    expect(res.status).toBe(401);
  });

  it('returns 403 for TM role', async () => {
    asTm();
    const res = await request(app)
      .get('/api/v1/admin/dashboard')
      .set('Cookie', 'session=test');
    expect(res.status).toBe(403);
  });

  it('returns 200 for CXO with dashboard data', async () => {
    asCxo();
    const res = await request(app)
      .get('/api/v1/admin/dashboard')
      .set('Cookie', 'session=test');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('employees');
  });

  it('accepts optional cycle_id query param', async () => {
    asCxo();
    const res = await request(app)
      .get('/api/v1/admin/dashboard?cycle_id=cycle-uuid-1')
      .set('Cookie', 'session=test');
    expect(res.status).toBe(200);
  });

  it('returns 422 for invalid UUID cycle_id', async () => {
    asCxo();
    const res = await request(app)
      .get('/api/v1/admin/dashboard?cycle_id=not-a-uuid')
      .set('Cookie', 'session=test');
    expect(res.status).toBe(422);
  });
});

// ── Tests: GET /api/v1/admin/reviewer-config ─────────────

describe('GET /api/v1/admin/reviewer-config', () => {
  it('returns 403 for non-CXO role', async () => {
    asTm();
    const res = await request(app)
      .get('/api/v1/admin/reviewer-config')
      .set('Cookie', 'session=test');
    expect(res.status).toBe(403);
  });

  it('returns 200 with config for CXO', async () => {
    asCxo();
    const res = await request(app)
      .get('/api/v1/admin/reviewer-config')
      .set('Cookie', 'session=test');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('min_reviewers');
    expect(res.body.data).toHaveProperty('max_reviewers');
  });
});

// ── Tests: PATCH /api/v1/admin/reviewer-config ───────────

describe('PATCH /api/v1/admin/reviewer-config', () => {
  it('returns 403 for non-CXO role', async () => {
    asTm();
    const res = await request(app)
      .patch('/api/v1/admin/reviewer-config')
      .send({ max_reviewers: 10 })
      .set('Cookie', 'session=test');
    expect(res.status).toBe(403);
  });

  it('returns 422 when body is empty object', async () => {
    asCxo();
    const res = await request(app)
      .patch('/api/v1/admin/reviewer-config')
      .send({})
      .set('Cookie', 'session=test');
    expect(res.status).toBe(422);
  });

  it('returns 422 when min > max in payload', async () => {
    asCxo();
    const res = await request(app)
      .patch('/api/v1/admin/reviewer-config')
      .send({ min_reviewers: 10, max_reviewers: 5 })
      .set('Cookie', 'session=test');
    expect(res.status).toBe(422);
  });

  it('returns 200 and updates max_reviewers for CXO', async () => {
    asCxo();
    const res = await request(app)
      .patch('/api/v1/admin/reviewer-config')
      .send({ max_reviewers: 10 })
      .set('Cookie', 'session=test');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('returns 200 when updating both min and max', async () => {
    asCxo();
    const res = await request(app)
      .patch('/api/v1/admin/reviewer-config')
      .send({ min_reviewers: 3, max_reviewers: 12 })
      .set('Cookie', 'session=test');
    expect(res.status).toBe(200);
  });
});

// ── Tests: GET /api/v1/admin/audit-logs ──────────────────

describe('GET /api/v1/admin/audit-logs', () => {
  it('returns 403 for non-CXO role', async () => {
    asTm();
    const res = await request(app)
      .get('/api/v1/admin/audit-logs')
      .set('Cookie', 'session=test');
    expect(res.status).toBe(403);
  });

  it('returns 200 with paginated logs for CXO', async () => {
    asCxo();
    const res = await request(app)
      .get('/api/v1/admin/audit-logs')
      .set('Cookie', 'session=test');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.meta).toHaveProperty('total');
    expect(res.body.meta).toHaveProperty('page');
  });

  it('accepts filter query params without error', async () => {
    asCxo();
    const res = await request(app)
      .get('/api/v1/admin/audit-logs?action_type=UPDATE&entity_type=review_cycles&page=1&limit=10')
      .set('Cookie', 'session=test');
    expect(res.status).toBe(200);
  });

  it('returns 422 for invalid pagination (page=0)', async () => {
    asCxo();
    const res = await request(app)
      .get('/api/v1/admin/audit-logs?page=0')
      .set('Cookie', 'session=test');
    expect(res.status).toBe(422);
  });
});
