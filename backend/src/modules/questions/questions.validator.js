/**
 * modules/questions/questions.validator.js
 */

import { z } from 'zod';

export const createQuestionSchema = z.object({
  question_id: z
    .string()
    .regex(/^(IC|TM|HOD)-\d{2}$/, 'question_id must match IC-01, TM-02, HOD-03 pattern')
    .optional(), // if omitted, service auto-generates
  set_type: z.enum(['IC', 'TM', 'HOD']),
  order_number: z.number().int().min(1).max(99),
  question_text: z.string().min(5).max(500),
  category: z.string().min(2).max(100),
  competency_id: z.string().min(2).max(10),
});

export const updateQuestionSchema = z.object({
  question_text: z.string().min(5).max(500).optional(),
  category: z.string().min(2).max(100).optional(),
  competency_id: z.string().min(2).max(10).optional(),
  is_active: z.boolean().optional(),
});

export const listQuestionsQuerySchema = z.object({
  set_type: z.enum(['IC', 'TM', 'HOD']).optional(),
  competency_id: z.string().optional(),
  is_active: z.enum(['true', 'false']).optional(),
});

// CSV import row schema (validated per-row in service)
export const csvQuestionRowSchema = z.object({
  question_id: z.string().optional(),
  set_type: z.enum(['IC', 'TM', 'HOD']),
  order_number: z.coerce.number().int().min(1).max(99),
  question_text: z.string().min(5).max(500),
  category: z.string().min(2).max(100),
  competency_id: z.string().min(2).max(10),
});
