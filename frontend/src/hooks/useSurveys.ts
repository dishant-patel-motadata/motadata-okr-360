import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/api/client';
import type { ApiResponse, PendingReviewer, SurveyForm } from '@/lib/types';

export function usePendingSurveys() {
  return useQuery({
    queryKey: ['reviewers', 'pending'],
    queryFn: () => apiFetch<ApiResponse<PendingReviewer[]>>('/api/v1/reviewers/pending'),
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
  return useMutation({
    mutationFn: ({ reviewerId, data }: { reviewerId: string; data: { responses: Array<{ question_id: string; rating: number }>; comment: string } }) =>
      apiFetch(`/api/v1/surveys/form/${reviewerId}/save`, { method: 'POST', body: JSON.stringify(data) }),
  });
}

export function useSubmitSurvey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ reviewerId, data }: { reviewerId: string; data: { responses: Array<{ question_id: string; rating: number }>; comment: string } }) =>
      apiFetch(`/api/v1/surveys/form/${reviewerId}/submit`, { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reviewers', 'pending'] }),
  });
}

export function useTokenReviewer(token: string) {
  return useQuery({
    queryKey: ['reviewers', 'token', token],
    queryFn: () => apiFetch<ApiResponse<PendingReviewer>>(`/api/v1/reviewers/by-token/${token}`),
    enabled: !!token,
  });
}
