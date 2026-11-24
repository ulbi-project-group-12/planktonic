'use client';

import { type LoginRequest, LoginResponseSchema } from '@app/contracts';
import { createStore } from 'zustand/vanilla';
import { authLogin } from './generated/api';
import { setAccessTokenProvider } from './http-client';

interface SessionState {
  accessToken: string | undefined;
  /** The visitor left with the sign-out button, so the login screen needs no return address. */
  signedOut?: boolean;
}

export const sessionStore = createStore<SessionState>()(() => ({ accessToken: undefined }));

/** Points the shared http client at this store: the token source, the session end, the refresh. */
function wireHttpClient(): void {
  setAccessTokenProvider(
    () => sessionStore.getState().accessToken,
    // The api no longer accepts this token (expired, account deactivated): the session is over.
    // A late answer to a request sent with an older token must not end a newer session.
    (rejected) => {
      if (sessionStore.getState().accessToken === rejected) {
        sessionStore.setState({ accessToken: undefined });
      }
    },
    restoreSession,
  );
}

/**
 * Asks the refresh endpoint for a new access token and keeps it. `false` means the server has
 * no live session for this tab (signed out or expired refresh token, UL-141). The request and
 * response shapes live in the mock until UL-141 lands them in `contracts`.
 */
async function refreshAccessToken(): Promise<boolean> {
  try {
    // Plain fetch, not apiFetch: a refresh proves itself without a bearer token, and a 401
    // answered to it must not start another refresh.
    const response = await fetch('/api/auth/refresh', { method: 'POST' });
    if (!response.ok) return false;
    const { accessToken } = LoginResponseSchema.parse(await response.json());
    sessionStore.setState({ accessToken, signedOut: false });
    return true;
  } catch {
    return false;
  }
}

let restorePromise: Promise<boolean> | undefined;

/**
 * Restores the session once: the access token lives only in memory, so after a page reload (or
 * when a request finds the token expired) the refresh endpoint is asked for a new one. Every
 * caller shares the one in-flight request. Resolves `false` when there is nothing to restore.
 */
export function restoreSession(): Promise<boolean> {
  wireHttpClient();
  // An explicit sign-out is not undone: the gate never asks then, and neither do we.
  if (sessionStore.getState().signedOut) return Promise.resolve(false);
  restorePromise ??= refreshAccessToken().finally(() => {
    restorePromise = undefined;
  });
  return restorePromise;
}

export async function signIn(credentials: LoginRequest): Promise<void> {
  const { accessToken } = LoginResponseSchema.parse(await authLogin(credentials));
  wireHttpClient();
  sessionStore.setState({ accessToken, signedOut: false });
}

/** Forgets the access token. The caller drops cached API data and leaves the closed pages. */
export function signOut(): void {
  sessionStore.setState({ accessToken: undefined, signedOut: true });
}
