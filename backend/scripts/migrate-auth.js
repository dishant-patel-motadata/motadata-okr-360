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
 * What this script does:
 *   1. Connects to the Supabase PostgreSQL database
 *   2. Generates the better-auth schema DDL
 *   3. Executes it via the pg pool
 *   4. Verifies tables were created
 *
 * Safe to re-run (uses IF NOT EXISTS).
 */

import 'dotenv/config';
import { auth, pool } from '../src/config/auth.js';
import { logger } from '../src/utils/logger.js';

const migrate = async () => {
  logger.info('Starting better-auth migration...');

  let client;
  try {
    client = await pool.connect();

    // Generate the SQL schema from the better-auth instance
    // better-auth v1 provides `generateSQL()` or relies on the CLI
    // For pg adapter, we create the tables manually following better-auth's schema spec

    const schema = `
      -- better-auth: user table
      CREATE TABLE IF NOT EXISTS "user" (
        id                TEXT PRIMARY KEY,
        name              TEXT NOT NULL,
        email             TEXT NOT NULL UNIQUE,
        email_verified    BOOLEAN NOT NULL DEFAULT FALSE,
        image             TEXT,
        created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      -- better-auth: session table
      CREATE TABLE IF NOT EXISTS "session" (
        id            TEXT PRIMARY KEY,
        expires_at    TIMESTAMPTZ NOT NULL,
        token         TEXT NOT NULL UNIQUE,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        ip_address    TEXT,
        user_agent    TEXT,
        user_id       TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE
      );

      -- better-auth: account table (stores hashed passwords + OAuth tokens)
      CREATE TABLE IF NOT EXISTS "account" (
        id                        TEXT PRIMARY KEY,
        account_id                TEXT NOT NULL,
        provider_id               TEXT NOT NULL,
        user_id                   TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
        access_token              TEXT,
        refresh_token             TEXT,
        id_token                  TEXT,
        access_token_expires_at   TIMESTAMPTZ,
        refresh_token_expires_at  TIMESTAMPTZ,
        scope                     TEXT,
        password                  TEXT,
        created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      -- better-auth: verification table (email verification tokens)
      CREATE TABLE IF NOT EXISTS "verification" (
        id          TEXT PRIMARY KEY,
        identifier  TEXT NOT NULL,
        value       TEXT NOT NULL,
        expires_at  TIMESTAMPTZ NOT NULL,
        created_at  TIMESTAMPTZ DEFAULT NOW(),
        updated_at  TIMESTAMPTZ DEFAULT NOW()
      );

      -- Indexes for performance
      CREATE INDEX IF NOT EXISTS idx_session_user_id   ON "session"(user_id);
      CREATE INDEX IF NOT EXISTS idx_session_token     ON "session"(token);
      CREATE INDEX IF NOT EXISTS idx_account_user_id   ON "account"(user_id);
      CREATE INDEX IF NOT EXISTS idx_account_provider  ON "account"(provider_id, account_id);
      CREATE INDEX IF NOT EXISTS idx_user_email        ON "user"(email);
      CREATE INDEX IF NOT EXISTS idx_verification_identifier ON "verification"(identifier);
    `;

    await client.query(schema);

    // Verify tables exist
    const result = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN ('user', 'session', 'account', 'verification')
      ORDER BY table_name;
    `);

    const created = result.rows.map((r) => r.table_name);
    logger.info('better-auth tables confirmed:', { tables: created });

    if (created.length !== 4) {
      const missing = ['user', 'session', 'account', 'verification'].filter(
        (t) => !created.includes(t)
      );
      logger.warn('Some tables may not have been created:', { missing });
    } else {
      logger.info('✅  better-auth migration complete — all 4 tables ready.');
    }
  } catch (err) {
    logger.error('Migration failed:', { error: err.message, stack: err.stack });
    process.exit(1);
  } finally {
    if (client) client.release();
    await pool.end();
  }
};

migrate();
