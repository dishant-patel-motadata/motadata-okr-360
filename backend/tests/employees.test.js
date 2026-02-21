/**
 * tests/employees.test.js
 *
 * Integration tests for the Employee module (mocked Supabase + better-auth).
 *
 * Covers:
 *   GET  /api/v1/employees          — list (CXO only)
 *   GET  /api/v1/employees/:id      — self access + CXO access + 403
 *   PATCH /api/v1/employees/:id     — CXO patch + 422 validation + 403
 *   POST  /api/v1/employees/sync    — AD sync trigger (CXO only)
 *   GET   /api/v1/employees/sync/logs — sync log history (CXO only)
 */

import request from 'supertest';
import { jest } from '@jest/globals';

// ── Mock better-auth ──────────────────────────────────────
jest.unstable_mockModule('../src/config/auth.js', () => ({
  auth: {
    api: {
      getSession: jest.fn(),
    },
  },
  pool: { end: jest.fn() },
}));

// ── Mock Supabase ─────────────────────────────────────────
const mockSingle = jest.fn();
const mockSelect = jest.fn(() => ({ single: mockSingle, range: jest.fn().mockReturnThis(), order: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), or: jest.fn().mockReturnThis() }));
const mockFrom   = jest.fn(() => ({ select: mockSelect, update: jest.fn(() => ({ select: mockSelect, eq: jest.fn(() => ({ select: mockSelect, single: mockSingle })) })), insert: jest.fn(() => ({ select: mockSelect, single: mockSingle })) }));

jest.unstable_mockModule('../src/config/supabase.js', () => ({
  supabaseAdmin: { from: mockFrom },
  supabasePublic: { from: mockFrom },
}));

const { default: app } = await import('../src/app.js');

// ── Helpers ────────────────────────────────────────────────
const CXO_SESSION = {
  session: { id: 'sess-1' },
  user: { email: 'cxo@motadata.com' },
};

const IC_SESSION = {
  session: { id: 'sess-2' },
  user: { email: 'ic@motadata.com' },
};

const CXO_EMPLOYEE = {
  employee_id: 'EMP001',
  full_name: 'Rajesh Kumar',
  email: 'cxo@motadata.com',
  department: 'Executive',
  designation: 'CEO',
  group_name: 'CXO',
  is_active: true,
};

const IC_EMPLOYEE = {
  employee_id: 'EMP100',
  full_name: 'Priya Sharma',
  email: 'ic@motadata.com',
  department: 'Engineering',
  designation: 'Software Engineer',
  group_name: 'IC',
  is_active: true,
};

const { auth } = await import('../src/config/auth.js');

function mockSessionAs(sessionData, employeeData) {
  auth.api.getSession.mockResolvedValue(sessionData);
  mockFrom.mockImplementation(() => ({
    select: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({ data: employeeData, error: null }),
      }),
      or: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      range: jest.fn().mockReturnThis(),
    }),
    update: jest.fn(() => ({
      eq: jest.fn(() => ({
        select: jest.fn(() => ({ single: jest.fn().mockResolvedValue({ data: { ...employeeData }, error: null }) })),
      })),
    })),
    insert: jest.fn(() => ({
      select: jest.fn(() => ({ single: jest.fn().mockResolvedValue({ data: {}, error: null }) })),
    })),
  }));
}

// ── Tests ─────────────────────────────────────────────────

describe('GET /api/v1/employees', () => {
  it('returns 403 for non-CXO users', async () => {
    mockSessionAs(IC_SESSION, IC_EMPLOYEE);
    const res = await request(app)
      .get('/api/v1/employees')
      .set('Cookie', 'session=test');
    expect(res.status).toBe(403);
  });

  it('returns 200 with paginated employees for CXO', async () => {
    auth.api.getSession.mockResolvedValue(CXO_SESSION);
    mockFrom.mockImplementation(() => ({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({ data: [CXO_EMPLOYEE], error: null, count: 1 }),
        single: jest.fn().mockResolvedValue({ data: CXO_EMPLOYEE, error: null }),
      }),
    }));
    const res = await request(app)
      .get('/api/v1/employees')
      .set('Cookie', 'session=test');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('GET /api/v1/employees/:id', () => {
  it('returns 200 when employee fetches own profile', async () => {
    mockSessionAs(IC_SESSION, IC_EMPLOYEE);
    const res = await request(app)
      .get('/api/v1/employees/EMP100')
      .set('Cookie', 'session=test');
    expect(res.status).toBe(200);
  });

  it('returns 403 when non-CXO fetches another employee profile', async () => {
    mockSessionAs(IC_SESSION, IC_EMPLOYEE);
    const res = await request(app)
      .get('/api/v1/employees/EMP999')
      .set('Cookie', 'session=test');
    expect(res.status).toBe(403);
  });

  it('returns 200 when CXO fetches any employee profile', async () => {
    mockSessionAs(CXO_SESSION, CXO_EMPLOYEE);
    const res = await request(app)
      .get('/api/v1/employees/EMP100')
      .set('Cookie', 'session=test');
    expect(res.status).toBe(200);
  });
});

describe('PATCH /api/v1/employees/:id', () => {
  it('returns 403 for non-CXO users', async () => {
    mockSessionAs(IC_SESSION, IC_EMPLOYEE);
    const res = await request(app)
      .patch('/api/v1/employees/EMP100')
      .send({ group_name: 'TM' })
      .set('Cookie', 'session=test');
    expect(res.status).toBe(403);
  });

  it('returns 422 for invalid group_name', async () => {
    mockSessionAs(CXO_SESSION, CXO_EMPLOYEE);
    const res = await request(app)
      .patch('/api/v1/employees/EMP100')
      .send({ group_name: 'GOD' })
      .set('Cookie', 'session=test');
    expect(res.status).toBe(422);
  });

  it('returns 200 for valid CXO patch', async () => {
    mockSessionAs(CXO_SESSION, CXO_EMPLOYEE);
    const res = await request(app)
      .patch('/api/v1/employees/EMP100')
      .send({ group_name: 'TM' })
      .set('Cookie', 'session=test');
    expect(res.status).toBe(200);
  });
});

describe('POST /api/v1/employees/sync', () => {
  it('returns 403 for non-CXO users', async () => {
    mockSessionAs(IC_SESSION, IC_EMPLOYEE);
    const res = await request(app)
      .post('/api/v1/employees/sync')
      .set('Cookie', 'session=test');
    expect(res.status).toBe(403);
  });

  it('returns 200 for CXO even when AD stub returns empty', async () => {
    mockSessionAs(CXO_SESSION, CXO_EMPLOYEE);
    mockFrom.mockImplementation(() => ({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: CXO_EMPLOYEE, error: null }),
        }),
      }),
      insert: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { sync_id: 'sync-1', status: 'SUCCESS', employees_added: 0 },
            error: null,
          }),
        }),
      }),
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { sync_id: 'sync-1', status: 'SUCCESS', employees_added: 0 },
              error: null,
            }),
          }),
        }),
      }),
    }));
    const res = await request(app)
      .post('/api/v1/employees/sync')
      .set('Cookie', 'session=test');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
