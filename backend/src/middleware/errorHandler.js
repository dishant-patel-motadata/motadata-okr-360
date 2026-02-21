/**
 * middleware/errorHandler.js
 *
 * Global Express error handler — must be registered LAST in app.js.
 * Catches all errors forwarded via next(err) from:
 *   - asyncWrapper rejections
 *   - Explicit next(new Error(...)) calls
 *   - express-rate-limit, body-parser, and other built-in errors
 *
 * Behaviour:
 *   Development  → full stack trace included in response
 *   Production   → generic message + error logged internally only
 *
 * Custom error properties used internally:
 *   err.statusCode  — override default 500
 *   err.isOperational — true = expected business error, false = bug
 */

import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';

// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || err.status || 500;
  const isProduction = env.NODE_ENV === 'production';

  // Always log the error server-side
  if (statusCode >= 500) {
    logger.error('Unhandled server error', {
      error: err.message,
      stack: err.stack,
      method: req.method,
      url: req.originalUrl,
      userId: req.user?.employeeId || 'unauthenticated',
    });
  } else {
    logger.warn('Client error', {
      error: err.message,
      method: req.method,
      url: req.originalUrl,
      statusCode,
    });
  }

  // Supabase / PostgreSQL specific errors
  if (err.code === '23505') {
    return res.status(409).json({
      success: false,
      data: null,
      message: 'A record with this data already exists.',
      error: 'DUPLICATE_ENTRY',
      meta: null,
    });
  }

  if (err.code === '23503') {
    return res.status(409).json({
      success: false,
      data: null,
      message: 'Operation violates a reference constraint.',
      error: 'FOREIGN_KEY_VIOLATION',
      meta: null,
    });
  }

  return res.status(statusCode).json({
    success: false,
    data: null,
    message: isProduction
      ? statusCode >= 500
        ? 'An unexpected error occurred. Please try again later.'
        : err.message
      : err.message,
    error: err.name || 'SERVER_ERROR',
    stack: isProduction ? undefined : err.stack,
    meta: null,
  });
};
