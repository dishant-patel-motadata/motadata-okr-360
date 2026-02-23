import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/api/client';
import type { ApiResponse, AdminDashboard, ReviewerConfig, AuditLog } from '@/lib/types';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export function useAdminDashboard(cycleId: string) {
  return useQuery({
    queryKey: ['admin', 'dashboard', cycleId],
    queryFn: () => apiFetch<ApiResponse<AdminDashboard>>(`/api/v1/admin/dashboard?cycle_id=${cycleId}`),
    enabled: !!cycleId,
  });
}

export function useReviewerConfig() {
  return useQuery({
    queryKey: ['admin', 'reviewer-config'],
    queryFn: () => apiFetch<ApiResponse<ReviewerConfig>>('/api/v1/admin/reviewer-config'),
  });
}

export function useUpdateReviewerConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ReviewerConfig) =>
      apiFetch('/api/v1/admin/reviewer-config', { method: 'PATCH', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'reviewer-config'] }),
  });
}

export function useAuditLogs(params: { page?: number; limit?: number; action_type?: string; entity_type?: string; from?: string; to?: string } = {}) {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v) sp.set(k, String(v)); });
  return useQuery({
    queryKey: ['admin', 'audit-logs', params],
    queryFn: () => apiFetch<ApiResponse<AuditLog[]>>(`/api/v1/admin/audit-logs?${sp}`),
  });
}
