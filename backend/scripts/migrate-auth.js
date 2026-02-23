/**
 * scripts/migrate-auth.js
 *
 * Generates and applies the better-auth database schema to Supabase.
 *
 * better-auth manages its own tables (user, session, account, verification).
 * These are SEPARATE from the 15 business tables in 02-database-setup.sql.
 *
 * Run once before first server start:
 *   node scripts/migrate-auth.js
 *
 * Connection strategy (tried in order):
 *   1. Supabase Management API (HTTPS) — requires SUPABASE_ACCESS_TOKEN in .env
 *      Get a token at: https://supabase.com/dashboard/account/tokens
 *   2. Direct pg connection — requires DATABASE_URL to be reachable
 *
 * Safe to re-run (uses IF NOT EXISTS).
 */

import 'dotenv/config';
import { logger } from '../src/utils/logger.js';

const PROJECT_REF = 'vfpjywuhqegxbfftfvbl';
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const DATABASE_URL = process.env.DATABASE_URL;

// Drop old tables first (handles schema migration from snake_case to camelCase)
const dropSchema = `
  DROP TABLE IF EXISTS "verification" CASCADE;
  DROP TABLE IF EXISTS "session" CASCADE;
  DROP TABLE IF EXISTS "account" CASCADE;
  DROP TABLE IF EXISTS "user" CASCADE;
`;

// Column names use camelCase — must match better-auth's internal schema exactly
const schema = `
  CREATE TABLE IF NOT EXISTS "user" (
    id              TEXT PRIMARY KEY,
    name            TEXT NOT NULL,
    email           TEXT NOT NULL UNIQUE,
    "emailVerified" BOOLEAN NOT NULL DEFAULT FALSE,
    image           TEXT,
    "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS "session" (
    id            TEXT PRIMARY KEY,
    "expiresAt"   TIMESTAMPTZ NOT NULL,
    token         TEXT NOT NULL UNIQUE,
    "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "ipAddress"   TEXT,
    "userAgent"   TEXT,
    "userId"      TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS "account" (
    id                       TEXT PRIMARY KEY,
    "accountId"              TEXT NOT NULL,
    "providerId"             TEXT NOT NULL,
    "userId"                 TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    "accessToken"            TEXT,
    "refreshToken"           TEXT,
    "idToken"                TEXT,
    "accessTokenExpiresAt"   TIMESTAMPTZ,
    "refreshTokenExpiresAt"  TIMESTAMPTZ,
    scope                    TEXT,
    password                 TEXT,
    "createdAt"              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt"              TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS "verification" (
    id            TEXT PRIMARY KEY,
    identifier    TEXT NOT NULL,
    value         TEXT NOT NULL,
    "expiresAt"   TIMESTAMPTZ NOT NULL,
    "createdAt"   TIMESTAMPTZ DEFAULT NOW(),
    "updatedAt"   TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE INDEX IF NOT EXISTS idx_session_userId    ON "session"("userId");
  CREATE INDEX IF NOT EXISTS idx_session_token     ON "session"(token);
  CREATE INDEX IF NOT EXISTS idx_account_userId    ON "account"("userId");
  CREATE INDEX IF NOT EXISTS idx_account_provider  ON "account"("providerId", "accountId");
  CREATE INDEX IF NOT EXISTS idx_user_email        ON "user"(email);
  CREATE INDEX IF NOT EXISTS idx_verification_id   ON "verification"(identifier);
`;

const verifyQuery = `
  SELECT table_name
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name IN ('user', 'session', 'account', 'verification')
  ORDER BY table_name;
`;

// ── Strategy 1: Supabase Management API (HTTPS — no TCP required) ──────────
async function migrateViaManagementApi() {
  if (!ACCESS_TOKEN || ACCESS_TOKEN === 'your-personal-access-token-here') {
    throw new Error(
      'SUPABASE_ACCESS_TOKEN not set. ' +
      'Generate one at https://supabase.com/dashboard/account/tokens and add it to .env'
    );
  }

  const base = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`;
  const headers = {
    Authorization: `Bearer ${ACCESS_TOKEN}`,
    'Content-Type': 'application/json',
  };

  logger.info('Running migration via Supabase Management API...');

  // Drop old tables (handles snake_case → camelCase schema migration)
  const dropRes = await fetch(base, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query: dropSchema }),
  });
  if (!dropRes.ok) {
    const body = await dropRes.text();
    throw new Error(`Management API DROP failed (${dropRes.status}): ${body}`);
  }

  // Execute DDL
  const ddlRes = await fetch(base, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query: schema }),
  });

  if (!ddlRes.ok) {
    const body = await ddlRes.text();
    throw new Error(`Management API DDL failed (${ddlRes.status}): ${body}`);
  }

  // Verify tables
  const verifyRes = await fetch(base, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query: verifyQuery }),
  });

  if (!verifyRes.ok) {
    const body = await verifyRes.text();
    throw new Error(`Management API verify failed (${verifyRes.status}): ${body}`);
  }

  // Management API returns rows as a plain array (not wrapped in { data: [...] })
  const rows = await verifyRes.json();
  const tableNames = Array.isArray(rows) ? rows : (rows.data ?? rows.result ?? []);
  return tableNames.map((r) => r.table_name);
}

// ── Strategy 2: Direct pg connection ────────────────────────────────────────
async function migrateViaPg() {
  // Dynamic import so missing pg doesn't crash the Management API path
  const { Pool } = await import('pg');
  const { default: dns } = await import('node:dns');
  dns.setDefaultResultOrder('ipv4first');

  if (!DATABASE_URL) throw new Error('DATABASE_URL is not set');

  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 8000,
    family: 4,
  });

  logger.info('Running migration via direct pg connection...');

  const client = await pool.connect();
  try {
    await client.query(dropSchema);
    await client.query(schema);

    const result = await client.query(verifyQuery);
    return result.rows.map((r) => r.table_name);
  } finally {
    client.release();
    await pool.end();
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────
const migrate = async () => {
  logger.info('Starting better-auth migration...');

  let created;
  let usedStrategy;

  // Try Management API first (works even without direct TCP access)
  try {
    created = await migrateViaManagementApi();
    usedStrategy = 'Management API';
  } catch (apiErr) {
    logger.warn(`Management API unavailable: ${apiErr.message}`);
    logger.info('Falling back to direct pg connection...');

    try {
      created = await migrateViaPg();
      usedStrategy = 'direct pg';
    } catch (pgErr) {
      logger.error('Both migration strategies failed.', {
        managementApi: apiErr.message,
        pg: pgErr.message,
      });
      logger.error(
        '\n  To fix:\n' +
        '  1. Add your Supabase Personal Access Token to .env:\n' +
        '     SUPABASE_ACCESS_TOKEN=<token from https://supabase.com/dashboard/account/tokens>\n' +
        '  2. OR paste scripts/migrate-auth.sql into the Supabase SQL Editor manually.\n'
      );
      process.exit(1);
    }
  }

  logger.info(`Migration ran via ${usedStrategy}.`);

  const missing = ['user', 'session', 'account', 'verification'].filter(
    (t) => !created.includes(t)
  );

  if (missing.length > 0) {
    logger.warn('Some tables may be missing:', { missing });
  } else {
    logger.info('✅  better-auth migration complete — all 4 tables ready.', { tables: created });
  }
};

migrate();
