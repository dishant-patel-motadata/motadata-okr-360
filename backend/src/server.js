/**
 * server.js
 *
 * HTTP server bootstrap.
 * Imports the Express app, starts listening, and sets up
 * graceful shutdown for SIGTERM / SIGINT signals.
 *
 * Also initialises scheduled background jobs (CRON).
 */

import 'dotenv/config';
// Node.js 18 shim: global `crypto` (WebCrypto) was only made a bare global in Node 19+
// better-auth uses `crypto.subtle` which requires this shim on Node 18.
import { webcrypto } from 'node:crypto';
if (!globalThis.crypto) globalThis.crypto = webcrypto;

import app from './app.js';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import { pool } from './config/auth.js';

// ── Start background jobs ─────────────────────────────────
// Uncomment progressively as modules are built.
import './jobs/cycleTransition.js';
// import './jobs/reminderScheduler.js'; -- STEP 11

const PORT = parseInt(env.PORT, 10);

const server = app.listen(PORT, () => {
  logger.info(`🚀 OKR-360 API running`, {
    port: PORT,
    env: env.NODE_ENV,
    url: `http://localhost:${PORT}`,
  });
});

// ── Graceful shutdown ─────────────────────────────────────
const shutdown = async (signal) => {
  logger.info(`${signal} received — shutting down gracefully`);

  server.close(async () => {
    logger.info('HTTP server closed');

    // pool is null when using the Supabase HTTPS adapter (no pg TCP connection)
    if (pool && typeof pool.end === 'function') {
      await pool.end();
      logger.info('PostgreSQL pool closed');
    }

    process.exit(0);
  });

  // Force exit if graceful shutdown takes more than 10 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10_000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Catch unhandled promise rejections not caught by Winston
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Promise Rejection', { reason: String(reason) });
});

export default server;
