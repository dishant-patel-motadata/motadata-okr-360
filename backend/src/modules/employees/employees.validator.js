/**
 * modules/employees/employees.validator.js
 *
 * Zod schemas for employee endpoints.
 *
 * Notes:
 *  - AD-sourced fields (full_name, email, department, etc.) are READ-ONLY.
 *    Only system-managed fields may be patched via API.
 *  - group_name is set by CXO/HR after AD sync (AD doesn't carry this).
 */

import { z } from 'zod';

// ── PATCH /employees/:id ───────────────────────────────────
// Only CXO-managed fields; all other employee fields come from AD.
export const updateEmployeeSchema = z.object({
  group_name: z
    .enum(['IC', 'TM', 'HOD', 'CXO'], {
      errorMap: () => ({ message: 'group_name must be IC, TM, HOD, or CXO' }),
    })
    .optional(),

  cross_functional_groups: z
    .array(z.string().min(1).max(100))
    .min(0)
    .max(10)
    .optional()
    .nullable(),

  applicable_competencies: z
    .array(z.string().min(1).max(50))
    .min(0)
    .max(10)
    .optional()
    .nullable(),
});

// ── GET /employees?... ─────────────────────────────────────
export const listEmployeesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  department: z.string().optional(),
  group_name: z.enum(['IC', 'TM', 'HOD', 'CXO']).optional(),
  is_active: z.enum(['true', 'false']).optional(),
  search: z.string().max(100).optional(), // searches full_name or email
});
