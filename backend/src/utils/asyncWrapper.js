/**
 * utils/asyncWrapper.js
 *
 * Eliminates try/catch boilerplate from every async route handler.
 * Wraps any async controller function and forwards errors to
 * Express's next() — which routes them to errorHandler middleware.
 *
 * Usage in routes:
 *   router.get('/cycles', asyncWrapper(cycleController.getAll));
 *
 * Usage in controllers:
 *   // No try/catch needed — errors propagate automatically
 *   export const getAll = async (req, res) => {
 *     const data = await cycleService.getAll();
 *     return sendSuccess(res, data);
 *   };
 */

/**
 * @param {Function} fn - async Express route handler
 * @returns {Function} wrapped handler that catches rejections
 */
export const asyncWrapper = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
