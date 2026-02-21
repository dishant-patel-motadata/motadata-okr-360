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
export const createCycleSchema = z
  .object({
    cycle_name: z.string().min(3).max(100),
    start_date: isoDate,
    end_date: isoDate,
    duration_months: z.union([
      z.literal(3),
      z.literal(4),
      z.literal(6),
      z.literal(12),
    ], {
      errorMap: () => ({ message: 'duration_months must be 3, 4, 6, or 12' }),
    }),
    grace_period_days: z.number().int().min(0).max(7).default(3),
    enable_self_feedback: z.boolean().default(true),
    enable_colleague_feedback: z.boolean().default(true),
    reminder_schedule: z
      .array(z.number().int().min(1).max(30))
      .min(1)
      .max(10)
      .default([7, 3, 1]),
  })
  .refine((d) => new Date(d.end_date) > new Date(d.start_date), {
    message: 'end_date must be after start_date',
    path: ['end_date'],
  });

// ── PATCH /cycles/:id ─────────────────────────────────────
// Only allowed while cycle is DRAFT (name, dates, settings)
export const updateCycleSchema = z
  .object({
    cycle_name: z.string().min(3).max(100).optional(),
    start_date: isoDate.optional(),
    end_date: isoDate.optional(),
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
  })
  .refine(
    (d) => {
      if (d.start_date && d.end_date) {
        return new Date(d.end_date) > new Date(d.start_date);
      }
      return true;
    },
    { message: 'end_date must be after start_date', path: ['end_date'] }
  );

// ── GET /cycles?... ────────────────────────────────────────
export const listCyclesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  status: z
    .enum(['DRAFT', 'ACTIVE', 'CLOSING', 'COMPLETED', 'PUBLISHED'])
    .optional(),
});
