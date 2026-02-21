/**
 * modules/selfFeedback/selfFeedback.controller.js
 */

import {
  getSelfFeedbackService,
  saveSelfFeedbackService,
  submitSelfFeedbackService,
  getCompletionStatusService,
} from './selfFeedback.service.js';
import { asyncWrapper } from '../../utils/asyncWrapper.js';
import { sendSuccess }  from '../../utils/response.js';

// ─────────────────────────────────────────────────────────

/**
 * GET /self-feedback/:cycleId
 * Any authenticated user — returns their own record + form data.
 */
export const getSelfFeedback = asyncWrapper(async (req, res) => {
  const result = await getSelfFeedbackService(
    req.user.employeeId,
    req.params.cycleId,
    req.user
  );
  return sendSuccess(res, result, 'Self-feedback data retrieved.');
});

// ─────────────────────────────────────────────────────────

/**
 * POST /self-feedback/:cycleId
 * Save or overwrite a DRAFT. Rejects if already SUBMITTED.
 */
export const saveSelfFeedback = asyncWrapper(async (req, res) => {
  const record = await saveSelfFeedbackService(
    req.user.employeeId,
    req.params.cycleId,
    req.body,
    req.user
  );
  return sendSuccess(res, record, 'Self-feedback draft saved.');
});

// ─────────────────────────────────────────────────────────

/**
 * POST /self-feedback/:cycleId/submit
 * Final one-time submission. Status locked to SUBMITTED.
 */
export const submitSelfFeedback = asyncWrapper(async (req, res) => {
  const record = await submitSelfFeedbackService(
    req.user.employeeId,
    req.params.cycleId,
    req.body,
    req.user
  );
  return sendSuccess(res, record, 'Self-feedback submitted successfully. Thank you!', 200);
});

// ─────────────────────────────────────────────────────────

/**
 * GET /self-feedback/:cycleId/completion
 * CXO/HR Admin only — completion status for all employees in the cycle.
 */
export const getCompletionStatus = asyncWrapper(async (req, res) => {
  const result = await getCompletionStatusService(req.params.cycleId);
  return sendSuccess(res, result, 'Self-feedback completion status retrieved.');
});
