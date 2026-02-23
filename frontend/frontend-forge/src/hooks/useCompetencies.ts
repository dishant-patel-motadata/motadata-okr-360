import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/api/client';
import type { ApiResponse, Competency } from '@/lib/types';

export function useCompetencies(params: { applicable_to?: string; is_active?: boolean } = {}) {
  const sp = new URLSearchParams();
  if (params.applicable_to) sp.set('applicable_to', params.applicable_to);
  if (params.is_active !== undefined) sp.set('is_active', String(params.is_active));
  return useQuery({
    queryKey: ['competencies', params],
    queryFn: () => apiFetch<ApiResponse<Competency[]>>(`/api/v1/competencies?${sp}`),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateCompetency() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<Competency, 'is_active'>) =>
      apiFetch('/api/v1/competencies', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['competencies'] }),
  });
}

export function useUpdateCompetency() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Competency> }) =>
      apiFetch(`/api/v1/competencies/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['competencies'] }),
  });
}
