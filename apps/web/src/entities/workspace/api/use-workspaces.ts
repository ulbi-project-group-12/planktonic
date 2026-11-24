import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/shared/api';
import type { WorkspaceSummary } from '../model/types';

export function getWorkspacesQueryKey(q?: string) {
  return ['workspaces', 'list', { q: q === '' ? undefined : q }] as const;
}

async function fetchWorkspaces(q?: string): Promise<WorkspaceSummary[]> {
  const search = q ? `?${new URLSearchParams({ q }).toString()}` : '';
  return apiFetch<WorkspaceSummary[]>(`/api/workspaces${search}`);
}

export function useWorkspaces(q?: string) {
  return useQuery({
    queryKey: getWorkspacesQueryKey(q),
    queryFn: () => fetchWorkspaces(q),
  });
}
