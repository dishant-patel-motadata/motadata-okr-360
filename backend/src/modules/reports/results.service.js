/**
 * modules/reports/results.service.js
 *
 * Dashboard data services.  Feeds all four role-based views:
 *   Employee  — label-only scores, anonymised comments, self-vs-dept
 *   TM        — team overview + individual drill-down (numeric)
 *   HOD       — department overview + manager-wise breakdown (numeric)
 *   CXO       — org-wide overview + department comparison (numeric)
 *
 * Anonymity rules (PRD §3.4):
 *   - Rater name / department: hidden from everyone except CXO (admin audit)
 *   - Reviewer category: visible to all
 *   - Individual responses: hidden from everyone except CXO audit
 *   - Aggregated numeric score: Employee sees label only; TM/HOD/CXO see numeric
 */

import { supabaseAdmin } from '../../config/supabase.js';
import {
  getCalculatedScore,
  getCalculatedScoresByCycle,
  getCalculatedScoresByEmployee,
  getDepartmentScoresByCycle,
} from '../scores/scores.repository.js';
import { getAnonymisedCommentsByAssignment } from '../responses/responses.repository.js';

// ── Internal helpers ──────────────────────────────────────────

/**
 * Get assignment_id for a given employee + cycle pair.
 * Returns null if not found.
 */
async function getAssignmentId(employeeId, cycleId) {
  const { data, error } = await supabaseAdmin
    .from('survey_assignments')
    .select('assignment_id')
    .eq('employee_id', employeeId)
    .eq('cycle_id', cycleId)
    .single();

  if (error) return null;
  return data?.assignment_id ?? null;
}

// ─────────────────────────────────────────────────────────────

/**
 * Get employee's self-feedback for one cycle (submitted only).
 */
async function getSelfFeedback(employeeId, cycleId) {
  const { data, error } = await supabaseAdmin
    .from('self_feedback')
    .select('competency_ratings, submitted_at')
    .eq('employee_id', employeeId)
    .eq('cycle_id', cycleId)
    .eq('status', 'SUBMITTED')
    .single();

  if (error) return null;
  return data;
}

// ─────────────────────────────────────────────────────────────

/**
 * Compute aggregated department averages from a list of score rows.
 * Returns { overall_avg, competency_avgs: { [competency_id]: number } }
 */
function aggregateDeptScores(scoreRows) {
  if (scoreRows.length === 0) return null;

  const overall = scoreRows.reduce((s, r) => s + (r.colleague_score ?? 0), 0) / scoreRows.length;

  const compBuckets = {};
  for (const row of scoreRows) {
    for (const [compId, val] of Object.entries(row.competency_scores ?? {})) {
      const score = typeof val === 'object' ? val.score : val;
      if (!compBuckets[compId]) compBuckets[compId] = { sum: 0, count: 0 };
      compBuckets[compId].sum += score;
      compBuckets[compId].count += 1;
    }
  }

  const competency_avgs = {};
  for (const [id, { sum, count }] of Object.entries(compBuckets)) {
    competency_avgs[id] = Math.round((sum / count) * 100) / 100;
  }

  return { overall_avg: Math.round(overall * 100) / 100, competency_avgs };
}

// ── Employee dashboard ─────────────────────────────────────────

/**
 * Full dashboard payload for an employee's own scorecard.
 *
 * Returns:
 *   - score (label-only unless viewer is TM/HOD/CXO)
 *   - comments (anonymised — reviewer_type + text only)
 *   - self_feedback
 *   - dept_comparison
 *   - historical (last 5 cycles)
 */
export async function getEmployeeDashboardService(employeeId, cycleId, viewerUser) {
  const score = await getCalculatedScore(employeeId, cycleId);

  if (!score) {
    const err = new Error('Results not available. The cycle may not have been calculated yet.');
    err.statusCode = 404;
    throw err;
  }

  // Decide numeric visibility
  const isOwnView = viewerUser.employeeId === employeeId;
  const canSeeNumeric = !isOwnView || ['TM', 'HOD', 'CXO'].includes(viewerUser.group_name);

  // Anonymised comments
  const assignmentId = await getAssignmentId(employeeId, cycleId);
  const comments = assignmentId ? await getAnonymisedCommentsByAssignment(assignmentId) : [];

  // Self-feedback
  const selfFeedback = await getSelfFeedback(employeeId, cycleId);

  // Department comparison
  const deptRows = await getDepartmentScoresByCycle(
    cycleId,
    score.employees?.department ?? null
  );
  const deptAgg = aggregateDeptScores(deptRows);

  // Historical scores (up to 5 past cycles)
  const historical = await getCalculatedScoresByEmployee(employeeId);
  const historicalShaped = historical.slice(0, 5).map((h) => ({
    cycle_id: h.cycle_id,
    cycle_name: h.review_cycles?.cycle_name ?? null,
    start_date: h.review_cycles?.start_date ?? null,
    final_label: h.final_label,
    colleague_score: canSeeNumeric ? h.colleague_score : undefined,
    calculated_at: h.calculated_at,
  }));

  // Shape score per anonymity rules
  const shapedScore = canSeeNumeric
    ? score
    : {
        calc_id: score.calc_id,
        employee_id: score.employee_id,
        cycle_id: score.cycle_id,
        final_label: score.final_label,
        total_reviewers: score.total_reviewers,
        calculated_at: score.calculated_at,
        employees: score.employees,
        review_cycles: score.review_cycles,
        // Label-only breakdowns
        competency_scores: Object.fromEntries(
          Object.entries(score.competency_scores ?? {}).map(([k, v]) => [
            k,
            { label: v.label },
          ])
        ),
        reviewer_category_scores: Object.fromEntries(
          Object.entries(score.reviewer_category_scores ?? {}).map(([k, v]) => [
            k,
            { label: v.label, reviewer_count: v.reviewer_count },
          ])
        ),
      };

  return {
    score: shapedScore,
    comments,
    self_feedback: selfFeedback
      ? { competency_ratings: selfFeedback.competency_ratings, submitted_at: selfFeedback.submitted_at }
      : null,
    dept_comparison: deptAgg
      ? {
          dept_overall_avg: deptAgg.overall_avg,
          my_overall_score: canSeeNumeric ? score.colleague_score : undefined,
          competency_comparison: Object.entries(deptAgg.competency_avgs).map(([compId, deptAvg]) => {
            const myScore = score.competency_scores?.[compId];
            return {
              competency_id: compId,
              dept_avg: deptAvg,
              my_score: canSeeNumeric && myScore ? (typeof myScore === 'object' ? myScore.score : myScore) : undefined,
              my_label: myScore?.label ?? null,
            };
          }),
        }
      : null,
    historical: historicalShaped,
  };
}

// ── Team Manager dashboard ─────────────────────────────────────

/**
 * TM dashboard: all direct reports' scores for a cycle.
 * viewer must be TM/HOD/CXO.
 */
export async function getTeamDashboardService(managerEmployeeId, cycleId) {
  // Get all direct reports
  const { data: directReports, error } = await supabaseAdmin
    .from('employees')
    .select('employee_id, full_name, department, designation, group_name')
    .eq('reporting_manager_id', managerEmployeeId)
    .eq('is_active', true);

  if (error) throw error;

  if (directReports.length === 0) {
    return { cycle_id: cycleId, team: [], summary: {} };
  }

  const empIds = directReports.map((e) => e.employee_id);

  // Fetch all scores for these employees in the cycle
  const { data: scores, error: scErr } = await supabaseAdmin
    .from('calculated_scores')
    .select(
      `employee_id, colleague_score, self_score, final_label,
       competency_scores, reviewer_category_scores, total_reviewers`
    )
    .eq('cycle_id', cycleId)
    .in('employee_id', empIds);

  if (scErr) throw scErr;

  const scoreMap = new Map((scores ?? []).map((s) => [s.employee_id, s]));

  const team = directReports.map((emp) => {
    const sc = scoreMap.get(emp.employee_id) ?? null;
    return {
      employee_id: emp.employee_id,
      full_name: emp.full_name,
      department: emp.department,
      designation: emp.designation,
      group_name: emp.group_name,
      score: sc
        ? {
            colleague_score: sc.colleague_score,
            final_label: sc.final_label,
            total_reviewers: sc.total_reviewers,
            competency_scores: sc.competency_scores,
            reviewer_category_scores: sc.reviewer_category_scores,
          }
        : null,
    };
  });

  // Team summary
  const scoredMembers = team.filter((m) => m.score !== null);
  const teamAvg =
    scoredMembers.length > 0
      ? scoredMembers.reduce((s, m) => s + m.score.colleague_score, 0) / scoredMembers.length
      : null;

  return {
    cycle_id: cycleId,
    team,
    summary: {
      total_members: directReports.length,
      scored: scoredMembers.length,
      team_avg: teamAvg !== null ? Math.round(teamAvg * 100) / 100 : null,
    },
  };
}

// ── HOD dashboard ──────────────────────────────────────────────

/**
 * HOD dashboard: entire department scores for a cycle.
 * Returns per-employee scores + manager-wise breakdown.
 */
export async function getDepartmentDashboardService(department, cycleId, filters = {}) {
  let employeeQuery = supabaseAdmin
    .from('employees')
    .select('employee_id, full_name, designation, group_name, reporting_manager_id')
    .eq('department', department)
    .eq('is_active', true);

  if (filters.group_name) employeeQuery = employeeQuery.eq('group_name', filters.group_name);

  const { data: employees, error: empErr } = await employeeQuery;
  if (empErr) throw empErr;
  if (employees.length === 0) return { department, cycle_id: cycleId, employees: [], managers: {} };

  const empIds = employees.map((e) => e.employee_id);

  const { data: scores, error: scErr } = await supabaseAdmin
    .from('calculated_scores')
    .select(
      `employee_id, colleague_score, final_label,
       competency_scores, total_reviewers`
    )
    .eq('cycle_id', cycleId)
    .in('employee_id', empIds);

  if (scErr) throw scErr;
  const scoreMap = new Map((scores ?? []).map((s) => [s.employee_id, s]));

  const membersWithScores = employees.map((emp) => {
    const sc = scoreMap.get(emp.employee_id) ?? null;
    return {
      employee_id: emp.employee_id,
      full_name: emp.full_name,
      designation: emp.designation,
      group_name: emp.group_name,
      reporting_manager_id: emp.reporting_manager_id,
      score: sc
        ? { colleague_score: sc.colleague_score, final_label: sc.final_label, total_reviewers: sc.total_reviewers }
        : null,
    };
  });

  // Manager-wise grouping
  const managerMap = {};
  for (const m of membersWithScores) {
    const mgId = m.reporting_manager_id ?? '__no_manager__';
    if (!managerMap[mgId]) managerMap[mgId] = { members: [], avg: null };
    managerMap[mgId].members.push(m);
  }
  for (const [mgId, grp] of Object.entries(managerMap)) {
    const scored = grp.members.filter((m) => m.score);
    grp.avg =
      scored.length > 0
        ? Math.round((scored.reduce((s, m) => s + m.score.colleague_score, 0) / scored.length) * 100) / 100
        : null;
  }

  // Dept overall
  const scored = membersWithScores.filter((m) => m.score);
  const deptAvg =
    scored.length > 0
      ? Math.round((scored.reduce((s, m) => s + m.score.colleague_score, 0) / scored.length) * 100) / 100
      : null;

  return {
    department,
    cycle_id: cycleId,
    summary: { total: employees.length, scored: scored.length, dept_avg: deptAvg },
    employees: membersWithScores,
    manager_groups: managerMap,
  };
}

// ── CXO org dashboard ──────────────────────────────────────────

/**
 * CXO dashboard: all employees across all departments for a cycle.
 * Optional ?department= / ?group_name= filters.
 */
export async function getOrgDashboardService(cycleId, filters = {}) {
  // Verify cycle
  const { data: cycle, error: cycErr } = await supabaseAdmin
    .from('review_cycles')
    .select('cycle_id, cycle_name, status')
    .eq('cycle_id', cycleId)
    .single();

  if (cycErr || !cycle) {
    const err = new Error('Cycle not found.');
    err.statusCode = 404;
    throw err;
  }

  let query = supabaseAdmin
    .from('calculated_scores')
    .select(
      `employee_id, colleague_score, final_label,
       competency_scores, reviewer_category_scores, total_reviewers, calculated_at,
       employees!inner(full_name, department, designation, group_name)`
    )
    .eq('cycle_id', cycleId)
    .order('colleague_score', { ascending: false });

  if (filters.department) query = query.eq('employees.department', filters.department);
  if (filters.group_name) query = query.eq('employees.group_name', filters.group_name);

  const { data: scores, error: scErr } = await query;
  if (scErr) throw scErr;

  // Department-level aggregation
  const deptMap = {};
  for (const sc of scores ?? []) {
    const dept = sc.employees?.department ?? 'Unknown';
    if (!deptMap[dept]) deptMap[dept] = { sum: 0, count: 0, members: [] };
    deptMap[dept].sum += sc.colleague_score ?? 0;
    deptMap[dept].count += 1;
    deptMap[dept].members.push({ employee_id: sc.employee_id, final_label: sc.final_label });
  }

  const department_summary = Object.entries(deptMap).map(([dept, { sum, count, members }]) => ({
    department: dept,
    avg_score: Math.round((sum / count) * 100) / 100,
    employee_count: count,
    label_distribution: members.reduce((acc, m) => {
      acc[m.final_label] = (acc[m.final_label] ?? 0) + 1;
      return acc;
    }, {}),
  }));

  // Org overall avg
  const allScores = (scores ?? []).map((s) => s.colleague_score ?? 0);
  const org_avg = allScores.length
    ? Math.round((allScores.reduce((s, v) => s + v, 0) / allScores.length) * 100) / 100
    : null;

  return {
    cycle,
    summary: { total_employees: scores?.length ?? 0, org_avg },
    employees: scores ?? [],
    department_summary,
  };
}

// ── Comments for a specific employee/cycle (TM/HOD/CXO) ──────

/**
 * Get anonymised comments for an employee in a cycle.
 * TM/HOD/CXO see reviewer_type + text; no rater identity.
 */
export async function getEmployeeCommentsService(employeeId, cycleId) {
  const assignmentId = await getAssignmentId(employeeId, cycleId);
  if (!assignmentId) return [];
  return getAnonymisedCommentsByAssignment(assignmentId);
}
