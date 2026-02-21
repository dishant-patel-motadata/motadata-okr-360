/**
 * modules/competencies/competencies.controller.js
 */

import { asyncWrapper } from '../../utils/asyncWrapper.js';
import { sendSuccess } from '../../utils/response.js';
import {
  listCompetenciesService,
  getCompetencyService,
  createCompetencyService,
  updateCompetencyService,
} from './competencies.service.js';

export const listCompetencies = asyncWrapper(async (req, res) => {
  const comps = await listCompetenciesService(req.query);
  return sendSuccess(res, comps, 'Competencies retrieved successfully.');
});

export const getCompetency = asyncWrapper(async (req, res) => {
  const comp = await getCompetencyService(req.params.id);
  return sendSuccess(res, comp, 'Competency retrieved successfully.');
});

export const createCompetency = asyncWrapper(async (req, res) => {
  const comp = await createCompetencyService(req.body, req.user);
  return sendSuccess(res, comp, 'Competency created successfully.', 201);
});

export const updateCompetency = asyncWrapper(async (req, res) => {
  const comp = await updateCompetencyService(req.params.id, req.body, req.user);
  return sendSuccess(res, comp, 'Competency updated successfully.');
});
