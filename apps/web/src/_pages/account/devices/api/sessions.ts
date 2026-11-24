import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AuthSession } from '@app/contracts';
import { apiFetch, hasApiStatus } from '@/shared/api';

/**
 * The session shape is the draft contract in `@app/contracts`. The fetchers below are written by
 * hand only until UL-157 adds the endpoints to the API: then OpenAPI describes them and the
 * generated hooks replace this file.
 */
export type { AuthSession };

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

async function terminateSession(sessionId: string): Promise<void> {
  try {
    await apiFetch(`/api/auth/sessions/${encodeURIComponent(sessionId)}`, { method: 'DELETE' });
  } catch (error) {
    // Already ended (from another device, or expired): that is what the user asked for.
    if (!hasApiStatus(error, 404)) throw error;
  }
}

// Both mutations reload the list on failure too: a request whose answer was lost may still have
// ended the session, and the list must show what the server has, not what the client assumes.
export function useTerminateSession() {
  const invalidate = useInvalidateSessions();
  return useMutation({ mutationFn: terminateSession, onSettled: invalidate });
}

export function useTerminateOtherSessions() {
  const invalidate = useInvalidateSessions();
  return useMutation({
    mutationFn: () => apiFetch('/api/auth/sessions', { method: 'DELETE' }),
    onSettled: invalidate,
  });
}
