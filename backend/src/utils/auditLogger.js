/**
 * utils/auditLogger.js
 *
 * Writes an immutable entry to the audit_log table for every
 * significant admin/system action.
 *
 * Called from service layer (NOT controllers) so business
 * transactions and audit trail are always co-located.
 *
 * Fields written per PRD audit requirements:
 *   user_id     — employee_id of the actor (null = system)
 *   action_type — CREATE | UPDATE | DELETE | ACTIVATE |
 *                 PUBLISH | DEACTIVATE | SYNC | CALCULATE
 *   entity_type — table name (e.g. 'review_cycles')
 *   entity_id   — primary key of affected record (TEXT)
 *   old_value   — JSONB snapshot before change (null for CREATE)
 *   new_value   — JSONB snapshot after change (null for DELETE)
 *   ip_address  — from req object (optional — pass when available)
 *
 * Usage:
 *   await writeAuditLog({
 *     userId     : req.user.employeeId,
 *     actionType : 'ACTIVATE',
 *     entityType : 'review_cycles',
 *     entityId   : cycleId,
 *     oldValue   : { status: 'DRAFT' },
 *     newValue   : { status: 'ACTIVE' },
 *     ipAddress  : req.ip,
 *   });
 */

import { supabaseAdmin } from '../config/supabase.js';
import { logger } from './logger.js';

/**
 * @typedef {Object} AuditParams
 * @property {string|null} userId
 * @property {string}      actionType
 * @property {string}      entityType
 * @property {string}      entityId
 * @property {object|null} oldValue
 * @property {object|null} newValue
 * @property {string|null} ipAddress
 */

/**
 * @param {AuditParams} params
 * @returns {Promise<void>}
 */
export const writeAuditLog = async ({
  userId = null,
  actionType,
  entityType,
  entityId,
  oldValue = null,
  newValue = null,
  ipAddress = null,
}) => {
  const { error } = await supabaseAdmin.from('audit_log').insert({
    user_id: userId,
    action_type: actionType,
    entity_type: entityType,
    entity_id: String(entityId),
    old_value: oldValue,
    new_value: newValue,
    ip_address: ipAddress,
  });

  if (error) {
    // Audit log failure must never crash the main operation —
    // log the issue and continue.
    logger.error('Failed to write audit log entry', {
      error: error.message,
      actionType,
      entityType,
      entityId,
    });
  }
};
