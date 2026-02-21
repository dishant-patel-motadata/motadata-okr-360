/**
 * modules/selfFeedback/selfFeedback.validator.js
 *
 * Request body schemas for the self-feedback module.
 */

import { z } from 'zod';

// ── Individual rating entry ────────────────────────────────

const ratingEntrySchema = z.object({
  competency_id: z.string().min(2).max(10),
  rating: z
    .number({ invalid_type_error: 'Rating must be a number.' })
    .int()
    .min(1, 'Rating must be at least 1.')
    .max(4, 'Rating must be at most 4.'),
});

// ── Save draft / submit ────────────────────────────────────

/**
 * Used for both POST /self-feedback/:cycleId (save draft)
 * and POST /self-feedback/:cycleId/submit (final submission).
 *
 * Body must contain at least one competency rating.
 */
export const saveSelfFeedbackSchema = z.object({
  competency_ratings: z
    .array(ratingEntrySchema)
    .min(1, 'At least one competency rating is required.'),
});
