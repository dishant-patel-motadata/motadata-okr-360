/**
 * modules/assignments/assignments.service.js
 *
 * Business logic for survey assignment management (PRD §4.4.2):
 *
 *  SA-01  Admin assigns reviewers to each employee.
 *  SA-02  System suggests reviewers based on org hierarchy.
 *  SA-03  Admin adds/removes reviewers from suggestions.
 *  SA-04  Min reviewers per employee (default 2).
 *  SA-05  Max reviewers per employee (default 8).
 *  SA-06  Validate against min/max on add/remove.
 *  SA-07  Bulk assign via CSV upload.
 *  SA-08  Admin views assignment status per employee.
 *  SA-09  Admin can rollback (delete) an assignment if no reviewer has submitted.
 *
 * Default reviewer limits:
 *   MIN_REVIEWERS = 2
 *   MAX_REVIEWERS = 8  (IC/TM), 12 (HOD per PRD guideline)
 */

import { parse as csvParse } from 'csv-parse/sync';

import {
  listAssignments,
  getAssignmentById,
  getAssignmentByEmployeeAndCycle,
  createAssignment,
  deleteAssignment,
  getAssignmentStatusByCycle,
  upsertAssignment,
} from './assignments.repository.js';

import {
  listReviewersByAssignment,
  addReviewer,
  removeReviewer,
  countReviewersByAssignment,
  getReviewerByAssignmentAndEmployee,
  bulkUpsertReviewers,
} from '../reviewers/reviewers.repository.js';

import { getEmployeeById }  from '../employees/employees.repository.js';
import { getCycleById }     from '../cycles/cycles.repository.js';
import { writeAuditLog }    from '../../utils/auditLogger.js';
import { csvReviewerRowSchema } from './assignments.validator.js';

// ── Constants ─────────────────────────────────────────────────

const MIN_REVIEWERS = 2;
const MAX_REVIEWERS_DEFAULT = 8;
const MAX_REVIEWERS_HOD     = 12;

/** Map employee group_name → question_set for the survey form. */
const GROUP_TO_QUESTION_SET = {
  IC:  'IC',
  TM:  'TM',
  HOD: 'HOD',
  CXO: 'HOD',  // CXO executives are assessed with the HOD question set
};

// ── Internal helpers ──────────────────────────────────────────

function _maxReviewers(groupName) {
  return groupName === 'HOD' ? MAX_REVIEWERS_HOD : MAX_REVIEWERS_DEFAULT;
}

async function _assertCycleActive(cycleId) {
  const cycle = await getCycleById(cycleId);
  if (!cycle) {
    const err = new Error(`Review cycle "${cycleId}" not found.`);
    err.status = 404;
    throw err;
  }
  if (!['ACTIVE', 'CLOSING'].includes(cycle.status)) {
    const err = new Error(
      `Reviewer assignments can only be created or modified when the cycle is ACTIVE or CLOSING. Current status: ${cycle.status}.`
    );
    err.status = 403;
    throw err;
  }
  if (!cycle.enable_colleague_feedback) {
    const err = new Error('Colleague feedback is disabled for this review cycle.');
    err.status = 403;
    throw err;
  }
  return cycle;
}

async function _assertEmployeeActive(employeeId) {
  const emp = await getEmployeeById(employeeId);
  if (!emp) {
    const err = new Error(`Employee "${employeeId}" not found.`);
    err.status = 404;
    throw err;
  }
  if (!emp.is_active) {
    const err = new Error(`Employee "${employeeId}" is not active.`);
    err.status = 422;
    throw err;
  }
  return emp;
}

// ── Exported service functions ────────────────────────────────

export async function listAssignmentsService(query) {
  return listAssignments(query);
}

// ─────────────────────────────────────────────────────────────

export async function getAssignmentService(assignmentId) {
  const assignment = await getAssignmentById(assignmentId);
  if (!assignment) {
    const err = new Error(`Assignment "${assignmentId}" not found.`);
    err.status = 404;
    throw err;
  }

  // Flatten reviewer employee data so frontend gets reviewer_name / reviewer_department
  if (assignment.survey_reviewers) {
    assignment.survey_reviewers = assignment.survey_reviewers.map((r) => ({
      ...r,
      reviewer_name: r.employees?.full_name ?? null,
      reviewer_department: r.employees?.department ?? null,
      reviewer_designation: r.employees?.designation ?? null,
    }));
  }

  return assignment;
}

// ─────────────────────────────────────────────────────────────

/**
 * Create an assignment (enrol one employee in one cycle).
 * Throws 409 if employee is already enrolled.
 */
export async function createAssignmentService(body, requestingUser) {
  const { employee_id, cycle_id } = body;

  await _assertCycleActive(cycle_id);
  const employee = await _assertEmployeeActive(employee_id);

  // Uniqueness check
  const existing = await getAssignmentByEmployeeAndCycle(employee_id, cycle_id);
  if (existing) {
    const err = new Error(
      `Employee "${employee_id}" is already enrolled in cycle "${cycle_id}".`
    );
    err.status = 409;
    throw err;
  }

  const assignment = await createAssignment({ employee_id, cycle_id });

  await writeAuditLog({
    userId:     requestingUser.employeeId,
    actionType: 'CREATE',
    entityType: 'survey_assignments',
    entityId:   assignment.assignment_id,
    newValue:   { employee_id, cycle_id },
  });

  return assignment;
}

// ─────────────────────────────────────────────────────────────

/**
 * Delete (rollback) an assignment — SA-09.
 * Blocked if any reviewer has already COMPLETED (submitted responses).
 */
export async function deleteAssignmentService(assignmentId, requestingUser) {
  const assignment = await getAssignmentService(assignmentId);

  // Block if any reviewer has submitted
  if (assignment.status === 'COMPLETED') {
    const err = new Error(
      'Cannot delete an assignment where all reviewers have completed. Use individual reviewer removal instead.'
    );
    err.status = 409;
    throw err;
  }

  // Check individual reviewer statuses
  const reviewers = await listReviewersByAssignment(assignmentId);
  const hasCompleted = reviewers.some((r) => r.status === 'COMPLETED');
  if (hasCompleted) {
    const err = new Error(
      'Cannot delete assignment: one or more reviewers have already submitted their survey. Remove them individually if needed.'
    );
    err.status = 409;
    throw err;
  }

  await deleteAssignment(assignmentId);

  await writeAuditLog({
    userId:     requestingUser.employeeId,
    actionType: 'DELETE',
    entityType: 'survey_assignments',
    entityId:   assignmentId,
    oldValue:   { employee_id: assignment.employee_id, cycle_id: assignment.cycle_id },
  });
}

// ─────────────────────────────────────────────────────────────

/**
 * Get assignment status overview for all active employees in a cycle.
 * Used by admin SA-08 dashboard view.
 */
export async function getAssignmentStatusService(cycleId) {
  const cycle = await getCycleById(cycleId);
  if (!cycle) {
    const err = new Error(`Review cycle "${cycleId}" not found.`);
    err.status = 404;
    throw err;
  }

  const rows = await getAssignmentStatusByCycle(cycleId);

  const summary = rows.reduce(
    (acc, r) => {
      acc[r.assignment_status] = (acc[r.assignment_status] ?? 0) + 1;
      return acc;
    },
    { NOT_ENROLLED: 0, PENDING: 0, IN_PROGRESS: 0, COMPLETED: 0 }
  );

  return {
    cycle:    { cycle_id: cycle.cycle_id, cycle_name: cycle.cycle_name, status: cycle.status },
    summary,
    employees: rows,
  };
}

// ─────────────────────────────────────────────────────────────

/**
 * Suggest reviewers for an employee based on org hierarchy — SA-02.
 *
 * Returns categorised suggestions:
 *   { MANAGER: [], PEER: [], DIRECT_REPORT: [], CROSS_FUNCTIONAL: [], CXO: [] }
 *
 * Does NOT persist anything — admin reviews and then calls addReviewer.
 */
export async function suggestReviewersService(employeeId, cycleId) {
  const employee = await _assertEmployeeActive(employeeId);

  // Fetch all active employees in one call for peer/DR lookups
  const { data: allEmployees, error } = await (async () => {
    const { supabaseAdmin } = await import('../../config/supabase.js');
    return supabaseAdmin
      .from('employees')
      .select('employee_id, full_name, department, designation, group_name, reporting_manager_id, cross_functional_groups')
      .eq('is_active', true)
      .neq('employee_id', employeeId);
  })();
  if (error) throw error;

  const suggestions = {
    MANAGER:          [],
    PEER:             [],
    DIRECT_REPORT:    [],
    INDIRECT_REPORT:  [],
    CROSS_FUNCTIONAL: [],
    CXO:              [],
  };

  for (const emp of allEmployees ?? []) {
    // MANAGER — employee's reporting manager
    if (emp.employee_id === employee.reporting_manager_id) {
      suggestions.MANAGER.push(emp);
      continue;
    }

    // CXO
    if (emp.group_name === 'CXO') {
      suggestions.CXO.push(emp);
      continue;
    }

    // DIRECT_REPORT — reports directly to the employee
    if (emp.reporting_manager_id === employeeId) {
      suggestions.DIRECT_REPORT.push(emp);
      continue;
    }

    // INDIRECT_REPORT — reports to employee's direct reports
    // (detected below via a second pass; pre-collect DR ids first)
  }

  // Build set of direct report IDs for indirect report detection
  const directReportIds = new Set(
    suggestions.DIRECT_REPORT.map((e) => e.employee_id)
  );

  // Second pass for INDIRECT_REPORT and PEER / CROSS_FUNCTIONAL
  for (const emp of allEmployees ?? []) {
    // Skip already categorised
    if (
      emp.employee_id === employee.reporting_manager_id ||
      emp.group_name === 'CXO' ||
      emp.reporting_manager_id === employeeId
    ) continue;

    // INDIRECT_REPORT
    if (directReportIds.has(emp.reporting_manager_id)) {
      suggestions.INDIRECT_REPORT.push(emp);
      continue;
    }

    // PEER — same reporting manager, same department
    if (
      emp.reporting_manager_id === employee.reporting_manager_id &&
      emp.reporting_manager_id !== null
    ) {
      suggestions.PEER.push(emp);
      continue;
    }

    // CROSS_FUNCTIONAL — in one of the employee's cross_functional_groups
    const cfGroups = Array.isArray(employee.cross_functional_groups)
      ? employee.cross_functional_groups
      : [];
    if (cfGroups.length > 0) {
      const empGroups = Array.isArray(emp.cross_functional_groups)
        ? emp.cross_functional_groups
        : [];
      const overlap = cfGroups.some((g) => empGroups.includes(g));
      if (overlap) {
        suggestions.CROSS_FUNCTIONAL.push(emp);
      }
    }
  }

  return suggestions;
}

// ─────────────────────────────────────────────────────────────

/**
 * Add a single reviewer to an existing assignment — SA-03.
 * Validates MAX reviewer count (SA-05/06).
 */
export async function addReviewerService(body, requestingUser) {
  const { assignment_id, reviewer_employee_id, reviewer_type } = body;

  // Load assignment + ratee
  const assignment = await getAssignmentService(assignment_id);
  await _assertCycleActive(assignment.cycle_id);
  const ratee = await _assertEmployeeActive(assignment.employee_id);

  // Reviewer must be an active employee
  await _assertEmployeeActive(reviewer_employee_id);

  // No self-review
  if (reviewer_employee_id === assignment.employee_id) {
    const err = new Error('An employee cannot be assigned to review themselves.');
    err.status = 422;
    throw err;
  }

  // Duplicate check
  const duplicate = await getReviewerByAssignmentAndEmployee(assignment_id, reviewer_employee_id);
  if (duplicate) {
    const err = new Error('This reviewer is already assigned to this assignment.');
    err.status = 409;
    throw err;
  }

  // Max reviewer check
  const currentCount = await countReviewersByAssignment(assignment_id);
  const maxAllowed   = _maxReviewers(ratee.group_name);
  if (currentCount >= maxAllowed) {
    const err = new Error(
      `Maximum reviewer limit of ${maxAllowed} has been reached for this assignment.`
    );
    err.status = 422;
    throw err;
  }

  // Derive question_set from the ratee's group
  const question_set = GROUP_TO_QUESTION_SET[ratee.group_name] ?? 'IC';

  const reviewer = await addReviewer({
    assignment_id,
    reviewer_employee_id,
    reviewer_type,
    question_set,
  });

  await writeAuditLog({
    userId:     requestingUser.employeeId,
    actionType: 'ADD_REVIEWER',
    entityType: 'survey_reviewers',
    entityId:   reviewer.reviewer_id,
    newValue:   { assignment_id, reviewer_employee_id, reviewer_type, question_set },
  });

  return reviewer;
}

// ─────────────────────────────────────────────────────────────

/**
 * Remove a reviewer from an assignment — SA-03.
 * Blocked if reviewer has already COMPLETED their survey.
 * Checks MIN reviewer count after removal.
 */
export async function removeReviewerService(reviewerId, requestingUser) {
  const { getReviewerById } = await import('../reviewers/reviewers.repository.js');
  const reviewer = await getReviewerById(reviewerId);
  if (!reviewer) {
    const err = new Error(`Reviewer "${reviewerId}" not found.`);
    err.status = 404;
    throw err;
  }

  if (reviewer.status === 'COMPLETED') {
    const err = new Error(
      'Cannot remove a reviewer who has already submitted their survey.'
    );
    err.status = 409;
    throw err;
  }

  // Check min reviewer count after removal
  const currentCount = await countReviewersByAssignment(reviewer.assignment_id);
  if (currentCount <= MIN_REVIEWERS) {
    const err = new Error(
      `Cannot remove reviewer: minimum of ${MIN_REVIEWERS} reviewers must remain per assignment.`
    );
    err.status = 422;
    throw err;
  }

  await removeReviewer(reviewerId);

  await writeAuditLog({
    userId:     requestingUser.employeeId,
    actionType: 'REMOVE_REVIEWER',
    entityType: 'survey_reviewers',
    entityId:   reviewerId,
    oldValue:   {
      assignment_id:        reviewer.assignment_id,
      reviewer_employee_id: reviewer.reviewer_employee_id,
      reviewer_type:        reviewer.reviewer_type,
    },
  });
}

// ─────────────────────────────────────────────────────────────

/**
 * Bulk CSV import of reviewer assignments — SA-07.
 *
 * Expected CSV columns (header required):
 *   employee_id, cycle_id, reviewer_employee_id, reviewer_type
 *
 * For each valid row:
 *   1. Upsert survey_assignment (employee_id, cycle_id)
 *   2. Derive question_set from ratee's group_name
 *   3. Add reviewer (duplicate-safe upsert)
 *
 * Returns { imported, errors[] }
 */
export async function bulkCsvAssignService(fileBuffer, requestingUser) {
  let rawRows;
  try {
    rawRows = csvParse(fileBuffer, {
      columns:           true,
      skip_empty_lines:  true,
      trim:              true,
    });
  } catch (parseErr) {
    const err = new Error(`CSV parse error: ${parseErr.message}`);
    err.status = 422;
    throw err;
  }

  if (rawRows.length === 0) {
    const err = new Error('CSV file is empty or has no data rows.');
    err.status = 422;
    throw err;
  }

  const validRows = [];
  const errors    = [];

  for (let i = 0; i < rawRows.length; i++) {
    const row    = rawRows[i];
    const rowNum = i + 2;  // +2: row 1 is header

    const result = csvReviewerRowSchema.safeParse(row);
    if (!result.success) {
      errors.push({
        row:    rowNum,
        data:   row,
        issues: result.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`),
      });
      continue;
    }

    const { employee_id, cycle_id, reviewer_employee_id, reviewer_type } = result.data;

    // Quick active checks (skip slow DB call per row — use try/catch on upsert)
    if (reviewer_employee_id === employee_id) {
      errors.push({ row: rowNum, data: row, issues: ['employee_id and reviewer_employee_id cannot be the same.'] });
      continue;
    }

    validRows.push({ employee_id, cycle_id, reviewer_employee_id, reviewer_type, rowNum });
  }

  // Group by (employee_id, cycle_id) to batch assignment upserts
  let imported = 0;
  for (const rowData of validRows) {
    try {
      const { employee_id, cycle_id, reviewer_employee_id, reviewer_type, rowNum } = rowData;

      // Upsert assignment
      const assignment = await upsertAssignment({ employee_id, cycle_id });

      // Derive question_set
      const employee    = await getEmployeeById(employee_id);
      const question_set = GROUP_TO_QUESTION_SET[employee?.group_name] ?? 'IC';

      // Upsert reviewer (ignore if already exists)
      await bulkUpsertReviewers([{
        assignment_id:        assignment.assignment_id,
        reviewer_employee_id,
        reviewer_type,
        question_set,
      }]);

      imported++;
    } catch (rowErr) {
      errors.push({
        row:    rowData.rowNum,
        data:   { employee_id: rowData.employee_id, reviewer_employee_id: rowData.reviewer_employee_id },
        issues: [rowErr.message],
      });
    }
  }

  if (imported > 0) {
    await writeAuditLog({
      userId:     requestingUser.employeeId,
      actionType: 'BULK_IMPORT',
      entityType: 'survey_reviewers',
      entityId:   'bulk',
      newValue:   { imported, errorCount: errors.length },
    });
  }

  return { imported, errors };
}
