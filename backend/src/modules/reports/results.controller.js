/**
 * modules/reports/results.controller.js
 *
 * Thin controllers for the Results (dashboard data) module.
 */

import {
  getEmployeeDashboardService,
  getTeamDashboardService,
  getDepartmentDashboardService,
  getOrgDashboardService,
  getEmployeeCommentsService,
} from './results.service.js';

// ── GET /results/employee/:employeeId/cycle/:cycleId ──────────

export async function getEmployeeDashboard(req, res, next) {
  try {
    const { employeeId, cycleId } = req.params;
    const data = await getEmployeeDashboardService(employeeId, cycleId, req.user);
    return res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

// ── GET /results/employee/:employeeId/cycle/:cycleId/comments ─

export async function getEmployeeComments(req, res, next) {
  try {
    const { employeeId, cycleId } = req.params;
    const data = await getEmployeeCommentsService(employeeId, cycleId);
    return res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

// ── GET /results/team/cycle/:cycleId ─────────────────────────

export async function getTeamDashboard(req, res, next) {
  try {
    const { cycleId } = req.params;
    const data = await getTeamDashboardService(req.user.employeeId, cycleId);
    return res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

// ── GET /results/department/cycle/:cycleId ────────────────────

/**
 * HOD: their own department.
 * CXO: can pass ?department= to see any dept.
 */
export async function getDepartmentDashboard(req, res, next) {
  try {
    const { cycleId } = req.params;
    const filters = { group_name: req.query.group_name };

    let department = req.query.department;

    // HOD gets their own dept if no override provided
    if (!department || req.user.group_name !== 'CXO') {
      // Fetch dept from employee record
      const { supabaseAdmin } = await import('../../config/supabase.js');
      const { data: emp } = await supabaseAdmin
        .from('employees')
        .select('department')
        .eq('employee_id', req.user.employeeId)
        .single();
      department = department ?? emp?.department ?? null;
    }

    if (!department) {
      return res.status(400).json({ success: false, error: 'Department could not be determined.' });
    }

    const data = await getDepartmentDashboardService(department, cycleId, filters);
    return res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

// ── GET /results/org/cycle/:cycleId ──────────────────────────

export async function getOrgDashboard(req, res, next) {
  try {
    const { cycleId } = req.params;
    const filters = {
      department: req.query.department,
      group_name: req.query.group_name,
    };
    const data = await getOrgDashboardService(cycleId, filters);
    return res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}
