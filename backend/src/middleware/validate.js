/**
 * middleware/validate.js
 *
 * Zod-based request validation middleware factory.
 *
 * Validates req.body, req.params, or req.query against a Zod schema.
 * Returns structured 422 errors listing every field that failed.
 *
 * Usage in routes:
 *   import { validate } from '../middleware/validate.js';
 *   import { createCycleSchema } from './cycles.validator.js';
 *
 *   router.post(
 *     '/cycles',
 *     authenticateSession,
 *     authorizeRoles('CXO'),
 *     validate(createCycleSchema),      // validates req.body
 *     asyncWrapper(cycleController.create)
 *   );
 *
 *   // Validate query params:
 *   validate(schema, 'query')
 *
 *   // Validate route params:
 *   validate(schema, 'params')
 */

import { sendError } from '../utils/response.js';

/**
 * @param {import('zod').ZodSchema} schema - Zod schema to validate against
 * @param {'body'|'params'|'query'} source  - which part of req to validate
 * @returns {import('express').RequestHandler}
 */
export const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      const errors = result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));

      return res.status(422).json({
        success: false,
        data: null,
        message: 'Validation failed. Please check the fields below.',
        error: 'VALIDATION_ERROR',
        errors,
        meta: null,
      });
    }

    // Replace the source with the parsed (and type-coerced) data
    req[source] = result.data;
    return next();
  };
};
