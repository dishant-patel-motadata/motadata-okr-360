/**
 * modules/cycles/cycles.controller.js
 *
 * Thin controllers — call service, return response.
 * No business logic here.
 */

import { asyncWrapper } from '../../utils/asyncWrapper.js';
import { sendSuccess, sendPaginated } from '../../utils/response.js';
import {
  listCyclesService,
  getCycleService,
  createCycleService,
  updateCycleService,
  deleteCycleService,
  activateCycleService,
  publishCycleService,
} from './cycles.service.js';

// ── GET /api/v1/cycles ────────────────────────────────────
export const listCycles = asyncWrapper(async (req, res) => {
  const { cycles, meta } = await listCyclesService(req.query);
  return sendPaginated(res, cycles, meta, 'Review cycles retrieved successfully.');
});

// ── GET /api/v1/cycles/:id ────────────────────────────────
export const getCycle = asyncWrapper(async (req, res) => {
  const cycle = await getCycleService(req.params.id);
  return sendSuccess(res, cycle, 'Review cycle retrieved successfully.');
});

// ── POST /api/v1/cycles ───────────────────────────────────
export const createCycle = asyncWrapper(async (req, res) => {
  const cycle = await createCycleService(req.body, req.user);
  return sendSuccess(res, cycle, 'Review cycle created successfully.', 201);
});

// ── PATCH /api/v1/cycles/:id ──────────────────────────────
export const updateCycle = asyncWrapper(async (req, res) => {
  const cycle = await updateCycleService(req.params.id, req.body, req.user);
  return sendSuccess(res, cycle, 'Review cycle updated successfully.');
});

// ── DELETE /api/v1/cycles/:id ─────────────────────────────
export const deleteCycle = asyncWrapper(async (req, res) => {
  await deleteCycleService(req.params.id, req.user);
  return sendSuccess(res, null, 'Review cycle deleted successfully.');
});

// ── POST /api/v1/cycles/:id/activate ─────────────────────
export const activateCycle = asyncWrapper(async (req, res) => {
  const cycle = await activateCycleService(req.params.id, req.user);
  return sendSuccess(res, cycle, 'Review cycle activated successfully.');
});

// ── POST /api/v1/cycles/:id/publish ──────────────────────
export const publishCycle = asyncWrapper(async (req, res) => {
  const cycle = await publishCycleService(req.params.id, req.user);
  return sendSuccess(res, cycle, 'Review cycle published successfully. Results are now visible.');
});
