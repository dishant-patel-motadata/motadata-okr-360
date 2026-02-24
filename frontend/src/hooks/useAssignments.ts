import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/api/client';
import type { ApiResponse, Assignment, AssignmentReviewer } from '@/lib/types';

export function useAssignments(params: { cycle_id?: string; page?: number; limit?: number; status?: string; department?: string; employee_id?: string } = {}) {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v) sp.set(k, String(v)); });
  return useQuery({
    queryKey: ['assignments', params],
    queryFn: () => apiFetch<ApiResponse<{ rows: Assignment[]; total: number }>>(`/api/v1/assignments?${sp}`),
    enabled: !!params.cycle_id,
  });
}

export function useAssignmentStatus(cycleId: string) {
  return useQuery({
    queryKey: ['assignments', 'status', cycleId],
    queryFn: () => apiFetch<ApiResponse<{ total: number; pending: number; in_progress: number; completed: number }>>(`/api/v1/assignments/status?cycle_id=${cycleId}`),
    enabled: !!cycleId,
  });
}

export function useAssignment(id: string) {
  return useQuery({
    queryKey: ['assignments', id],
    queryFn: () => apiFetch<ApiResponse<Assignment & { reviewers: AssignmentReviewer[] }>>(`/api/v1/assignments/${id}`),
    enabled: !!id,
  });
}

export function useCreateAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { employee_id: string; cycle_id: string }) =>
      apiFetch('/api/v1/assignments', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['assignments'] }),
  });
}

export function useDeleteAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch(`/api/v1/assignments/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['assignments'] }),
  });
}

export function useAddReviewer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { assignment_id: string; reviewer_employee_id: string; reviewer_type: string }) =>
      apiFetch('/api/v1/assignments/reviewers', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['assignments'] }),
  });
}

export function useRemoveReviewer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (reviewerId: string) => apiFetch(`/api/v1/assignments/reviewers/${reviewerId}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['assignments'] }),
  });
}

export function useSuggestedReviewers(assignmentId: string) {
  return useQuery({
    queryKey: ['assignments', assignmentId, 'suggestions'],
    queryFn: () => apiFetch<ApiResponse<AssignmentReviewer[]>>(`/api/v1/assignments/${assignmentId}/suggestions`),
    enabled: false,
  });
}
