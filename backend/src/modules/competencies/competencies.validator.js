/**
 * modules/competencies/competencies.validator.js
 */

import { z } from 'zod';

export const createCompetencySchema = z.object({
  competency_id: z
    .string()
    .min(2)
    .max(10)
    .regex(/^[A-Z0-9_]+$/, 'competency_id must be uppercase letters, digits or underscores'),
  competency_name: z.string().min(2).max(100),
  description: z.string().max(500).optional().nullable(),
  applicable_to: z
    .array(z.enum(['IC', 'TM', 'HOD', 'CXO']))
    .min(1)
    .default(['IC', 'TM', 'HOD']),
});

export const updateCompetencySchema = z.object({
  competency_name: z.string().min(2).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  applicable_to: z.array(z.enum(['IC', 'TM', 'HOD', 'CXO'])).min(1).optional(),
  is_active: z.boolean().optional(),
});

export const listCompetenciesQuerySchema = z.object({
  applicable_to: z.enum(['IC', 'TM', 'HOD', 'CXO']).optional(),
  is_active: z.enum(['true', 'false']).optional(),
});
