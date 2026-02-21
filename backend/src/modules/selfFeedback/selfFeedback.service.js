/**
 * modules/selfFeedback/selfFeedback.service.js
 *
 * Business rules (PRD §4.3):
 *
 *  SF-02  Form shows competencies applicable to employee's group_name.
 *  SF-04  Employee can save draft before final submission.
 *  SF-05  One-time submission — no edits after SUBMITTED.
 *  SF-07  Submission timestamp recorded.
 *  SF-08  Admin can view completion status per cycle.
 *
 * Only allowed when cycle status = ACTIVE (SF-01).
 */

import {
  getSelfFeedback,
  createSelfFeedback,
  updateSelfFeedbackDraft,
  submitSelfFeedback,
  getCompletionStatusByCycle,
} from './selfFeedback.repository.js';

import { getCycleById }          from '../cycles/cycles.repository.js';
import { listCompetencies }       from '../competencies/competencies.repository.js';
import { scoreToLabel }           from '../../utils/scoreCalculator.js';
import { writeAuditLog }          from '../../utils/auditLogger.js';

// ── Helpers ───────────────────────────────────────────────

/**
 * Build a lookup map of competency_id → competency_name
 * for a given group_name (IC | TM | HOD | CXO).
 */
async function _buildCompetencyMap(groupName) {
  const comps = await listCompetencies({ applicable_to: groupName, is_active: 'true' });
  const map = {};
  for (const c of comps) {
    map[c.competency_id] = c.competency_name;
  }
  return map;
}

/**
 * Enrich raw rating entries with competency_name and label.
 * Input:  [{ competency_id, rating }]
 * Output: [{ competency_id, competency_name, rating, label }]
 *
 * Entries whose competency_id is not in the map are filtered out
 * so only valid (applicable) competencies are stored.
 */
function _enrichRatings(rawRatings, competencyMap) {
  const enriched = [];
  for (const entry of rawRatings) {
    const name = competencyMap[entry.competency_id];
    if (!name) continue;  // skip unknown / non-applicable competencies
    enriched.push({
      competency_id:   entry.competency_id,
      competency_name: name,
      rating:          entry.rating,
      label:           scoreToLabel(entry.rating),
    });
  }
  return enriched;
}

/** Throw 404 if cycle doesn't exist; throw 403 if not ACTIVE. */
async function _assertCycleActive(cycleId) {
  const cycle = await getCycleById(cycleId);
  if (!cycle) {
    const err = new Error(`Review cycle "${cycleId}" not found.`);
    err.status = 404;
    throw err;
  }
  if (cycle.status !== 'ACTIVE') {
    const err = new Error(
      `Self-feedback is only available when the cycle is ACTIVE. Current status: ${cycle.status}.`
    );
    err.status = 403;
    throw err;
  }
  if (!cycle.enable_self_feedback) {
    const err = new Error('Self-feedback is disabled for this review cycle.');
    err.status = 403;
    throw err;
  }
  return cycle;
}

// ── Public service functions ──────────────────────────────

/**
 * GET /self-feedback/:cycleId
 *
 * Returns:
 *  {
 *    self_feedback:           object | null,   // existing record if any
 *    applicable_competencies: object[],         // for rendering the form
 *    cycle:                   { cycle_id, cycle_name, end_date, status }
 *  }
 *
 * Throws 404 if cycle not found.
 * Does NOT require cycle to be ACTIVE — allows reading results after close.
 */
export async function getSelfFeedbackService(employeeId, cycleId, requestingUser) {
  const cycle = await getCycleById(cycleId);
  if (!cycle) {
    const err = new Error(`Review cycle "${cycleId}" not found.`);
    err.status = 404;
    throw err;
  }

  const [existing, competencies] = await Promise.all([
    getSelfFeedback(employeeId, cycleId),
    listCompetencies({ applicable_to: requestingUser.group_name, is_active: 'true' }),
  ]);

  return {
    self_feedback: existing,
    applicable_competencies: competencies,
    cycle: {
      cycle_id:   cycle.cycle_id,
      cycle_name: cycle.cycle_name,
      end_date:   cycle.end_date,
      status:     cycle.status,
      enable_self_feedback: cycle.enable_self_feedback,
    },
  };
}

// ─────────────────────────────────────────────────────────

/**
 * POST /self-feedback/:cycleId  (save as DRAFT)
 *
 * Creates a new record or overwrites ratings on an existing DRAFT.
 * Throws 409 if already SUBMITTED.
 */
export async function saveSelfFeedbackService(employeeId, cycleId, body, requestingUser) {
  const cycle = await _assertCycleActive(cycleId);

  const competencyMap = await _buildCompetencyMap(requestingUser.group_name);

  const enriched = _enrichRatings(body.competency_ratings, competencyMap);
  if (enriched.length === 0) {
    const err = new Error(
      'No valid competency ratings provided for your role. Check competency_ids and try again.'
    );
    err.status = 422;
    throw err;
  }

  const existing = await getSelfFeedback(employeeId, cycleId);

  let record;

  if (!existing) {
    // First save — create new DRAFT
    record = await createSelfFeedback({
      employee_id:         employeeId,
      cycle_id:            cycleId,
      competency_ratings:  enriched,
    });
  } else if (existing.status === 'SUBMITTED') {
    const err = new Error('Self-feedback has already been submitted and cannot be edited.');
    err.status = 409;
    throw err;
  } else {
    // Overwrite existing DRAFT
    record = await updateSelfFeedbackDraft(existing.self_feedback_id, enriched);
  }

  await writeAuditLog({
    userId:     requestingUser.employeeId,
    actionType: 'SAVE_DRAFT',
    entityType: 'self_feedback',
    entityId:   record.self_feedback_id,
    newValue:   { cycle_id: cycleId, competency_count: enriched.length },
  });

  return record;
}

// ─────────────────────────────────────────────────────────

/**
 * POST /self-feedback/:cycleId/submit  (final submit — one-time)
 *
 * Saves ratings and locks status as SUBMITTED.
 * Throws 409 if already SUBMITTED.
 */
export async function submitSelfFeedbackService(employeeId, cycleId, body, requestingUser) {
  const cycle = await _assertCycleActive(cycleId);

  const competencyMap = await _buildCompetencyMap(requestingUser.group_name);

  const enriched = _enrichRatings(body.competency_ratings, competencyMap);
  if (enriched.length === 0) {
    const err = new Error(
      'No valid competency ratings provided for your role. Check competency_ids and try again.'
    );
    err.status = 422;
    throw err;
  }

  const existing = await getSelfFeedback(employeeId, cycleId);

  if (existing?.status === 'SUBMITTED') {
    const err = new Error('Self-feedback has already been submitted and cannot be re-submitted.');
    err.status = 409;
    throw err;
  }

  let record;

  if (!existing) {
    // Create draft first, then immediately submit
    const draft = await createSelfFeedback({
      employee_id:        employeeId,
      cycle_id:           cycleId,
      competency_ratings: enriched,
    });
    record = await submitSelfFeedback(draft.self_feedback_id, enriched);
  } else {
    record = await submitSelfFeedback(existing.self_feedback_id, enriched);
  }

  await writeAuditLog({
    userId:     requestingUser.employeeId,
    actionType: 'SUBMIT',
    entityType: 'self_feedback',
    entityId:   record.self_feedback_id,
    newValue:   {
      cycle_id:          cycleId,
      competency_count:  enriched.length,
      submitted_at:      record.submitted_at,
    },
  });

  return record;
}

// ─────────────────────────────────────────────────────────

/**
 * GET /self-feedback/:cycleId/completion  (CXO only)
 *
 * Returns all active employees with their self-feedback status
 * for the given cycle (NOT_STARTED | DRAFT | SUBMITTED).
 */
export async function getCompletionStatusService(cycleId) {
  const cycle = await getCycleById(cycleId);
  if (!cycle) {
    const err = new Error(`Review cycle "${cycleId}" not found.`);
    err.status = 404;
    throw err;
  }

  const rows = await getCompletionStatusByCycle(cycleId);

  // Summary counts
  const summary = rows.reduce(
    (acc, r) => {
      acc[r.self_feedback_status] = (acc[r.self_feedback_status] ?? 0) + 1;
      return acc;
    },
    { NOT_STARTED: 0, DRAFT: 0, SUBMITTED: 0 }
  );

  return {
    cycle: { cycle_id: cycle.cycle_id, cycle_name: cycle.cycle_name, status: cycle.status },
    summary,
    employees: rows,
  };
}
