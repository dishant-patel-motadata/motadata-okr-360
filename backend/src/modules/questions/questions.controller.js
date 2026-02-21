/**
 * modules/questions/questions.controller.js
 */

import { asyncWrapper } from '../../utils/asyncWrapper.js';
import { sendSuccess, sendError } from '../../utils/response.js';
import {
  listQuestionsService,
  getQuestionService,
  createQuestionService,
  updateQuestionService,
  importQuestionsCsvService,
} from './questions.service.js';

export const listQuestions = asyncWrapper(async (req, res) => {
  const questions = await listQuestionsService(req.query);
  return sendSuccess(res, questions, 'Questions retrieved successfully.');
});

export const getQuestion = asyncWrapper(async (req, res) => {
  const question = await getQuestionService(req.params.id);
  return sendSuccess(res, question, 'Question retrieved successfully.');
});

export const createQuestion = asyncWrapper(async (req, res) => {
  const question = await createQuestionService(req.body, req.user);
  return sendSuccess(res, question, 'Question created successfully.', 201);
});

export const updateQuestion = asyncWrapper(async (req, res) => {
  const question = await updateQuestionService(req.params.id, req.body, req.user);
  return sendSuccess(res, question, 'Question updated successfully.');
});

export const importQuestionsCsv = asyncWrapper(async (req, res) => {
  if (!req.file) {
    return sendError(res, 'No CSV file uploaded. Use multipart/form-data with field name "file".', 422);
  }

  const { imported, errors } = await importQuestionsCsvService(req.file.buffer, req.user);

  return sendSuccess(
    res,
    { imported, errorCount: errors.length, errors },
    errors.length > 0
      ? `Imported ${imported} questions. ${errors.length} row(s) had errors.`
      : `Successfully imported ${imported} questions.`,
    errors.length > 0 && imported === 0 ? 422 : 200
  );
});
