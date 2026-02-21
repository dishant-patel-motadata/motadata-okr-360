/**
 * modules/competencies/competencies.service.js
 */

import {
  listCompetencies,
  getCompetencyById,
  createCompetency,
  updateCompetency,
} from './competencies.repository.js';
import { writeAuditLog } from '../../utils/auditLogger.js';

export async function listCompetenciesService(query) {
  return listCompetencies(query);
}

export async function getCompetencyService(competencyId) {
  const comp = await getCompetencyById(competencyId);
  if (!comp) {
    const err = new Error(`Competency "${competencyId}" not found.`);
    err.status = 404;
    throw err;
  }
  return comp;
}

export async function createCompetencyService(body, requestingUser) {
  // Guard duplicate ID
  const existing = await getCompetencyById(body.competency_id);
  if (existing) {
    const err = new Error(`Competency "${body.competency_id}" already exists.`);
    err.status = 409;
    throw err;
  }

  const comp = await createCompetency(body);

  await writeAuditLog({
    userId: requestingUser.employeeId,
    actionType: 'CREATE',
    entityType: 'competencies',
    entityId: comp.competency_id,
    newValue: comp,
  });

  return comp;
}

export async function updateCompetencyService(competencyId, updates, requestingUser) {
  const existing = await getCompetencyService(competencyId);
  const updated = await updateCompetency(competencyId, updates);

  await writeAuditLog({
    userId: requestingUser.employeeId,
    actionType: 'UPDATE',
    entityType: 'competencies',
    entityId: competencyId,
    oldValue: existing,
    newValue: updated,
  });

  return updated;
}
