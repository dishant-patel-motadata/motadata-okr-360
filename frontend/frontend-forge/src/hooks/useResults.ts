import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/api/client';
import type { ApiResponse } from '@/lib/types';

export function useTeamResults(cycleId: string) {
  return useQuery({
    queryKey: ['results', 'team', cycleId],
    queryFn: () => apiFetch<ApiResponse<any>>(`/api/v1/results/team/cycle/${cycleId}`),
    enabled: !!cycleId,
  });
}

export function useDepartmentResults(cycleId: string, params: { department?: string; group_name?: string } = {}) {
  const sp = new URLSearchParams();
  if (params.department) sp.set('department', params.department);
  if (params.group_name) sp.set('group_name', params.group_name);
  return useQuery({
    queryKey: ['results', 'department', cycleId, params],
    queryFn: () => apiFetch<ApiResponse<any>>(`/api/v1/results/department/cycle/${cycleId}?${sp}`),
    enabled: !!cycleId,
  });
}

export function useOrgResults(cycleId: string, params: { department?: string; group_name?: string } = {}) {
  const sp = new URLSearchParams();
  if (params.department) sp.set('department', params.department);
  if (params.group_name) sp.set('group_name', params.group_name);
  return useQuery({
    queryKey: ['results', 'org', cycleId, params],
    queryFn: () => apiFetch<ApiResponse<any>>(`/api/v1/results/org/cycle/${cycleId}?${sp}`),
    enabled: !!cycleId,
  });
}

export function useEmployeeResults(employeeId: string, cycleId: string) {
  return useQuery({
    queryKey: ['results', 'employee', employeeId, cycleId],
    queryFn: () => apiFetch<ApiResponse<any>>(`/api/v1/results/employee/${employeeId}/cycle/${cycleId}`),
    enabled: !!employeeId && !!cycleId,
  });
}

export function useEmployeeComments(employeeId: string, cycleId: string) {
  return useQuery({
    queryKey: ['results', 'employee', employeeId, cycleId, 'comments'],
    queryFn: () => apiFetch<ApiResponse<any>>(`/api/v1/results/employee/${employeeId}/cycle/${cycleId}/comments`),
    enabled: !!employeeId && !!cycleId,
  });
}
