import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/api/client';
import type { ApiResponse, CalculatedScore } from '@/lib/types';

export function useMyScores() {
  return useQuery({
    queryKey: ['scores', 'my'],
    queryFn: () => apiFetch<ApiResponse<CalculatedScore[]>>('/api/v1/scores/my'),
  });
}

export function useEmployeeScore(employeeId: string, cycleId: string) {
  return useQuery({
    queryKey: ['scores', 'employee', employeeId, cycleId],
    queryFn: () => apiFetch<ApiResponse<CalculatedScore>>(`/api/v1/scores/employee/${employeeId}/cycle/${cycleId}`),
    enabled: !!employeeId && !!cycleId,
  });
}

export function useScoreComparison(employeeId: string, cycleId: string) {
  return useQuery({
    queryKey: ['scores', 'comparison', employeeId, cycleId],
    queryFn: () => apiFetch<ApiResponse<any>>(`/api/v1/scores/employee/${employeeId}/cycle/${cycleId}/comparison`),
    enabled: !!employeeId && !!cycleId,
  });
}
