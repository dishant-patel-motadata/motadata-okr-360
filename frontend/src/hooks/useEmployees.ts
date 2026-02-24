import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/api/client';
import type { ApiResponse, Employee, SyncLog } from '@/lib/types';

export function useEmployees(params: { page?: number; limit?: number; department?: string; group_name?: string; is_active?: boolean; search?: string } = {}) {
  const sp = new URLSearchParams();
  if (params.page) sp.set('page', String(params.page));
  if (params.limit) sp.set('limit', String(params.limit));
  if (params.department) sp.set('department', params.department);
  if (params.group_name) sp.set('group_name', params.group_name);
  if (params.is_active !== undefined) sp.set('is_active', String(params.is_active));
  if (params.search) sp.set('search', params.search);

  return useQuery({
    queryKey: ['employees', params],
    queryFn: () => apiFetch<ApiResponse<Employee[]>>(`/api/v1/employees?${sp}`),
  });
}

export function useEmployee(id: string) {
  return useQuery({
    queryKey: ['employees', id],
    queryFn: () => apiFetch<ApiResponse<Employee>>(`/api/v1/employees/${id}`),
    enabled: !!id,
  });
}

export function useUpdateEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Employee> }) =>
      apiFetch(`/api/v1/employees/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['employees'] }),
  });
}

export function useSyncEmployees() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiFetch('/api/v1/employees/sync', { method: 'POST' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['employees'] }),
  });
}

export function useSyncLogs(limit = 10) {
  return useQuery({
    queryKey: ['sync-logs', limit],
    queryFn: () => apiFetch<ApiResponse<SyncLog[]>>(`/api/v1/employees/sync/logs?limit=${limit}`),
  });
}
