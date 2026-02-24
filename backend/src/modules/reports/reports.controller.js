/**
 * modules/reports/reports.controller.js
 *
 * Thin controllers for the Reports (PDF/CSV generation) module.
 * All controllers stream the generated file directly to the response.
 */

import {
  generateIndividualPdfService,
  generateDepartmentPdfService,
  generateOrgPdfService,
  generateCsvExportService,
} from './reports.service.js';

// ── Helper: send file response ────────────────────────────────

function sendFile(res, { buffer, contentType, filename }) {
  // Strip characters outside printable ASCII (0x20–0x7E) and escape quotes/backslashes
  // to avoid ERR_INVALID_CHAR in the Content-Disposition header.
  const safeFilename = filename
    .replace(/[^\x20-\x7E]/g, '_')   // non-ASCII → _
    .replace(/["/\\]/g, '_');          // quotes / slashes → _
  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
  res.setHeader('Content-Length', buffer.length);
  return res.status(200).end(buffer);
}

// ── RPT-01/02/03  Individual employee PDF ─────────────────────

export async function generateIndividualPdf(req, res, next) {
  try {
    const { employeeId, cycleId } = req.params;
    const result = await generateIndividualPdfService(employeeId, cycleId);
    return sendFile(res, result);
  } catch (err) {
    next(err);
  }
}

// ── RPT-04  Department summary PDF ────────────────────────────

export async function generateDepartmentPdf(req, res, next) {
  try {
    const { cycleId } = req.params;
    const department = req.query.department;

    if (!department) {
      return res.status(400).json({ success: false, error: 'department query parameter is required.' });
    }

    const result = await generateDepartmentPdfService(department, cycleId);
    return sendFile(res, result);
  } catch (err) {
    next(err);
  }
}

// ── RPT-05  Organisation summary PDF ──────────────────────────

export async function generateOrgPdf(req, res, next) {
  try {
    const { cycleId } = req.params;
    const result = await generateOrgPdfService(cycleId);
    return sendFile(res, result);
  } catch (err) {
    next(err);
  }
}

// ── RPT-06  Raw CSV export ─────────────────────────────────────

export async function exportCsv(req, res, next) {
  try {
    const { cycleId } = req.params;
    const result = await generateCsvExportService(cycleId);
    return sendFile(res, result);
  } catch (err) {
    next(err);
  }
}
