import { useMutation } from '@tanstack/react-query';
import { apiFetch } from '@/shared/api';
import type { WorkspaceRole } from '../model/roles';

/**
 * Response mirrors the MSW mock until UL-148 ships the real invite contract;
 * then this type goes away in favour of the generated client.
 */
export interface CreatedInvite {
  token: string;
  role: WorkspaceRole;
}

export function createInvite(workspaceSlug: string, role: WorkspaceRole): Promise<CreatedInvite> {
  return apiFetch<CreatedInvite>(`/api/workspaces/${encodeURIComponent(workspaceSlug)}/invites`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ role }),
  });
}

export function useCreateInvite() {
  return useMutation({
    mutationFn: ({ workspaceSlug, role }: { workspaceSlug: string; role: WorkspaceRole }) =>
      createInvite(workspaceSlug, role),
  });
}
