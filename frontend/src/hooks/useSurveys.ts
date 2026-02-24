import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/api/client';
import type { ApiResponse, PendingReviewer, SurveyForm } from '@/lib/types';

export function usePendingSurveys() {
  return useQuery({
    queryKey: ['reviewers', 'pending'],
    queryFn: () => apiFetch<ApiResponse<any[]>>('/api/v1/reviewers/pending'),
    select: (data) => ({
      ...data,
      data: data.data.map((s) => ({
        ...s,
        end_date: s.deadline ?? s.end_date,
        employee_designation: s.designation ?? s.employee_designation,
        employee_department: s.department ?? s.employee_department,
      })),
    }),
  });
}

export function useSurveyForm(reviewerId: string) {
  return useQuery({
    queryKey: ['survey', 'form', reviewerId],
    queryFn: () => apiFetch<ApiResponse<SurveyForm>>(`/api/v1/surveys/form/${reviewerId}`),
    enabled: !!reviewerId,
  });
}

export function useSaveSurveyDraft() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ reviewerId, data }: { reviewerId: string; data: { responses: Array<{ question_id: string; rating: number }>; comment: string } }) =>
      apiFetch(`/api/v1/surveys/form/${reviewerId}/save`, { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['survey', 'form', variables.reviewerId] });
      qc.invalidateQueries({ queryKey: ['reviewers', 'pending'] });
      qc.invalidateQueries({ queryKey: ['assignments'] });
    },
  });
}

export function useSubmitSurvey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ reviewerId, data }: { reviewerId: string; data: { responses: Array<{ question_id: string; rating: number }>; comment: string } }) =>
      apiFetch(`/api/v1/surveys/form/${reviewerId}/submit`, { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['reviewers', 'pending'] });
      qc.invalidateQueries({ queryKey: ['survey', 'form', variables.reviewerId] });
      qc.invalidateQueries({ queryKey: ['assignments'] });
    },
  });
}

export function useTokenReviewer(token: string) {
  return useQuery({
    queryKey: ['reviewers', 'token', token],
    queryFn: () => apiFetch<ApiResponse<PendingReviewer>>(`/api/v1/reviewers/by-token/${token}`),
    enabled: !!token,
  });
}
