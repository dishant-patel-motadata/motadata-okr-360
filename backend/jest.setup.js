/**
 * jest.setup.js
 *
 * Runs before every test file (via jest.config.js → setupFiles).
 * Sets stub environment variables so that src/config/env.js passes Zod
 * validation without a real .env file — real Supabase / better-auth
 * connections are fully mocked inside each test file anyway.
 */

process.env.NODE_ENV = 'test';
process.env.PORT = '3000';

// Supabase — fake but structurally valid values
process.env.SUPABASE_URL = 'https://test-project.supabase.co';
process.env.SUPABASE_ANON_KEY = 'test-anon-key-placeholder';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key-placeholder';

// PostgreSQL direct connection (better-auth adapter)
process.env.DATABASE_URL = 'postgresql://postgres:testpass@localhost:5432/testdb';

// better-auth (secret must be ≥ 32 chars)
process.env.BETTER_AUTH_SECRET = 'test-secret-minimum-32-characters-long-1234';
process.env.BETTER_AUTH_URL = 'http://localhost:3000';

// SMTP — optional, already has defaults in env.js schema
process.env.SMTP_HOST = 'localhost';
process.env.SMTP_PORT = '587';
process.env.SMTP_USER = 'test@localhost';
process.env.SMTP_PASS = '';
process.env.SMTP_FROM = 'OKR-360 <test@localhost>';

// CORS
process.env.CORS_ORIGINS = 'http://localhost:5173';
