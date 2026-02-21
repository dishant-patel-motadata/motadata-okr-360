/**
 * modules/reports/reports.service.js
 *
 * PDF and CSV report generation (RPT-01 to RPT-07).
 *
 * PDF generation uses pdfkit (already installed).
 * CSV generation uses plain string construction (no extra deps).
 *
 * RPT-03: PDFs must NEVER include reviewer names or departments.
 *
 * All service functions return either:
 *   { buffer: Buffer, contentType, filename }  — for download responses
 */

import PDFDocument from 'pdfkit';
import { supabaseAdmin } from '../../config/supabase.js';
import {
  getCalculatedScore,
  getCalculatedScoresByCycle,
  getCalculatedScoresByEmployee,
} from '../scores/scores.repository.js';
import { getAnonymisedCommentsByAssignment } from '../responses/responses.repository.js';

// ── PDF helper utilities ──────────────────────────────────────

/**
 * Render a PDFDocument to a Buffer asynchronously.
 */
function pdfToBuffer(doc) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });
}

// ─────────────────────────────────────────────────────────────

/**
 * Draw a simple divider line.
 */
function divider(doc) {
  doc
    .moveTo(doc.page.margins.left, doc.y)
    .lineTo(doc.page.width - doc.page.margins.right, doc.y)
    .strokeColor('#aaaaaa')
    .lineWidth(0.5)
    .stroke()
    .moveDown(0.5);
}

// ─────────────────────────────────────────────────────────────

/**
 * Shared page header for all PDF types.
 */
function pdfHeader(doc, title, subtitle) {
  doc
    .fontSize(20)
    .fillColor('#1a1a2e')
    .text('360 Feedback Platform', { align: 'center' })
    .moveDown(0.2)
    .fontSize(14)
    .fillColor('#16213e')
    .text(title, { align: 'center' })
    .moveDown(0.2)
    .fontSize(10)
    .fillColor('#666666')
    .text(subtitle ?? `Generated: ${new Date().toLocaleDateString('en-GB')}`, { align: 'center' })
    .moveDown(1);
  divider(doc);
}

// ─────────────────────────────────────────────────────────────

/**
 * Confidentiality footer on every page.
 */
function addPageFooter(doc) {
  const bottom = doc.page.height - doc.page.margins.bottom - 20;
  doc
    .fontSize(7)
    .fillColor('#999999')
    .text(
      'CONFIDENTIAL — This report is intended solely for the named recipient. ' +
        'Reviewer identities are anonymised. Do not distribute without authorisation.',
      doc.page.margins.left,
      bottom,
      { width: doc.page.width - doc.page.margins.left - doc.page.margins.right, align: 'center' }
    );
}

// ─────────────────────────────────────────────────────────────

/**
 * Render a score band badge as coloured text.
 */
function scoreBadge(doc, label) {
  const colours = {
    'Outstanding Impact': '#1a7f37',
    'Significant Impact': '#0969da',
    'Moderate Impact': '#9a6700',
    'Not Enough Impact': '#cf222e',
  };
  const colour = colours[label] ?? '#333333';
  doc
    .fontSize(13)
    .fillColor(colour)
    .text(`  ${label}  `, { continued: false })
    .fillColor('#000000');
}

// ── Internal data loaders ─────────────────────────────────────

async function loadCycle(cycleId) {
  const { data, error } = await supabaseAdmin
    .from('review_cycles')
    .select('cycle_id, cycle_name, start_date, end_date, status')
    .eq('cycle_id', cycleId)
    .single();
  if (error || !data) {
    const err = new Error('Cycle not found.');
    err.statusCode = 404;
    throw err;
  }
  return data;
}

async function loadEmployee(employeeId) {
  const { data, error } = await supabaseAdmin
    .from('employees')
    .select('employee_id, full_name, email, department, designation, group_name')
    .eq('employee_id', employeeId)
    .single();
  if (error || !data) {
    const err = new Error('Employee not found.');
    err.statusCode = 404;
    throw err;
  }
  return data;
}

async function loadCompetencies() {
  const { data } = await supabaseAdmin
    .from('competencies')
    .select('competency_id, competency_name')
    .eq('is_active', true);
  const map = new Map((data ?? []).map((c) => [c.competency_id, c.competency_name]));
  return map;
}

async function loadAssignmentId(employeeId, cycleId) {
  const { data } = await supabaseAdmin
    .from('survey_assignments')
    .select('assignment_id')
    .eq('employee_id', employeeId)
    .eq('cycle_id', cycleId)
    .single();
  return data?.assignment_id ?? null;
}

// ── RPT-01/02/03  Individual employee PDF ─────────────────────

/**
 * Generate an individual employee PDF report.
 *
 * Sections (PRD §4.8.2):
 *   1. Header (name, designation, dept, cycle)
 *   2. Overall score (label + band)
 *   3. Competency breakdown (table)
 *   4. Reviewer category breakdown
 *   5. Historical trend (last 3 cycles)
 *   6. Anonymised comments
 *   7. Footer (confidentiality notice)
 *
 * RPT-03: NO reviewer names or departments anywhere.
 */
export async function generateIndividualPdfService(employeeId, cycleId) {
  const [employee, cycle, score, competencyMap, history] = await Promise.all([
    loadEmployee(employeeId),
    loadCycle(cycleId),
    getCalculatedScore(employeeId, cycleId),
    loadCompetencies(),
    getCalculatedScoresByEmployee(employeeId),
  ]);

  if (!score) {
    const err = new Error('Score not available for this employee and cycle.');
    err.statusCode = 404;
    throw err;
  }

  const assignmentId = await loadAssignmentId(employeeId, cycleId);
  const comments = assignmentId ? await getAnonymisedCommentsByAssignment(assignmentId) : [];

  const doc = new PDFDocument({ margin: 50, size: 'A4', bufferPages: true });
  const bufferPromise = pdfToBuffer(doc);

  // ── SECTION 1: Header ───────────────────────────────────────
  pdfHeader(doc, 'Individual 360 Feedback Report', cycle.cycle_name);

  doc
    .fontSize(12)
    .fillColor('#000000')
    .text(`Name:          ${employee.full_name}`)
    .text(`Designation:   ${employee.designation}`)
    .text(`Department:    ${employee.department}`)
    .text(`Review Cycle:  ${cycle.cycle_name}`)
    .text(`Period:        ${cycle.start_date} – ${cycle.end_date}`)
    .text(`Reviewers:     ${score.total_reviewers} completed`)
    .moveDown(1);

  divider(doc);

  // ── SECTION 2: Overall Score ────────────────────────────────
  doc.fontSize(13).fillColor('#1a1a2e').text('Overall Score', { underline: true }).moveDown(0.3);
  scoreBadge(doc, score.final_label);
  doc
    .fontSize(10)
    .fillColor('#555555')
    .text(
      `Based on ${score.total_reviewers} reviewer(s). ` +
        `Self-assessment is for reference only and is excluded from this score.`
    )
    .moveDown(1);

  divider(doc);

  // ── SECTION 3: Competency Breakdown ────────────────────────
  doc.fontSize(13).fillColor('#1a1a2e').text('Competency Breakdown', { underline: true }).moveDown(0.5);

  const compEntries = Object.entries(score.competency_scores ?? {});
  if (compEntries.length > 0) {
    const colW = [220, 80, 160];
    const rowH = 18;
    const startX = doc.page.margins.left;
    let y = doc.y;

    // Header row
    doc.fontSize(9).fillColor('#ffffff');
    doc.rect(startX, y, colW[0] + colW[1] + colW[2], rowH).fill('#1a1a2e');
    doc
      .fillColor('#ffffff')
      .text('Competency', startX + 4, y + 4, { width: colW[0], lineBreak: false })
      .text('Score', startX + colW[0] + 4, y + 4, { width: colW[1], lineBreak: false })
      .text('Label', startX + colW[0] + colW[1] + 4, y + 4, { width: colW[2], lineBreak: false });
    y += rowH;

    const labelColours = {
      'Outstanding Impact': '#d4f5d4',
      'Significant Impact': '#d0e8ff',
      'Moderate Impact': '#fff8cc',
      'Not Enough Impact': '#ffe0e0',
    };

    compEntries.forEach(([compId, val], i) => {
      const bg = i % 2 === 0 ? '#f9f9f9' : '#ffffff';
      const label = typeof val === 'object' ? val.label : score.final_label;
      const sc = typeof val === 'object' ? val.score : val;
      doc.rect(startX, y, colW[0] + colW[1] + colW[2], rowH).fill(bg);
      doc.fillColor('#000000').fontSize(9);
      doc
        .text(competencyMap.get(compId) ?? compId, startX + 4, y + 4, {
          width: colW[0] - 8,
          lineBreak: false,
        })
        .text(String(sc), startX + colW[0] + 4, y + 4, { width: colW[1] - 8, lineBreak: false });

      const lbBg = labelColours[label] ?? '#f0f0f0';
      doc.rect(startX + colW[0] + colW[1], y, colW[2], rowH).fill(lbBg);
      doc
        .fillColor('#000000')
        .text(label, startX + colW[0] + colW[1] + 4, y + 4, { width: colW[2] - 8, lineBreak: false });
      y += rowH;
    });

    doc.y = y + 4;
  } else {
    doc.fontSize(10).fillColor('#888888').text('No competency data available.');
  }
  doc.moveDown(1);
  divider(doc);

  // ── SECTION 4: Reviewer Category Breakdown ──────────────────
  doc.fontSize(13).fillColor('#1a1a2e').text('Reviewer Category Scores', { underline: true }).moveDown(0.5);

  const catEntries = Object.entries(score.reviewer_category_scores ?? {});
  if (catEntries.length > 0) {
    catEntries.forEach(([type, val]) => {
      const label = typeof val === 'object' ? val.label : '--';
      const sc = typeof val === 'object' ? val.score : val;
      const count = typeof val === 'object' ? val.reviewer_count : '--';
      doc
        .fontSize(10)
        .fillColor('#000000')
        .text(`${type.replace(/_/g, ' ')}`, { continued: true })
        .fillColor('#888888')
        .text(`  (${count} reviewer${count !== 1 ? 's' : ''})`, { continued: true })
        .fillColor('#000000')
        .text(`  →  ${sc}  —  ${label}`);
    });
  } else {
    doc.fontSize(10).fillColor('#888888').text('No category data available.');
  }
  doc.moveDown(1);
  divider(doc);

  // ── SECTION 5: Historical Trend (last 3 cycles) ─────────────
  doc.fontSize(13).fillColor('#1a1a2e').text('Historical Trend (Last 3 Cycles)', { underline: true }).moveDown(0.5);

  const recent = history.slice(0, 3);
  if (recent.length > 0) {
    recent.forEach((h) => {
      doc
        .fontSize(10)
        .fillColor('#000000')
        .text(
          `${h.review_cycles?.cycle_name ?? h.cycle_id}  —  ${h.final_label}  (score: ${h.colleague_score})`
        );
    });
  } else {
    doc.fontSize(10).fillColor('#888888').text('No historical data available.');
  }
  doc.moveDown(1);
  divider(doc);

  // ── SECTION 6: Comments ─────────────────────────────────────
  doc.fontSize(13).fillColor('#1a1a2e').text('Reviewer Comments', { underline: true }).moveDown(0.5);
  doc.fontSize(8).fillColor('#888888').text('Reviewer identities are anonymised.').moveDown(0.4);

  if (comments.length > 0) {
    comments.forEach((c, idx) => {
      doc
        .fontSize(10)
        .fillColor('#444444')
        .text(`[${c.reviewer_type.replace(/_/g, ' ')}]  `, { continued: true })
        .fillColor('#000000')
        .text(`"${c.comment_text}"`)
        .moveDown(0.3);
    });
  } else {
    doc.fontSize(10).fillColor('#888888').text('No comments submitted for this cycle.');
  }

  // ── Footer on every page ────────────────────────────────────
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    addPageFooter(doc);
  }

  doc.end();
  const buffer = await bufferPromise;

  const safeName = employee.full_name.replace(/[^a-zA-Z0-9]/g, '_');
  return {
    buffer,
    contentType: 'application/pdf',
    filename: `360_Report_${safeName}_${cycle.cycle_name.replace(/\s+/g, '_')}.pdf`,
  };
}

// ── RPT-04  Department summary PDF ────────────────────────────

export async function generateDepartmentPdfService(department, cycleId) {
  const cycle = await loadCycle(cycleId);

  const { data: scores, error } = await supabaseAdmin
    .from('calculated_scores')
    .select(
      `employee_id, colleague_score, final_label, total_reviewers,
       employees!inner(full_name, designation, group_name, department)`
    )
    .eq('cycle_id', cycleId)
    .eq('employees.department', department)
    .order('colleague_score', { ascending: false });

  if (error) throw error;

  const doc = new PDFDocument({ margin: 50, size: 'A4', bufferPages: true });
  const bufferPromise = pdfToBuffer(doc);

  pdfHeader(doc, `Department Report — ${department}`, cycle.cycle_name);

  doc
    .fontSize(10)
    .fillColor('#555555')
    .text(`Department: ${department}`)
    .text(`Cycle: ${cycle.cycle_name}  |  Period: ${cycle.start_date} – ${cycle.end_date}`)
    .text(`Employees with scores: ${(scores ?? []).length}`)
    .moveDown(1);

  if (!scores || scores.length === 0) {
    doc.text('No score data available for this department.').end();
    const buffer = await bufferPromise;
    return {
      buffer,
      contentType: 'application/pdf',
      filename: `360_Dept_${department}_${cycle.cycle_name.replace(/\s+/g, '_')}.pdf`,
    };
  }

  // Dept average
  const avg = scores.reduce((s, r) => s + r.colleague_score, 0) / scores.length;
  doc
    .fontSize(12)
    .fillColor('#1a1a2e')
    .text(`Department Average Score: ${Math.round(avg * 100) / 100}`)
    .moveDown(0.5);

  divider(doc);
  doc.fontSize(13).fillColor('#1a1a2e').text('Employee Scores', { underline: true }).moveDown(0.5);

  const colW = [180, 120, 70, 160];
  const rowH = 18;
  const startX = doc.page.margins.left;
  let y = doc.y;

  // Header row
  doc.rect(startX, y, colW.reduce((a, b) => a + b, 0), rowH).fill('#1a1a2e');
  doc.fillColor('#ffffff').fontSize(9);
  let x = startX;
  ['Name', 'Designation', 'Score', 'Label'].forEach((h, i) => {
    doc.text(h, x + 4, y + 4, { width: colW[i] - 8, lineBreak: false });
    x += colW[i];
  });
  y += rowH;

  scores.forEach((sc, i) => {
    const bg = i % 2 === 0 ? '#f9f9f9' : '#ffffff';
    doc.rect(startX, y, colW.reduce((a, b) => a + b, 0), rowH).fill(bg);
    doc.fillColor('#000000').fontSize(9);
    x = startX;
    const emp = sc.employees;
    [
      emp?.full_name ?? sc.employee_id,
      emp?.designation ?? '--',
      String(sc.colleague_score),
      sc.final_label,
    ].forEach((val, j) => {
      doc.text(val, x + 4, y + 4, { width: colW[j] - 8, lineBreak: false });
      x += colW[j];
    });
    y += rowH;
    // Page break safety
    if (y > doc.page.height - 100) {
      doc.addPage();
      y = doc.page.margins.top;
    }
  });

  doc.y = y + 8;

  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    addPageFooter(doc);
  }

  doc.end();
  const buffer = await bufferPromise;

  return {
    buffer,
    contentType: 'application/pdf',
    filename: `360_Dept_${department.replace(/\s+/g, '_')}_${cycle.cycle_name.replace(/\s+/g, '_')}.pdf`,
  };
}

// ── RPT-05  Organisation summary PDF ──────────────────────────

export async function generateOrgPdfService(cycleId) {
  const cycle = await loadCycle(cycleId);

  const { data: scores, error } = await supabaseAdmin
    .from('calculated_scores')
    .select(
      `employee_id, colleague_score, final_label,
       employees!inner(full_name, department, designation, group_name)`
    )
    .eq('cycle_id', cycleId)
    .order('employees(department)', { ascending: true });

  if (error) throw error;

  const doc = new PDFDocument({ margin: 50, size: 'A4', bufferPages: true });
  const bufferPromise = pdfToBuffer(doc);

  pdfHeader(doc, 'Organisation 360 Summary', cycle.cycle_name);

  const total = (scores ?? []).length;
  const orgAvg = total
    ? Math.round((scores.reduce((s, r) => s + r.colleague_score, 0) / total) * 100) / 100
    : 0;

  doc
    .fontSize(12)
    .fillColor('#000000')
    .text(`Cycle: ${cycle.cycle_name}`)
    .text(`Period: ${cycle.start_date} – ${cycle.end_date}`)
    .text(`Total employees with scores: ${total}`)
    .text(`Organisation average score: ${orgAvg}`)
    .moveDown(1);

  // Label distribution
  divider(doc);
  doc.fontSize(13).fillColor('#1a1a2e').text('Score Distribution', { underline: true }).moveDown(0.5);
  const distribution = {};
  for (const s of scores ?? []) {
    distribution[s.final_label] = (distribution[s.final_label] ?? 0) + 1;
  }
  for (const [label, count] of Object.entries(distribution)) {
    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
    doc.fontSize(10).fillColor('#000000').text(`${label}: ${count} (${pct}%)`);
  }
  doc.moveDown(1);

  // Department breakdown
  divider(doc);
  doc.fontSize(13).fillColor('#1a1a2e').text('Department Breakdown', { underline: true }).moveDown(0.5);

  const deptMap = {};
  for (const sc of scores ?? []) {
    const dept = sc.employees?.department ?? 'Unknown';
    if (!deptMap[dept]) deptMap[dept] = { sum: 0, count: 0 };
    deptMap[dept].sum += sc.colleague_score;
    deptMap[dept].count += 1;
  }
  const depts = Object.entries(deptMap).sort((a, b) => b[1].sum / b[1].count - a[1].sum / a[1].count);
  depts.forEach(([dept, { sum, count }]) => {
    const avg = Math.round((sum / count) * 100) / 100;
    doc.fontSize(10).fillColor('#000000').text(`${dept.padEnd(30, ' ')}  Avg: ${avg}   (${count} employees)`);
  });
  doc.moveDown(1);

  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    addPageFooter(doc);
  }

  doc.end();
  const buffer = await bufferPromise;

  return {
    buffer,
    contentType: 'application/pdf',
    filename: `360_Org_Summary_${cycle.cycle_name.replace(/\s+/g, '_')}.pdf`,
  };
}

// ── RPT-06  Raw CSV export ─────────────────────────────────────

/**
 * Export all calculated scores for a cycle as CSV.
 * RPT-03 still applies: no reviewer names or departments in individual-level detail.
 * Admin-only endpoint.
 */
export async function generateCsvExportService(cycleId) {
  const cycle = await loadCycle(cycleId);

  const { data: scores, error } = await supabaseAdmin
    .from('calculated_scores')
    .select(
      `employee_id, colleague_score, self_score, final_label,
       competency_scores, reviewer_category_scores, total_reviewers, calculated_at,
       employees!inner(full_name, department, designation, group_name)`
    )
    .eq('cycle_id', cycleId)
    .order('employees(department)', { ascending: true });

  if (error) throw error;

  if (!scores || scores.length === 0) {
    const csv = 'No data available for this cycle.\n';
    return {
      buffer: Buffer.from(csv),
      contentType: 'text/csv',
      filename: `360_Export_${cycle.cycle_name.replace(/\s+/g, '_')}.csv`,
    };
  }

  // Build CSV
  const escape = (v) => {
    if (v === null || v === undefined) return '';
    const str = String(v);
    return str.includes(',') || str.includes('"') || str.includes('\n')
      ? `"${str.replace(/"/g, '""')}"`
      : str;
  };

  const headers = [
    'employee_id',
    'full_name',
    'department',
    'designation',
    'group',
    'cycle_id',
    'cycle_name',
    'colleague_score',
    'self_score',
    'final_label',
    'total_reviewers',
    'calculated_at',
    'competency_scores_json',
    'reviewer_category_scores_json',
  ];

  const rows = [headers.join(',')];

  for (const sc of scores) {
    const emp = sc.employees;
    rows.push(
      [
        escape(sc.employee_id),
        escape(emp?.full_name),
        escape(emp?.department),
        escape(emp?.designation),
        escape(emp?.group_name),
        escape(cycleId),
        escape(cycle.cycle_name),
        escape(sc.colleague_score),
        escape(sc.self_score),
        escape(sc.final_label),
        escape(sc.total_reviewers),
        escape(sc.calculated_at),
        escape(JSON.stringify(sc.competency_scores)),
        escape(JSON.stringify(sc.reviewer_category_scores)),
      ].join(',')
    );
  }

  const csv = rows.join('\r\n') + '\r\n';

  return {
    buffer: Buffer.from(csv, 'utf-8'),
    contentType: 'text/csv',
    filename: `360_Export_${cycle.cycle_name.replace(/\s+/g, '_')}.csv`,
  };
}
