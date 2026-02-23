import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/api/client';
import type { ApiResponse, SelfFeedback } from '@/lib/types';

export function useSelfFeedback(cycleId: string) {
  return useQuery({
    queryKey: ['self-feedback', cycleId],
    queryFn: () => apiFetch<ApiResponse<SelfFeedback>>(`/api/v1/self-feedback/${cycleId}`),
    enabled: !!cycleId,
  });
}

export function useSaveSelfFeedbackDraft() {
  return useMutation({
    mutationFn: ({ cycleId, data }: { cycleId: string; data: { competency_ratings: Array<{ competency_id: string; rating: number }> } }) =>
      apiFetch(`/api/v1/self-feedback/${cycleId}`, { method: 'POST', body: JSON.stringify(data) }),
  });
}

export function useSubmitSelfFeedback() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ cycleId, data }: { cycleId: string; data: { competency_ratings: Array<{ competency_id: string; rating: number }> } }) =>
      apiFetch(`/api/v1/self-feedback/${cycleId}/submit`, { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['self-feedback'] }),
  });
}
