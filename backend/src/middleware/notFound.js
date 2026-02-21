/**
 * middleware/notFound.js
 *
 * 404 handler — catches all requests that don't match any
 * registered route and returns a consistent error response.
 * Register this AFTER all route declarations in app.js.
 */

export const notFound = (req, res) => {
  return res.status(404).json({
    success: false,
    data: null,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
    error: 'NOT_FOUND',
    meta: null,
  });
};
