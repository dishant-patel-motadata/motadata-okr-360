/**
 * modules/assignments/assignments.controller.js
 */

import {
  listAssignmentsService,
  getAssignmentService,
  createAssignmentService,
  deleteAssignmentService,
  getAssignmentStatusService,
  suggestReviewersService,
  bulkCsvAssignService,
  addReviewerService,
  removeReviewerService,
} from './assignments.service.js';
import { asyncWrapper }  from '../../utils/asyncWrapper.js';
import { sendSuccess }   from '../../utils/response.js';
import multer from 'multer';

// Multer instance for CSV upload (memory storage, 2 MB limit)
export const csvUpload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 2_097_152 },
});

// ── Assignments ───────────────────────────────────────────────

/** GET /assignments?cycle_id=&status=&page=&limit= */
export const listAssignments = asyncWrapper(async (req, res) => {
  const result = await listAssignmentsService(req.query);
  return sendSuccess(res, result, 'Assignments retrieved.');
});

/** GET /assignments/status?cycle_id= */
export const getAssignmentStatus = asyncWrapper(async (req, res) => {
  const { cycle_id } = req.query;
  if (!cycle_id) {
    return res.status(422).json({ success: false, message: 'cycle_id query param is required.', error: 'VALIDATION_ERROR' });
  }
  const result = await getAssignmentStatusService(cycle_id);
  return sendSuccess(res, result, 'Assignment status overview retrieved.');
});

/** GET /assignments/:id */
export const getAssignment = asyncWrapper(async (req, res) => {
  const result = await getAssignmentService(req.params.id);
  return sendSuccess(res, result, 'Assignment retrieved.');
});

/** POST /assignments */
export const createAssignment = asyncWrapper(async (req, res) => {
  const result = await createAssignmentService(req.body, req.user);
  return sendSuccess(res, result, 'Assignment created.', 201);
});

/** DELETE /assignments/:id */
export const deleteAssignment = asyncWrapper(async (req, res) => {
  await deleteAssignmentService(req.params.id, req.user);
  return sendSuccess(res, null, 'Assignment deleted (rolled back) successfully.');
});

/** GET /assignments/:id/suggestions */
export const suggestReviewers = asyncWrapper(async (req, res) => {
  const assignment = await getAssignmentService(req.params.id);
  const result = await suggestReviewersService(assignment.employee_id, assignment.cycle_id);
  return sendSuccess(res, result, 'Reviewer suggestions generated.');
});

/** POST /assignments/bulk-csv */
export const bulkCsvAssign = asyncWrapper(async (req, res) => {
  if (!req.file) {
    return res.status(422).json({
      success: false,
      message: 'No CSV file uploaded. Use multipart/form-data with field name "file".',
      error: 'MISSING_FILE',
    });
  }
  const { imported, errors } = await bulkCsvAssignService(req.file.buffer, req.user);
  return sendSuccess(
    res,
    { imported, errorCount: errors.length, errors },
    errors.length > 0
      ? `Imported ${imported} reviewer assignments. ${errors.length} row(s) had errors.`
      : `Successfully imported ${imported} reviewer assignments.`,
    errors.length > 0 && imported === 0 ? 422 : 200
  );
});

// ── Reviewers (convenience methods on assignment context) ─────

/** POST /assignments/reviewers */
export const addReviewer = asyncWrapper(async (req, res) => {
  const result = await addReviewerService(req.body, req.user);
  return sendSuccess(res, result, 'Reviewer added successfully.', 201);
});

/** DELETE /assignments/reviewers/:reviewerId */
export const removeReviewer = asyncWrapper(async (req, res) => {
  await removeReviewerService(req.params.reviewerId, req.user);
  return sendSuccess(res, null, 'Reviewer removed successfully.');
});
