/**
 * jobs/cycleTransition.js
 *
 * CRON job — runs daily at midnight.
 * Handles automatic review cycle state transitions:
 *
 *   ACTIVE  → CLOSING   : when current date > cycle.end_date
 *   CLOSING → COMPLETED : when current date > cycle.end_date + grace_period_days
 *
 * On COMPLETED transition:
 *   - Triggers score calculation engine for all employees in cycle
 *   - Sends CYCLE_CLOSING notifications to all pending reviewers
 *
 * Implementation: STEP 4
 */

/**
 * jobs/cycleTransition.js
 *
 * CRON job — runs daily at 00:05.
 * Handles automatic review cycle state transitions:
 *
 *   ACTIVE  → CLOSING   : when current date > cycle.end_date
 *   CLOSING → COMPLETED : when current date > cycle.end_date + grace_period_days
 *
 * On COMPLETED transition:
 *   - Score calculation is triggered in STEP 9 (scoreCalculator.js)
 *   - Notifications are dispatched in STEP 11 (reminderScheduler.js)
 */

import cron from 'node-cron';
import { logger } from '../utils/logger.js';
import { runCycleTransitions } from '../modules/cycles/cycles.service.js';

// Daily at 00:05 (5 minutes past midnight) to avoid midnight contention
cron.schedule('5 0 * * *', async () => {
  logger.info('[CRON] cycleTransition job started');
  try {
    const { closed, completed } = await runCycleTransitions();
    logger.info(
      `[CRON] cycleTransition done: ${closed} cycle(s) → CLOSING, ${completed} cycle(s) → COMPLETED`
    );
  } catch (err) {
    logger.error(`[CRON] cycleTransition failed: ${err.message}`);
  }
});
