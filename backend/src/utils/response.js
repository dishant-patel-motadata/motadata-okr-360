/**
 * utils/response.js
 *
 * Standard API response envelope used across all controllers.
 *
 * All endpoints return:
 * {
 *   "success" : boolean,
 *   "data"    : object | array | null,
 *   "message" : string,
 *   "error"   : string | null,
 *   "meta"    : { page, limit, total } | null   (paginated routes only)
 * }
 *
 * Usage in controllers:
 *   return sendSuccess(res, data, 'Cycle created', 201);
 *   return sendError(res, 'Not authorised', 403);
 *   return sendPaginated(res, rows, { page, limit, total });
 */

/**
 * 2xx success response
 * @param {import('express').Response} res
 * @param {*}      data     - payload to return
 * @param {string} message  - human-readable status message
 * @param {number} status   - HTTP status code (default 200)
 */
export const sendSuccess = (res, data = null, message = 'Success', status = 200) => {
  return res.status(status).json({
    success: true,
    data,
    message,
    error: null,
    meta: null,
  });
};

/**
 * Paginated success response
 * @param {import('express').Response} res
 * @param {Array}  rows
 * @param {{ page: number, limit: number, total: number }} meta
 * @param {string} message
 */
export const sendPaginated = (res, rows, meta, message = 'Success') => {
  return res.status(200).json({
    success: true,
    data: rows,
    message,
    error: null,
    meta: {
      page: meta.page,
      limit: meta.limit,
      total: meta.total,
      totalPages: Math.ceil(meta.total / meta.limit),
    },
  });
};

/**
 * 4xx / 5xx error response
 * @param {import('express').Response} res
 * @param {string} message  - human-readable error description
 * @param {number} status   - HTTP status code (default 400)
 * @param {*}      details  - optional debug details (omitted in prod)
 */
export const sendError = (res, message = 'An error occurred', status = 400, details = null) => {
  const body = {
    success: false,
    data: null,
    message,
    error: message,
    meta: null,
  };

  // Only include internal details in non-production environments
  if (details && process.env.NODE_ENV !== 'production') {
    body.details = details;
  }

  return res.status(status).json(body);
};
