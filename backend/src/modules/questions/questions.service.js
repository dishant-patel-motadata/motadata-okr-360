/**
 * modules/questions/questions.service.js
 *
 * Handles:
 *  - CRUD with auto-generated question_id (e.g. "IC-16")
 *  - CSV bulk import (QB-06): parse, validate, upsert
 *  - Competency FK validation before insert/update
 */

import { parse as csvParse } from 'csv-parse/sync';
import {
  listQuestions,
  getQuestionById,
  createQuestion,
  updateQuestion,
  getNextOrderNumber,
  upsertQuestions,
} from './questions.repository.js';
import { getCompetencyById } from '../competencies/competencies.repository.js';
import { writeAuditLog } from '../../utils/auditLogger.js';
import { csvQuestionRowSchema } from './questions.validator.js';

export async function listQuestionsService(query) {
  return listQuestions(query);
}

export async function getQuestionService(questionId) {
  const q = await getQuestionById(questionId);
  if (!q) {
    const err = new Error(`Question "${questionId}" not found.`);
    err.status = 404;
    throw err;
  }
  return q;
}

export async function createQuestionService(body, requestingUser) {
  // Validate competency exists
  await _assertCompetencyExists(body.competency_id);

  // Auto-generate question_id if not supplied
  const questionId = body.question_id ?? await _generateQuestionId(body.set_type);

  const question = await createQuestion({
    question_id: questionId,
    set_type: body.set_type,
    order_number: body.order_number,
    question_text: body.question_text,
    category: body.category,
    competency_id: body.competency_id,
    is_active: true,
  });

  await writeAuditLog({
    userId: requestingUser.employeeId,
    actionType: 'CREATE',
    entityType: 'questions',
    entityId: questionId,
    newValue: question,
  });

  return question;
}

export async function updateQuestionService(questionId, updates, requestingUser) {
  const existing = await getQuestionService(questionId);

  if (updates.competency_id) {
    await _assertCompetencyExists(updates.competency_id);
  }

  const updated = await updateQuestion(questionId, updates);

  await writeAuditLog({
    userId: requestingUser.employeeId,
    actionType: 'UPDATE',
    entityType: 'questions',
    entityId: questionId,
    oldValue: existing,
    newValue: updated,
  });

  return updated;
}

// ── CSV Bulk Import ────────────────────────────────────────

/**
 * Parse CSV buffer, validate each row against csvQuestionRowSchema,
 * auto-generate missing question_ids, then upsert all valid rows.
 *
 * Expected CSV columns (header row required):
 *   question_id, set_type, order_number, question_text, category, competency_id
 *   (question_id is optional — omit column or leave cell blank)
 *
 * @param {Buffer} fileBuffer
 * @param {{ employeeId:string }} requestingUser
 * @returns {{ imported: number, errors: object[] }}
 */
export async function importQuestionsCsvService(fileBuffer, requestingUser) {
  let rawRows;
  try {
    rawRows = csvParse(fileBuffer, {
      columns: true,      // use first row as header
      skip_empty_lines: true,
      trim: true,
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
  const errors = [];

  for (let i = 0; i < rawRows.length; i++) {
    const row = rawRows[i];
    const rowNum = i + 2; // +2 because row 1 is header

    const result = csvQuestionRowSchema.safeParse({
      ...row,
      order_number: row.order_number ? Number(row.order_number) : undefined,
    });

    if (!result.success) {
      errors.push({
        row: rowNum,
        data: row,
        issues: result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`),
      });
      continue;
    }

    const parsed = result.data;

    // Validate competency FK
    const comp = await getCompetencyById(parsed.competency_id);
    if (!comp) {
      errors.push({
        row: rowNum,
        data: row,
        issues: [`competency_id "${parsed.competency_id}" does not exist in competencies table`],
      });
      continue;
    }

    // Auto-generate question_id if blank
    const questionId =
      parsed.question_id && parsed.question_id.trim()
        ? parsed.question_id.trim()
        : await _generateQuestionId(parsed.set_type);

    validRows.push({
      question_id: questionId,
      set_type: parsed.set_type,
      order_number: parsed.order_number,
      question_text: parsed.question_text,
      category: parsed.category,
      competency_id: parsed.competency_id,
      is_active: true,
    });
  }

  let imported = 0;
  if (validRows.length > 0) {
    const result = await upsertQuestions(validRows);
    imported = result.length;

    await writeAuditLog({
      userId: requestingUser.employeeId,
      actionType: 'BULK_IMPORT',
      entityType: 'questions',
      entityId: 'bulk',
      newValue: { imported, errorCount: errors.length },
    });
  }

  return { imported, errors };
}

// ── Helpers ────────────────────────────────────────────────

async function _assertCompetencyExists(competencyId) {
  const comp = await getCompetencyById(competencyId);
  if (!comp) {
    const err = new Error(`Competency "${competencyId}" not found. Create it first.`);
    err.status = 422;
    throw err;
  }
}

async function _generateQuestionId(setType) {
  const next = await getNextOrderNumber(setType);
  return `${setType}-${String(next).padStart(2, '0')}`;
}
