/**
 * middleware/requestLogger.js
 *
 * Logs each incoming HTTP request and its response status/duration.
 * Uses the Winston logger configured in utils/logger.js.
 *
 * Logged fields per request:
 *   - HTTP method
 *   - URL path (without query string in sensitive routes)
 *   - Response status code
 *   - Response time in ms
 *   - Authenticated user id (if available)
 *
 * Sensitive routes (suppress full URL logging in production):
 *   /api/auth/**
 */

import { logger } from '../utils/logger.js';

const SENSITIVE_PATH_PREFIXES = ['/api/auth'];

export const requestLogger = (req, res, next) => {
  const start = Date.now();

  // Determine if the path should be partially masked in production
  const isSensitive = SENSITIVE_PATH_PREFIXES.some((prefix) =>
    req.path.startsWith(prefix)
  );
  const loggedPath =
    process.env.NODE_ENV === 'production' && isSensitive
      ? req.path.split('?')[0]
      : req.originalUrl;

  res.on('finish', () => {
    const duration = Date.now() - start;
    const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';

    logger[level](`${req.method} ${loggedPath} ${res.statusCode} — ${duration}ms`, {
      method: req.method,
      path: loggedPath,
      status: res.statusCode,
      duration,
      userId: req.user?.employeeId || null,
    });
  });

  next();
};
