/**
 * modules/employees/employees.service.js
 *
 * Business logic layer for the employee module.
 *
 * AD Sync notes:
 *  The platform is designed to pull employee data from Azure Active Directory.
 *  Until the real AD SDK (e.g. @azure/msal-node + Microsoft Graph) is wired
 *  in, `runAdSync()` provides a production-ready skeleton:
 *    1. Creates an ad_sync_log entry (status = IN_PROGRESS).
 *    2. Calls `fetchEmployeesFromAd()` — replace stub with real Graph call.
 *    3. Upserts each employee row.
 *    4. Updates the log with final counters and status.
 *
 *  To plug in the real AD client, only `fetchEmployeesFromAd()` needs to
 *  change.  All orchestration, error handling, and logging stays the same.
 */

import {
  listEmployees,
  getEmployeeById,
  updateEmployee,
  insertEmployeeFromAd,
  updateEmployeeAdFields,
  createAdSyncLog,
  updateAdSyncLog,
  getRecentSyncLogs,
} from './employees.repository.js';
import { writeAuditLog } from '../../utils/auditLogger.js';
import { logger } from '../../utils/logger.js';

// ── List employees ─────────────────────────────────────────

/**
 * Return paginated employee list.
 * CXO-only endpoint; all filters are optional.
 */
export async function listEmployeesService(query) {
  const { page, limit, department, group_name, is_active, search } = query;
  const { employees, total } = await listEmployees({
    page,
    limit,
    department,
    group_name,
    is_active,
    search,
  });

  return {
    employees,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

// ── Get single employee ────────────────────────────────────

/**
 * Fetch one employee.
 * Access rules:
 *   - CXO may fetch any employee.
 *   - All other roles may only fetch their own record.
 *
 * @param {string} targetEmployeeId   employee_id to look up
 * @param {{ employeeId:string, group_name:string }} requestingUser
 */
export async function getEmployeeService(targetEmployeeId, requestingUser) {
  const isSelf = requestingUser.employeeId === targetEmployeeId;
  const isCxo = requestingUser.group_name === 'CXO';

  if (!isSelf && !isCxo) {
    const err = new Error('You are not authorised to view this employee profile.');
    err.status = 403;
    throw err;
  }

  const employee = await getEmployeeById(targetEmployeeId);
  if (!employee) {
    const err = new Error(`Employee ${targetEmployeeId} not found.`);
    err.status = 404;
    throw err;
  }
  return employee;
}

// ── Update employee (CXO-managed fields only) ──────────────

/**
 * Update system-managed fields on an employee record.
 * Only group_name, cross_functional_groups, applicable_competencies
 * are writable via API.  AD fields are read-only.
 *
 * @param {string} targetEmployeeId
 * @param {object} updates  validated body from updateEmployeeSchema
 * @param {{ employeeId:string }} requestingUser
 */
export async function updateEmployeeService(targetEmployeeId, updates, requestingUser) {
  const existing = await getEmployeeById(targetEmployeeId);
  if (!existing) {
    const err = new Error(`Employee ${targetEmployeeId} not found.`);
    err.status = 404;
    throw err;
  }

  const updated = await updateEmployee(targetEmployeeId, updates);

  // Audit the change
  await writeAuditLog({
    userId: requestingUser.employeeId,
    actionType: 'UPDATE',
    entityType: 'employees',
    entityId: targetEmployeeId,
    oldValue: {
      group_name: existing.group_name,
      cross_functional_groups: existing.cross_functional_groups,
      applicable_competencies: existing.applicable_competencies,
    },
    newValue: updates,
  });

  return updated;
}

// ── AD Sync ────────────────────────────────────────────────

/**
 * Simulate / orchestrate an AD sync run.
 *
 * Replace `fetchEmployeesFromAd()` with real Microsoft Graph calls when
 * Azure AD credentials are available.  Everything else (log lifecycle,
 * upsert loop, counters) is production-ready.
 *
 * @param {{ employeeId:string }} triggeredBy  requesting CXO user
 * @param {'SCHEDULED'|'MANUAL'} syncType
 */
export async function runAdSyncService(triggeredBy, syncType = 'MANUAL') {
  logger.info(`AD sync triggered: type=${syncType} by=${triggeredBy.employeeId}`);

  // 1. Create in-progress log entry
  const syncLog = await createAdSyncLog({ sync_type: syncType });

  let added = 0;
  let updated = 0;
  let deactivated = 0;
  let errorMessage = null;

  try {
    // 2. Fetch records from AD (replace stub with real implementation)
    const adEmployees = await fetchEmployeesFromAd();

    // 3. Upsert each employee into DB
    for (const emp of adEmployees) {
      const existing = await getEmployeeById(emp.employee_id);

      if (!existing) {
        await insertEmployeeFromAd(emp);
        added++;
      } else if (!emp.is_active && existing.is_active) {
        // Deactivation — update AD fields (is_active = false)
        await updateEmployeeAdFields(emp.employee_id, emp);
        deactivated++;
      } else {
        await updateEmployeeAdFields(emp.employee_id, emp);
        updated++;
      }
    }

    // 4. Mark log as SUCCESS
    const result = await updateAdSyncLog(syncLog.sync_id, {
      status: 'SUCCESS',
      employees_added: added,
      employees_updated: updated,
      employees_deactivated: deactivated,
    });

    logger.info(
      `AD sync completed: added=${added} updated=${updated} deactivated=${deactivated}`
    );

    // Audit the manual trigger
    await writeAuditLog({
      userId: triggeredBy.employeeId,
      actionType: 'AD_SYNC',
      entityType: 'ad_sync_log',
      entityId: syncLog.sync_id,
      newValue: { sync_type: syncType, added, updated, deactivated },
    });

    return result;
  } catch (err) {
    errorMessage = err.message ?? 'Unknown error during AD sync';
    logger.error(`AD sync failed: ${errorMessage}`);

    const result = await updateAdSyncLog(syncLog.sync_id, {
      status: 'FAILED',
      employees_added: added,
      employees_updated: updated,
      employees_deactivated: deactivated,
      error_message: errorMessage,
    }).catch(() => syncLog); // if update itself fails, return original log

    return result;
  }
}

/**
 * Fetch recent sync log history (last N runs).
 */
export async function getSyncLogsService(limit = 10) {
  return getRecentSyncLogs(limit);
}

// ── AD stub (replace with real Azure Graph SDK) ────────────

/**
 * Stub: returns an empty array until Azure AD credentials are configured.
 *
 * To wire in Microsoft Graph:
 *   1. npm install @azure/msal-node @microsoft/microsoft-graph-client
 *   2. Add AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET to .env
 *   3. Replace this function body with a Graph API call that fetches
 *      /users and maps fields to the employee schema below.
 *
 * Expected shape per employee:
 * {
 *   employee_id:          string,   // AD objectId or employeeId attribute
 *   full_name:            string,   // displayName
 *   email:                string,   // mail / userPrincipalName
 *   department:           string,   // department
 *   designation:          string,   // jobTitle
 *   reporting_manager_id: string|null, // manager objectId
 *   date_of_joining:      string,   // YYYY-MM-DD format
 *   is_active:            boolean,  // true if accountEnabled
 * }
 *
 * @returns {Promise<object[]>}
 */
async function fetchEmployeesFromAd() {
  logger.warn(
    'fetchEmployeesFromAd() is a stub — no real AD connection configured. ' +
      'Returning empty array. Wire in Azure Graph SDK to enable real sync.'
  );
  return [];
}
