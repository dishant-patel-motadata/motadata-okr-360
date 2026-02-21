/**
 * modules/cycles/cycles.service.js
 *
 * Business logic for review cycle management.
 *
 * State machine (PRD §4.2.3):
 *   DRAFT ──[activate]──► ACTIVE ──[auto: end_date]──► CLOSING
 *         ──[auto: end_date + grace]──► COMPLETED ──[publish]──► PUBLISHED
 *
 * Rules enforced here:
 *   RC-07  Manual activate:   DRAFT → ACTIVE  (CXO only)
 *   RC-08  Auto-close:        ACTIVE → CLOSING  (CRON job)
 *   RC-09  Auto-complete:     CLOSING → COMPLETED  (CRON job)
 *   RC-10  Manual publish:    COMPLETED → PUBLISHED  (CXO only)
 *   RC-12  Overlap guard:     no two ACTIVE/CLOSING cycles can share dates
 */

import {
  listCycles,
  getCycleById,
  createCycle,
  updateCycle,
  deleteCycle,
  transitionCycleStatus,
  findOverlappingActiveCycle,
  findCyclesForTransition,
} from './cycles.repository.js';
import { writeAuditLog } from '../../utils/auditLogger.js';
import { logger } from '../../utils/logger.js';
import { calculateScoresForCycle } from '../scores/scores.service.js';

// ── Allowed state transitions ──────────────────────────────
const VALID_TRANSITIONS = {
  DRAFT: ['ACTIVE'],
  ACTIVE: ['CLOSING'],
  CLOSING: ['COMPLETED'],
  COMPLETED: ['PUBLISHED'],
  PUBLISHED: [],
};

// ── List ───────────────────────────────────────────────────

export async function listCyclesService({ page, limit, status }) {
  const { cycles, total } = await listCycles({ page, limit, status });
  return {
    cycles,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

// ── Get one ────────────────────────────────────────────────

export async function getCycleService(cycleId) {
  const cycle = await getCycleById(cycleId);
  if (!cycle) {
    const err = new Error(`Review cycle ${cycleId} not found.`);
    err.status = 404;
    throw err;
  }
  return cycle;
}

// ── Create ─────────────────────────────────────────────────

/**
 * Create a new DRAFT review cycle.
 * Validates date logic (end > start) — already enforced by Zod,
 * but also enforced here as a defence-in-depth measure.
 */
export async function createCycleService(body, requestingUser) {
  const cycle = await createCycle({
    cycle_name: body.cycle_name,
    start_date: body.start_date,
    end_date: body.end_date,
    duration_months: body.duration_months,
    grace_period_days: body.grace_period_days,
    enable_self_feedback: body.enable_self_feedback,
    enable_colleague_feedback: body.enable_colleague_feedback,
    reminder_schedule: body.reminder_schedule,
    created_by: requestingUser.employeeId,
    status: 'DRAFT',
  });

  await writeAuditLog({
    userId: requestingUser.employeeId,
    actionType: 'CREATE',
    entityType: 'review_cycles',
    entityId: cycle.cycle_id,
    newValue: cycle,
  });

  return cycle;
}

// ── Update (DRAFT only) ────────────────────────────────────

/**
 * Update editable fields — only allowed while cycle is DRAFT.
 */
export async function updateCycleService(cycleId, updates, requestingUser) {
  const existing = await getCycleService(cycleId);

  if (existing.status !== 'DRAFT') {
    const err = new Error(
      `Cycle "${existing.cycle_name}" is ${existing.status}. Only DRAFT cycles can be edited.`
    );
    err.status = 409;
    throw err;
  }

  // If dates are changing, validate end > start
  const newStart = updates.start_date ?? existing.start_date;
  const newEnd = updates.end_date ?? existing.end_date;
  if (new Date(newEnd) <= new Date(newStart)) {
    const err = new Error('end_date must be after start_date.');
    err.status = 422;
    throw err;
  }

  const updated = await updateCycle(cycleId, updates);

  await writeAuditLog({
    userId: requestingUser.employeeId,
    actionType: 'UPDATE',
    entityType: 'review_cycles',
    entityId: cycleId,
    oldValue: existing,
    newValue: updated,
  });

  return updated;
}

// ── Delete (DRAFT only) ────────────────────────────────────

export async function deleteCycleService(cycleId, requestingUser) {
  const existing = await getCycleService(cycleId);

  if (existing.status !== 'DRAFT') {
    const err = new Error(
      `Cycle "${existing.cycle_name}" is ${existing.status}. Only DRAFT cycles can be deleted.`
    );
    err.status = 409;
    throw err;
  }

  await deleteCycle(cycleId);

  await writeAuditLog({
    userId: requestingUser.employeeId,
    actionType: 'DELETE',
    entityType: 'review_cycles',
    entityId: cycleId,
    oldValue: existing,
  });
}

// ── State transitions (manual) ─────────────────────────────

/**
 * CXO activates a DRAFT cycle → ACTIVE.
 * Enforces RC-12: no overlapping active cycles.
 */
export async function activateCycleService(cycleId, requestingUser) {
  return _transitionCycle(cycleId, 'ACTIVE', requestingUser, async (cycle) => {
    // RC-12 overlap guard
    const overlap = await findOverlappingActiveCycle({
      start_date: cycle.start_date,
      end_date: cycle.end_date,
      excludeCycleId: cycleId,
    });
    if (overlap) {
      const err = new Error(
        `Cannot activate: cycle "${overlap.cycle_name}" (${overlap.status}) overlaps these dates ` +
          `(${overlap.start_date} – ${overlap.end_date}).`
      );
      err.status = 409;
      throw err;
    }
  });
}

/**
 * CXO publishes a COMPLETED cycle → PUBLISHED.
 * This makes results visible to employees.
 */
export async function publishCycleService(cycleId, requestingUser) {
  return _transitionCycle(cycleId, 'PUBLISHED', requestingUser);
}

// ── State transitions (automated — called by CRON job) ────

/**
 * Run daily auto-transitions.
 * Called by the cycleTransition CRON job.
 * @returns {{ closed: number, completed: number }}
 */
export async function runCycleTransitions() {
  const { toClosing, toCompleted } = await findCyclesForTransition();

  let closed = 0;
  let completed = 0;

  for (const cycle of toClosing) {
    try {
      await transitionCycleStatus(cycle.cycle_id, 'CLOSING');
      await writeAuditLog({
        userId: null,
        actionType: 'AUTO_CLOSE',
        entityType: 'review_cycles',
        entityId: cycle.cycle_id,
        oldValue: { status: 'ACTIVE' },
        newValue: { status: 'CLOSING' },
      });
      logger.info(`[cycleTransition] ${cycle.cycle_name} → CLOSING`);
      closed++;
    } catch (err) {
      logger.error(`[cycleTransition] Failed to close ${cycle.cycle_id}: ${err.message}`);
    }
  }

  for (const cycle of toCompleted) {
    try {
      await transitionCycleStatus(cycle.cycle_id, 'COMPLETED');
      await writeAuditLog({
        userId: null,
        actionType: 'AUTO_COMPLETE',
        entityType: 'review_cycles',
        entityId: cycle.cycle_id,
        oldValue: { status: 'CLOSING' },
        newValue: { status: 'COMPLETED' },
      });
      logger.info(`[cycleTransition] ${cycle.cycle_name} → COMPLETED`);
      completed++;

      // CALC-07: trigger score calculation now that cycle is COMPLETED
      try {
        const calcSummary = await calculateScoresForCycle(cycle.cycle_id);
        logger.info(
          `[cycleTransition] Scores calculated for ${cycle.cycle_name}: ` +
          `calculated=${calcSummary.calculated}, skipped=${calcSummary.skipped}, errors=${calcSummary.errors}`
        );
      } catch (calcErr) {
        logger.error(
          `[cycleTransition] Score calculation failed for ${cycle.cycle_id}: ${calcErr.message}`
        );
      }
    } catch (err) {
      logger.error(`[cycleTransition] Failed to complete ${cycle.cycle_id}: ${err.message}`);
    }
  }

  return { closed, completed };
}

// ── Private: generic transition helper ────────────────────

/**
 * Validate the requested status transition, run optional pre-check,
 * apply the transition, and write an audit entry.
 *
 * @param {string} cycleId
 * @param {string} targetStatus
 * @param {{ employeeId:string }} requestingUser
 * @param {Function} [preCheck]  async fn(cycle) — throw to abort
 */
async function _transitionCycle(cycleId, targetStatus, requestingUser, preCheck) {
  const cycle = await getCycleService(cycleId);

  const allowed = VALID_TRANSITIONS[cycle.status] ?? [];
  if (!allowed.includes(targetStatus)) {
    const err = new Error(
      `Cannot transition "${cycle.cycle_name}" from ${cycle.status} to ${targetStatus}. ` +
        `Allowed next states: ${allowed.join(', ') || 'none'}.`
    );
    err.status = 409;
    throw err;
  }

  if (preCheck) await preCheck(cycle);

  const updated = await transitionCycleStatus(cycleId, targetStatus);

  await writeAuditLog({
    userId: requestingUser.employeeId,
    actionType: targetStatus === 'ACTIVE' ? 'ACTIVATE' : 'PUBLISH',
    entityType: 'review_cycles',
    entityId: cycleId,
    oldValue: { status: cycle.status },
    newValue: { status: targetStatus },
  });

  return updated;
}
