/**
 * jobs/reminderScheduler.js
 *
 * CRON job — runs daily at 08:00.
 * Checks each ACTIVE cycle's reminder_schedule array (default [7, 3, 1])
 * and sends notifications to:
 *   - Reviewers with PENDING/IN_PROGRESS surveys (SURVEY_REMINDER)
 *   - Employees with un-submitted self-feedback (SELF_REMINDER)
 *
 * Notification channels: EMAIL + TEAMS (per notification_templates)
 *
 * Implementation: STEP 11
 */

import cron from 'node-cron';
import { logger } from '../utils/logger.js';

// Daily at 08:00
cron.schedule('0 8 * * *', async () => {
  logger.info('[CRON] reminderScheduler job triggered');
  // TODO: implement in STEP 11
});
