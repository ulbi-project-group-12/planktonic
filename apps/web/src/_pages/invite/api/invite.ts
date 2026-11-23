import { useMutation, useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/shared/api';
import type { WorkspaceRole } from '@/widgets/invite-member';

/**
 * Response mirrors the MSW mock until UL-148 ships the real invite contract;
 * then this type goes away in favour of the generated client.
 */
export interface InviteDetails {
  workspaceName: string;
  workspaceSlug: string;
  role: WorkspaceRole;
}

export interface AcceptedInvite {
  workspaceSlug: string;
}

export function getInvite(token: string): Promise<InviteDetails> {
  return apiFetch<InviteDetails>(`/api/invites/${encodeURIComponent(token)}`);
}

export function acceptInvite(token: string): Promise<AcceptedInvite> {
  return apiFetch<AcceptedInvite>(`/api/invites/${encodeURIComponent(token)}/accept`, {
    method: 'POST',
  });
}

/**
 * Viewing the link does not consume it — only accept does (ADR-0002 §2).
 * No retry: a 404/410 invite stays dead.
 */
export function useInvite(token: string) {
  return useQuery({
    queryKey: ['invite', token],
    queryFn: () => getInvite(token),
    retry: false,
  });
}

export function useAcceptInvite(token: string) {
  return useMutation({ mutationFn: () => acceptInvite(token) });
}
