/**
 * modules/cycles/cycles.validator.js
 *
 * Zod schemas for review cycle endpoints.
 */

import { z } from 'zod';

// ── Shared date helper ─────────────────────────────────────
const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD format')
  .refine((v) => !isNaN(Date.parse(v)), 'Must be a valid date');

// ── POST /cycles ───────────────────────────────────────────
// Note: end_date is NOT accepted from the client — it is always
// computed in the service as: end_date = start_date + duration_months - 1 day.
export const createCycleSchema = z.object({
  cycle_name: z.string().min(3).max(100),
  start_date: isoDate,
  duration_months: z.union(
    [z.literal(3), z.literal(4), z.literal(6), z.literal(12)],
    { errorMap: () => ({ message: 'duration_months must be 3, 4, 6, or 12' }) }
  ),
  grace_period_days: z.number().int().min(0).max(7).default(3),
  enable_self_feedback: z.boolean().default(true),
  enable_colleague_feedback: z.boolean().default(true),
  reminder_schedule: z
    .array(z.number().int().min(1).max(30))
    .min(1)
    .max(10)
    .default([7, 3, 1]),
});

// ── PATCH /cycles/:id ─────────────────────────────────────
// Only allowed while cycle is DRAFT (name, dates, settings).
// end_date is READ-ONLY after creation — it is always recomputed in
// the service whenever start_date or duration_months changes.
export const updateCycleSchema = z.object({
  cycle_name: z.string().min(3).max(100).optional(),
  start_date: isoDate.optional(),
  duration_months: z
    .union([z.literal(3), z.literal(4), z.literal(6), z.literal(12)])
    .optional(),
  grace_period_days: z.number().int().min(0).max(7).optional(),
  enable_self_feedback: z.boolean().optional(),
  enable_colleague_feedback: z.boolean().optional(),
  reminder_schedule: z
    .array(z.number().int().min(1).max(30))
    .min(1)
    .max(10)
    .optional(),
});

// ── GET /cycles?... ────────────────────────────────────────
export const listCyclesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  status: z
    .enum(['DRAFT', 'ACTIVE', 'CLOSING', 'COMPLETED', 'PUBLISHED'])
    .optional(),
});
