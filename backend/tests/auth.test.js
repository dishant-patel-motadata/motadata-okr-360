/**
 * tests/auth.test.js
 *
 * Integration tests for the auth module.
 *
 * These tests use supertest to execute requests against the Express app.
 * They mock the Supabase and better-auth clients to avoid DB dependencies.
 *
 * Run: npm test
 */

import request from 'supertest';
import { jest } from '@jest/globals';

// ── Mock better-auth + supabase BEFORE importing app ──────
jest.unstable_mockModule('../src/config/auth.js', () => ({
  auth: {
    api: {
      getSession: jest.fn(),
      signUpEmail: jest.fn(),
    },
  },
  pool: { end: jest.fn() },
}));

jest.unstable_mockModule('../src/config/supabase.js', () => ({
  supabaseAdmin: {
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
      insert: jest.fn().mockResolvedValue({ data: {}, error: null }),
      upsert: jest.fn().mockResolvedValue({ data: {}, error: null }),
    })),
  },
}));

const { default: app } = await import('../src/app.js');
const { auth } = await import('../src/config/auth.js');
const { supabaseAdmin } = await import('../src/config/supabase.js');

describe('GET /health', () => {
  it('returns 200 with healthy status', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('OKR-360 API is healthy');
  });
});

describe('GET /api/v1/auth/me', () => {
  it('returns 401 when no session is active', async () => {
    auth.api.getSession.mockResolvedValueOnce(null);
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('returns 403 when session user has no employee record', async () => {
    auth.api.getSession.mockResolvedValueOnce({
      user: { id: 'auth-uid-1', email: 'unknown@motadata.com' },
    });

    supabaseAdmin.from.mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: new Error('Not found') }),
    });

    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('returns 403 when employee is inactive', async () => {
    auth.api.getSession.mockResolvedValueOnce({
      user: { id: 'auth-uid-1', email: 'emp@motadata.com' },
    });

    supabaseAdmin.from.mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { employee_id: 'EMP001', email: 'emp@motadata.com', group_name: 'IC', is_active: false },
        error: null,
      }),
    });

    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(403);
  });
});

describe('POST /api/v1/auth/seed-admin', () => {
  it('returns 422 when required fields are missing', async () => {
    const res = await request(app)
      .post('/api/v1/auth/seed-admin')
      .send({ email: 'admin@motadata.com' }); // missing password, fullName, employeeId
    expect(res.status).toBe(422);
    expect(res.body.errors).toBeDefined();
  });

  it('returns 422 when password is too weak', async () => {
    const res = await request(app)
      .post('/api/v1/auth/seed-admin')
      .send({
        employeeId: 'ADMIN001',
        fullName: 'Admin User',
        email: 'admin@motadata.com',
        password: 'weak',
      });
    expect(res.status).toBe(422);
  });

  it('returns 403 when a CXO already exists', async () => {
    // Mock: CXO already exists — use explicit mockReturnValue to avoid `this` binding issues
    const existingCxoChain = {
      single: jest.fn().mockResolvedValue({ data: { employee_id: 'EMP001' }, error: null }),
    };
    existingCxoChain.select = jest.fn().mockReturnValue(existingCxoChain);
    existingCxoChain.eq = jest.fn().mockReturnValue(existingCxoChain);
    existingCxoChain.limit = jest.fn().mockReturnValue(existingCxoChain);
    supabaseAdmin.from.mockReturnValueOnce(existingCxoChain);

    const res = await request(app)
      .post('/api/v1/auth/seed-admin')
      .send({
        employeeId: 'ADMIN002',
        fullName: 'Another Admin',
        email: 'another@motadata.com',
        password: 'StrongPass@123',
      });
    expect(res.status).toBe(403);
  });
});

describe('Unknown routes', () => {
  it('returns 404 for unknown routes', async () => {
    const res = await request(app).get('/api/v1/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('NOT_FOUND');
  });
});
