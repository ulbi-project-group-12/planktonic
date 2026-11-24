'use client';

import { type LoginRequest, LoginResponseSchema, LogoutResponseSchema } from '@app/contracts';
import { createStore } from 'zustand/vanilla';
import { authLogin } from './generated/api';
import { apiFetch, setAccessTokenProvider, setRefreshHandler } from './http-client';
import { bumpSessionGeneration, getSessionGeneration } from './session-generation';

interface SessionState {
  accessToken: string | undefined;
  restoreStatus: 'idle' | 'pending' | 'done';
  /** The visitor left with the sign-out button, so the login screen needs no return address. */
  signedOut?: boolean;
}

export const sessionStore = createStore<SessionState>()(() => ({
  accessToken: undefined,
  restoreStatus: 'idle',
}));

let refreshPromise: Promise<boolean> | undefined;
let refreshPromiseGeneration: number | undefined;
const LOGOUT_TIMEOUT_MS = 5_000;

export async function refreshAccessToken(): Promise<boolean> {
  const { accessToken, restoreStatus } = sessionStore.getState();
  if (restoreStatus === 'done' && accessToken === undefined) return false;

  const generation = getSessionGeneration();
  if (refreshPromise && refreshPromiseGeneration === generation) return refreshPromise;

  refreshPromiseGeneration = generation;
  refreshPromise = (async () => {
    try {
      const { accessToken } = LoginResponseSchema.parse(
        await apiFetch('/api/auth/refresh', { method: 'POST' }),
      );
      // signIn/signOut happened while the refresh was in flight: do not touch the new session.
      if (getSessionGeneration() !== generation) return false;
      sessionStore.setState({ accessToken });
      return true;
    } catch {
      return false;
    } finally {
      // Only the refresh that is currently registered clears the shared slot; a newer
      // generation's refresh must stay visible to its own callers.
      if (refreshPromiseGeneration === generation) {
        refreshPromise = undefined;
        refreshPromiseGeneration = undefined;
      }
    }
  })();

  return refreshPromise;
}

export async function restoreSession(): Promise<void> {
  const { restoreStatus } = sessionStore.getState();
  if (restoreStatus !== 'idle') return;

  const generation = getSessionGeneration();
  sessionStore.setState({ restoreStatus: 'pending' });
  const ok = await refreshAccessToken();
  // A newer session already has its own token; do not clear it because restore failed.
  if (getSessionGeneration() !== generation) return;
  sessionStore.setState({ restoreStatus: 'done', ...(ok ? {} : { accessToken: undefined }) });
}

export function ensureSessionHandlers(): void {
  setAccessTokenProvider(
    () => sessionStore.getState().accessToken,
    // The api no longer accepts this token (expired, account deactivated): the session is over.
    // A late answer to a request sent with an older token must not end a newer session.
    (rejected) => {
      if (sessionStore.getState().accessToken === rejected) {
        sessionStore.setState({ accessToken: undefined });
      }
    },
  );
  setRefreshHandler(refreshAccessToken);
}

export async function signIn(credentials: LoginRequest): Promise<void> {
  const { accessToken } = LoginResponseSchema.parse(await authLogin(credentials));
  ensureSessionHandlers();
  bumpSessionGeneration();
  sessionStore.setState({ accessToken, signedOut: false, restoreStatus: 'done' });
}

/**
 * Revokes the server refresh credentials and forgets the access token. The caller drops cached
 * API data and leaves the closed pages. Local state is cleared even if the revocation request
 * fails, so the user is not trapped on a broken network.
 */
export async function signOut(): Promise<void> {
  bumpSessionGeneration();
  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, LOGOUT_TIMEOUT_MS);
  try {
    // Logout uses the refresh cookie. A 401 here must not trigger a token refresh.
    const response = await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'same-origin',
      signal: controller.signal,
    });
    if (response.ok) LogoutResponseSchema.parse(await response.json());
  } catch {
    // Best-effort: the server cookie may already be expired or the network may be down.
  } finally {
    clearTimeout(timeout);
    // Discard refreshes that started while logout was in flight.
    bumpSessionGeneration();
    sessionStore.setState({ accessToken: undefined, signedOut: true, restoreStatus: 'done' });
  }
}
