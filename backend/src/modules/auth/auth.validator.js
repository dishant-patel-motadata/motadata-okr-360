/**
 * modules/auth/auth.validator.js
 *
 * Zod schemas for auth module request validation.
 */

import { z } from 'zod';

// ── POST /api/v1/auth/seed-admin ─────────────────────────
export const seedAdminSchema = z.object({
  employeeId: z
    .string()
    .min(1, 'employeeId is required')
    .max(50, 'employeeId must be 50 characters or fewer'),

  fullName: z
    .string()
    .min(2, 'fullName must be at least 2 characters')
    .max(100, 'fullName must be 100 characters or fewer'),

  email: z
    .string()
    .email('Must be a valid email address')
    .toLowerCase(),

  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be 128 characters or fewer')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    ),
});

// ── POST /api/auth/sign-in/email (better-auth handles this) ──────────
// Documented here for reference — validation done by better-auth itself.
// body: { email: string, password: string }
