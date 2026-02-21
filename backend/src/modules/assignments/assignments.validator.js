/**
 * modules/assignments/assignments.validator.js
 *
 * Request validation schemas for survey assignment management.
 */

import { z } from 'zod';

export const REVIEWER_TYPES = [
  'MANAGER',
  'PEER',
  'DIRECT_REPORT',
  'INDIRECT_REPORT',
  'CROSS_FUNCTIONAL',
  'CXO',
];

// ── Create an assignment (one employee enrolled in one cycle) ─

export const createAssignmentSchema = z.object({
  employee_id: z.string().min(1, 'employee_id is required.'),
  cycle_id:    z.string().uuid('cycle_id must be a valid UUID.'),
});

// ── List assignments query ────────────────────────────────────

export const listAssignmentsQuerySchema = z.object({
  cycle_id:    z.string().uuid('cycle_id must be a valid UUID.'),
  status:      z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED']).optional(),
  employee_id: z.string().optional(),
  department:  z.string().optional(),
  page:        z.coerce.number().int().min(1).default(1),
  limit:       z.coerce.number().int().min(1).max(200).default(50),
});

// ── Add a single reviewer to an assignment ────────────────────

export const addReviewerSchema = z.object({
  assignment_id:        z.string().uuid('assignment_id must be a valid UUID.'),
  reviewer_employee_id: z.string().min(1, 'reviewer_employee_id is required.'),
  reviewer_type:        z.enum(REVIEWER_TYPES, {
    errorMap: () => ({
      message: `reviewer_type must be one of: ${REVIEWER_TYPES.join(', ')}.`,
    }),
  }),
});

// ── CSV bulk row schema ───────────────────────────────────────
// Expected CSV columns (header row required):
//   employee_id, cycle_id, reviewer_employee_id, reviewer_type

export const csvReviewerRowSchema = z.object({
  employee_id:          z.string().min(1),
  cycle_id:             z.string().uuid(),
  reviewer_employee_id: z.string().min(1),
  reviewer_type:        z.enum(REVIEWER_TYPES),
});
