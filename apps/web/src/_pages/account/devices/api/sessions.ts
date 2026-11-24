import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/shared/api';

/**
 * Mirrors the MSW mock until UL-157 ships the real session contract in `packages/contracts`;
 * then this type and the fetchers go away in favour of the generated client.
 */
export interface AuthSession {
  id: string;
  browser: string;
  os: string;
  /** ISO timestamp of the sign-in that created the session. */
  signedInAt: string;
  /** ISO timestamp of the last request the session made. */
  lastActiveAt: string;
  /**
   * The session this very browser is signed in through. It cannot be ended from this list:
   * revoking your own token mid-action only breaks the page — signing out does it properly.
   */
  isCurrent: boolean;
}

export function getAuthSessionsQueryKey() {
  return ['auth', 'sessions'] as const;
}

async function fetchAuthSessions(): Promise<AuthSession[]> {
  return apiFetch<AuthSession[]>('/api/auth/sessions');
}

export function useAuthSessions() {
  return useQuery({ queryKey: getAuthSessionsQueryKey(), queryFn: fetchAuthSessions });
}

function useInvalidateSessions() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: getAuthSessionsQueryKey() });
}

export function useTerminateSession() {
  const invalidate = useInvalidateSessions();
  return useMutation({
    mutationFn: (sessionId: string) =>
      apiFetch(`/api/auth/sessions/${encodeURIComponent(sessionId)}`, { method: 'DELETE' }),
    onSuccess: invalidate,
  });
}

export function useTerminateOtherSessions() {
  const invalidate = useInvalidateSessions();
  return useMutation({
    mutationFn: () => apiFetch('/api/auth/sessions', { method: 'DELETE' }),
    onSuccess: invalidate,
  });
}
