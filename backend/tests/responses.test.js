/**
 * tests/responses.test.js
 *
 * Integration tests for the Survey Response module.
 * Mocks Supabase and better-auth; covers the dual-auth middleware
 * (session token vs. magic-link access_token) and core survey flows.
 *
 * Covers:
 *   GET  /api/v1/surveys/form/:reviewerId          — load survey form
 *   POST /api/v1/surveys/form/:reviewerId/save      — save draft
 *   POST /api/v1/surveys/form/:reviewerId/submit    — submit survey
 *   POST /api/v1/surveys/form/:reviewerId/reopen    — CXO reopen
 */

import request from 'supertest';
import { jest } from '@jest/globals';

// ── Mock better-auth ──────────────────────────────────────
jest.unstable_mockModule('../src/config/auth.js', () => ({
  auth: { api: { getSession: jest.fn() } },
  pool: { end: jest.fn() },
}));

// ── Fixtures ───────────────────────────────────────────────

const REVIEWER_ID = 'reviewer-uuid-1';
const ACCESS_TOKEN = 'access-token-uuid-1';

const CXO_EMPLOYEE = {
  employee_id: 'EMP001',
  full_name: 'Rajesh Kumar',
  email: 'cxo@motadata.com',
  group_name: 'CXO',
  is_active: true,
  department: 'Executive',
};

const IC_REVIEWER_EMPLOYEE = {
  employee_id: 'EMP100',
  full_name: 'Priya Sharma',
  email: 'reviewer@motadata.com',
  group_name: 'IC',
  is_active: true,
  department: 'Engineering',
};

const REVIEWER_CONTEXT = {
  reviewer_id: REVIEWER_ID,
  access_token: ACCESS_TOKEN,
  reviewer_employee_id: 'EMP100',
  reviewer_type: 'PEER',
  question_set: 'IC',
  status: 'PENDING',
  survey_assignments: {
    assignment_id: 'assignment-uuid-1',
    employee_id: 'EMP200',
    cycle_id: 'cycle-uuid-1',
    employees: {
      employee_id: 'EMP200',
      full_name: 'Target Employee',
      department: 'Engineering',
      group_name: 'IC',
    },
    review_cycles: {
      cycle_id: 'cycle-uuid-1',
      cycle_name: 'Q1 2026 Review',
      status: 'ACTIVE',
      end_date: '2026-03-31',
    },
  },
};

const QUESTIONS = [
  { question_id: 'IC-01', question_text: 'Communicates effectively', set_type: 'IC', order_number: 1, category: 'Communication', competency_id: 'COMM', is_active: true },
  { question_id: 'IC-02', question_text: 'Collaborates well', set_type: 'IC', order_number: 2, category: 'Teamwork', competency_id: 'TEAM', is_active: true },
];

// ── Supabase mock factory ─────────────────────────────────

function makeSupabaseMock() {
  return {
    from: jest.fn((table) => {
      if (table === 'employees') return employeeChain();
      if (table === 'survey_reviewers') return reviewerChain();
      if (table === 'questions') return questionsChain();
      if (table === 'survey_responses') return responsesChain();
      if (table === 'survey_comments') return commentsChain();
      if (table === 'survey_assignments') return assignmentChain();
      if (table === 'audit_log') return auditChain();
      return defaultChain();
    }),
  };
}

function employeeChain(emp = IC_REVIEWER_EMPLOYEE) {
  return {
    select: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({ data: emp, error: null }),
      }),
    }),
  };
}

function reviewerChain(reviewer = REVIEWER_CONTEXT) {
  return {
    select: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({ data: reviewer, error: null }),
        maybeSingle: jest.fn().mockResolvedValue({ data: reviewer, error: null }),
        in: jest.fn().mockReturnThis(),
        data: [reviewer],
        error: null,
      }),
    }),
    update: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { ...reviewer, status: 'IN_PROGRESS' },
            error: null,
          }),
        }),
      }),
    }),
  };
}

function questionsChain() {
  return {
    select: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        order: jest.fn().mockResolvedValue({ data: QUESTIONS, error: null }),
        eq: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({ data: QUESTIONS, error: null }),
        }),
      }),
    }),
  };
}

function responsesChain() {
  return {
    select: jest.fn().mockReturnValue({
      // getResponsesByReviewer calls .select().eq().order() — eq must be chainable
      eq: jest.fn().mockReturnValue({
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
      }),
    }),
    // upsertResponses calls .upsert(...).select() — upsert must return chainable object
    upsert: jest.fn().mockReturnValue({
      select: jest.fn().mockResolvedValue({ data: [], error: null }),
    }),
    delete: jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue({ error: null }),
    }),
  };
}

function commentsChain() {
  return {
    select: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
        single: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
      }),
    }),
    insert: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({ data: { comment_text: 'test' }, error: null }),
      }),
    }),
    delete: jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue({ error: null }),
    }),
  };
}

function assignmentChain() {
  return {
    select: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: { assignment_id: 'assignment-uuid-1', status: 'PENDING' },
          error: null,
        }),
      }),
    }),
    update: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnThis(),
      select: jest.fn().mockResolvedValue({ error: null }),
    }),
  };
}

function auditChain() {
  return {
    insert: jest.fn().mockResolvedValue({ error: null }),
  };
}

function defaultChain() {
  return {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
    insert: jest.fn().mockResolvedValue({ error: null }),
    update: jest.fn().mockReturnThis(),
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
  supabaseAdmin.from.mockImplementation((t) => {
    if (t === 'employees') return employeeChain(CXO_EMPLOYEE);
    return makeSupabaseMock().from(t);
  });
}

function asReviewer() {
  auth.api.getSession.mockResolvedValue({
    session: { id: 'sess-reviewer' },
    user: { email: 'reviewer@motadata.com' },
  });
  supabaseAdmin.from.mockImplementation((t) => {
    if (t === 'employees') return employeeChain(IC_REVIEWER_EMPLOYEE);
    return makeSupabaseMock().from(t);
  });
}

// ── Tests: GET /api/v1/surveys/form/:reviewerId ───────────

describe('GET /api/v1/surveys/form/:reviewerId', () => {
  it('returns 401 when no session and no token', async () => {
    auth.api.getSession.mockResolvedValueOnce(null);
    const res = await request(app).get(`/api/v1/surveys/form/${REVIEWER_ID}`);
    expect(res.status).toBe(401);
  });

  it('returns 200 for authenticated reviewer using session', async () => {
    asReviewer();
    const res = await request(app)
      .get(`/api/v1/surveys/form/${REVIEWER_ID}`)
      .set('Cookie', 'session=test');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('reviewer');
    expect(res.body.data).toHaveProperty('questions');
  });

  it('returns 200 via access_token query param (no session needed)', async () => {
    auth.api.getSession.mockResolvedValueOnce(null); // no active session
    supabaseAdmin.from.mockImplementation((t) => {
      if (t === 'survey_reviewers') {
        // token lookup chain
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: REVIEWER_CONTEXT, error: null }),
            }),
          }),
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: REVIEWER_CONTEXT, error: null }),
              }),
            }),
          }),
        };
      }
      return makeSupabaseMock().from(t);
    });

    const res = await request(app)
      .get(`/api/v1/surveys/form/${REVIEWER_ID}?token=${ACCESS_TOKEN}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ── Tests: POST /api/v1/surveys/form/:reviewerId/save ─────

describe('POST /api/v1/surveys/form/:reviewerId/save', () => {
  it('returns 401 when unauthenticated', async () => {
    auth.api.getSession.mockResolvedValueOnce(null);
    const res = await request(app)
      .post(`/api/v1/surveys/form/${REVIEWER_ID}/save`)
      .send({ responses: [{ question_id: 'IC-01', rating: 3 }] });
    expect(res.status).toBe(401);
  });

  it('returns 422 for invalid rating value (out of 1-4 range)', async () => {
    asReviewer();
    const res = await request(app)
      .post(`/api/v1/surveys/form/${REVIEWER_ID}/save`)
      .send({ responses: [{ question_id: 'IC-01', rating: 5 }] })
      .set('Cookie', 'session=test');
    expect(res.status).toBe(422);
  });

  it('returns 422 when responses array is empty', async () => {
    asReviewer();
    const res = await request(app)
      .post(`/api/v1/surveys/form/${REVIEWER_ID}/save`)
      .send({ responses: [] })
      .set('Cookie', 'session=test');
    expect(res.status).toBe(422);
  });

  it('returns 200 with valid responses', async () => {
    asReviewer();
    const res = await request(app)
      .post(`/api/v1/surveys/form/${REVIEWER_ID}/save`)
      .send({
        responses: [
          { question_id: 'IC-01', rating: 3 },
          { question_id: 'IC-02', rating: 4 },
        ],
      })
      .set('Cookie', 'session=test');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('accepts optional comment in body', async () => {
    asReviewer();
    const res = await request(app)
      .post(`/api/v1/surveys/form/${REVIEWER_ID}/save`)
      .send({
        responses: [{ question_id: 'IC-01', rating: 3 }],
        comment: 'Great team player.',
      })
      .set('Cookie', 'session=test');
    expect(res.status).toBe(200);
  });
});

// ── Tests: POST /api/v1/surveys/form/:reviewerId/submit ───

describe('POST /api/v1/surveys/form/:reviewerId/submit', () => {
  it('returns 401 when unauthenticated', async () => {
    auth.api.getSession.mockResolvedValueOnce(null);
    const res = await request(app)
      .post(`/api/v1/surveys/form/${REVIEWER_ID}/submit`)
      .send({ responses: [{ question_id: 'IC-01', rating: 3 }] });
    expect(res.status).toBe(401);
  });

  it('returns 422 when responses array is missing', async () => {
    asReviewer();
    const res = await request(app)
      .post(`/api/v1/surveys/form/${REVIEWER_ID}/submit`)
      .send({})
      .set('Cookie', 'session=test');
    expect(res.status).toBe(422);
  });
});

// ── Tests: POST /api/v1/surveys/form/:reviewerId/reopen ──

describe('POST /api/v1/surveys/form/:reviewerId/reopen', () => {
  it('returns 403 for non-CXO user', async () => {
    asReviewer();
    const res = await request(app)
      .post(`/api/v1/surveys/form/${REVIEWER_ID}/reopen`)
      .set('Cookie', 'session=test');
    expect(res.status).toBe(403);
  });

  it('returns 200 for CXO user', async () => {
    asCxo();
    supabaseAdmin.from.mockImplementation((t) => {
      if (t === 'employees') return employeeChain(CXO_EMPLOYEE);
      if (t === 'survey_reviewers') return reviewerChain({
        ...REVIEWER_CONTEXT,
        status: 'COMPLETED',
      });
      return makeSupabaseMock().from(t);
    });
    const res = await request(app)
      .post(`/api/v1/surveys/form/${REVIEWER_ID}/reopen`)
      .set('Cookie', 'session=test');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
