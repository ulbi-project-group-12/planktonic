'use client';

import { type LoginRequest, LoginResponseSchema } from '@app/contracts';
import { createStore } from 'zustand/vanilla';
import { authLogin } from './generated/api';
import { apiFetch, setAccessTokenProvider, setRefreshHandler } from './http-client';

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

export async function refreshAccessToken(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const { accessToken } = LoginResponseSchema.parse(
        await apiFetch('/api/auth/refresh', { method: 'POST' }),
      );
      sessionStore.setState({ accessToken });
      return true;
    } catch {
      return false;
    } finally {
      refreshPromise = undefined;
    }
  })();

  return refreshPromise;
}

export async function restoreSession(): Promise<void> {
  const { restoreStatus } = sessionStore.getState();
  if (restoreStatus !== 'idle') return;

  sessionStore.setState({ restoreStatus: 'pending' });
  const ok = await refreshAccessToken();
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
  sessionStore.setState({ accessToken, signedOut: false, restoreStatus: 'done' });
}

/** Forgets the access token. The caller drops cached API data and leaves the closed pages. */
export function signOut(): void {
  sessionStore.setState({ accessToken: undefined, signedOut: true, restoreStatus: 'done' });
}
