/**
 * modules/admin/admin.validator.js
 *
 * Zod schemas for the Admin module endpoints.
 */

import { z } from 'zod';

// ── Reviewer Config ────────────────────────────────────────

/**
 * PATCH /admin/reviewer-config
 * At least one field must be present.
 */
export const updateReviewerConfigSchema = z
  .object({
    min_reviewers: z.number().int().min(1).max(20).optional(),
    max_reviewers: z.number().int().min(1).max(50).optional(),
  })
  .refine((data) => data.min_reviewers !== undefined || data.max_reviewers !== undefined, {
    message: 'At least one of min_reviewers or max_reviewers must be provided.',
  })
  .refine(
    (data) => {
      if (data.min_reviewers !== undefined && data.max_reviewers !== undefined) {
        return data.min_reviewers <= data.max_reviewers;
      }
      return true;
    },
    { message: 'min_reviewers must be less than or equal to max_reviewers.' }
  );

// ── Audit Log Query ────────────────────────────────────────

export const auditLogQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  action_type: z.string().optional(),
  entity_type: z.string().optional(),
  entity_id: z.string().optional(),
  user_id: z.string().optional(),
  from: z.string().datetime({ offset: true }).optional(),
  to: z.string().datetime({ offset: true }).optional(),
});

// ── Dashboard Query ────────────────────────────────────────

export const dashboardQuerySchema = z.object({
  cycle_id: z.string().uuid().optional(),
});
