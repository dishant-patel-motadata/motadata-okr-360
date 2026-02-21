/**
 * modules/responses/responses.validator.js
 *
 * Request schemas for survey response submission.
 */

import { z } from 'zod';

// ── Individual question response ──────────────────────────────

const responseEntrySchema = z.object({
  question_id: z.string().min(2, 'question_id is required.'),
  rating: z
    .number({ invalid_type_error: 'Rating must be a number.' })
    .int()
    .min(1, 'Rating must be at least 1.')
    .max(4, 'Rating must be at most 4.'),
});

// ── Save draft (partial OK) ───────────────────────────────────

/**
 * Used for both save-draft and submit.
 * `responses` must have at least one entry.
 * `comment` is optional (SC-07).
 */
export const saveSurveySchema = z.object({
  responses: z
    .array(responseEntrySchema)
    .min(1, 'At least one response is required.'),
  comment: z.string().max(5000).optional(),
});

// ── Submit (all questions required) ──────────────────────────

/**
 * For final submit we keep the same schema — completeness
 * (all active questions answered) is validated in the service
 * against the actual question set, not at the Zod level.
 */
export const submitSurveySchema = saveSurveySchema;
