/**
 * modules/employees/employees.controller.js
 *
 * Thin controllers — validate input, call service, return response.
 * No business logic here.
 */

import { asyncWrapper } from '../../utils/asyncWrapper.js';
import { sendSuccess, sendPaginated, sendError } from '../../utils/response.js';
import {
  listEmployeesService,
  getEmployeeService,
  updateEmployeeService,
  runAdSyncService,
  getSyncLogsService,
} from './employees.service.js';

// ── GET /api/v1/employees ──────────────────────────────────
export const listEmployees = asyncWrapper(async (req, res) => {
  const { employees, meta } = await listEmployeesService(req.query);
  return sendPaginated(res, employees, meta, 'Employees retrieved successfully.');
});

// ── GET /api/v1/employees/:id ──────────────────────────────
export const getEmployee = asyncWrapper(async (req, res) => {
  const employee = await getEmployeeService(req.params.id, req.user);
  return sendSuccess(res, employee, 'Employee retrieved successfully.');
});

// ── PATCH /api/v1/employees/:id ────────────────────────────
export const updateEmployee = asyncWrapper(async (req, res) => {
  const updated = await updateEmployeeService(req.params.id, req.body, req.user);
  return sendSuccess(res, updated, 'Employee updated successfully.');
});

// ── POST /api/v1/employees/sync ────────────────────────────
export const syncEmployees = asyncWrapper(async (req, res) => {
  const syncResult = await runAdSyncService(req.user, 'MANUAL');
  return sendSuccess(res, syncResult, 'AD sync completed.');
});

// ── GET /api/v1/employees/sync/logs ───────────────────────
export const getSyncLogs = asyncWrapper(async (req, res) => {
  const limit = parseInt(req.query.limit, 10) || 10;
  const logs = await getSyncLogsService(Math.min(limit, 50));
  return sendSuccess(res, logs, 'Sync logs retrieved successfully.');
});
