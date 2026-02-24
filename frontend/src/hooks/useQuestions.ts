import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/api/client';
import type { ApiResponse, Question } from '@/lib/types';

export function useQuestions(params: { set_type?: string; competency_id?: string; is_active?: boolean } = {}) {
  const sp = new URLSearchParams();
  if (params.set_type) sp.set('set_type', params.set_type);
  if (params.competency_id) sp.set('competency_id', params.competency_id);
  if (params.is_active !== undefined) sp.set('is_active', String(params.is_active));
  return useQuery({
    queryKey: ['questions', params],
    queryFn: () => apiFetch<ApiResponse<Question[]>>(`/api/v1/questions?${sp}`),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Question>) =>
      apiFetch('/api/v1/questions', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['questions'] }),
  });
}

export function useUpdateQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Question> }) =>
      apiFetch(`/api/v1/questions/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['questions'] }),
  });
}
