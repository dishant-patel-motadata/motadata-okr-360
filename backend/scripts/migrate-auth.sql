-- better-auth schema migration
-- Column names use camelCase to match better-auth's internal schema exactly.
-- Run this in: Supabase Dashboard → SQL Editor → New Query → Run
-- To reset: run the DROP block first, then the CREATE block.

-- ── Drop existing tables (run this block to reset) ──────────
-- DROP TABLE IF EXISTS "verification" CASCADE;
-- DROP TABLE IF EXISTS "session" CASCADE;
-- DROP TABLE IF EXISTS "account" CASCADE;
-- DROP TABLE IF EXISTS "user" CASCADE;

-- ── Create tables ────────────────────────────────────────────

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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_session_userId      ON "session"("userId");
CREATE INDEX IF NOT EXISTS idx_session_token       ON "session"(token);
CREATE INDEX IF NOT EXISTS idx_account_userId      ON "account"("userId");
CREATE INDEX IF NOT EXISTS idx_account_provider    ON "account"("providerId", "accountId");
CREATE INDEX IF NOT EXISTS idx_user_email          ON "user"(email);
CREATE INDEX IF NOT EXISTS idx_verification_id     ON "verification"(identifier);
