/**
 * modules/responses/responses.controller.js
 *
 * Thin controllers — delegate entirely to responses.service.js.
 * The route middleware (`authenticateSurveyAccess`) validates access and attaches
 * `req.reviewerId` before these controllers are reached.
 */

import {
  getSurveyFormService,
  saveSurveyDraftService,
  submitSurveyService,
  submitOnBehalfService,
  reopenSurveyService,
} from './responses.service.js';

// ── SS-01  Get survey form ─────────────────────────────────────

export async function getSurveyForm(req, res, next) {
  try {
    const data = await getSurveyFormService(req.params.reviewerId);
    return res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

// ── SS-02  Save draft ─────────────────────────────────────────

export async function saveSurveyDraft(req, res, next) {
  try {
    const result = await saveSurveyDraftService(req.params.reviewerId, req.body);
    return res.status(200).json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

// ── SS-03  Submit survey ──────────────────────────────────────

export async function submitSurvey(req, res, next) {
  try {
    const result = await submitSurveyService(req.params.reviewerId, req.body);
    return res.status(200).json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

// ── RC-14  Submit on behalf (CXO) ─────────────────────────────

export async function submitOnBehalf(req, res, next) {
  try {
    const result = await submitOnBehalfService(req.params.reviewerId, req.body);
    return res.status(200).json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

// ── RC-15  Reopen survey (CXO) ────────────────────────────────

export async function reopenSurvey(req, res, next) {
  try {
    const result = await reopenSurveyService(req.params.reviewerId);
    return res.status(200).json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}
