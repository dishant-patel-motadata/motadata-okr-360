/**
 * config/env.js
 *
 * Validates and exports all environment variables at startup.
 * If any required variable is missing the process exits with
 * a clear error — preventing silent misconfiguration in prod.
 */

import { z } from 'zod';
import 'dotenv/config';

const envSchema = z.object({
  // Server
  PORT: z.string().default('3000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Supabase
  SUPABASE_URL: z.string().url({ message: 'SUPABASE_URL must be a valid URL' }),
  SUPABASE_ANON_KEY: z.string().min(1, 'SUPABASE_ANON_KEY is required'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY is required'),

  // PostgreSQL direct connection (for better-auth adapter)
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  // better-auth
  BETTER_AUTH_SECRET: z.string().min(32, 'BETTER_AUTH_SECRET must be at least 32 chars'),
  BETTER_AUTH_URL: z.string().url({ message: 'BETTER_AUTH_URL must be a valid URL' }),
  SESSION_EXPIRY_SECONDS: z.string().default('604800'),

  // Supabase Personal Access Token — used only by migrate-auth.js
  SUPABASE_ACCESS_TOKEN: z.string().optional(),

  // Email (SMTP) — optional until Notifications module (STEP 11) is wired in
  SMTP_HOST: z.string().default('localhost'),
  SMTP_PORT: z.string().default('587'),
  SMTP_SECURE: z.string().default('false'),
  SMTP_USER: z.string().default('notifications@localhost'),
  SMTP_PASS: z.string().default(''),
  SMTP_FROM: z.string().default('OKR-360 <notifications@localhost>'),

  // Teams
  TEAMS_WEBHOOK_URL: z.string().url({ message: 'TEAMS_WEBHOOK_URL must be a valid URL' }).optional(),

  // CORS
  CORS_ORIGINS: z.string().default('http://localhost:5173'),

  // Rate limiting
  RATE_LIMIT_WINDOW_MS: z.string().default('900000'),
  RATE_LIMIT_MAX: z.string().default('100'),

  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
  console.error('❌  Invalid environment variables:\n');
  result.error.issues.forEach((issue) => {
    console.error(`   ${issue.path.join('.')} — ${issue.message}`);
  });
  process.exit(1);
}

export const env = result.data;
