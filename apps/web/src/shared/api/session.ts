'use client';

import { type LoginRequest, LoginResponseSchema } from '@app/contracts';
import { createStore } from 'zustand/vanilla';
import { authLogin } from './generated/api';
import { setAccessTokenProvider, type SessionRefreshResult } from './http-client';

interface SessionState {
  accessToken: string | undefined;
  /** The visitor left with the sign-out button, so the login screen needs no return address. */
  signedOut?: boolean;
}

export const sessionStore = createStore<SessionState>()(() => ({ accessToken: undefined }));

let sessionGeneration = 0;

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
    () => sessionGeneration,
  );
}

/**
 * Asks the refresh endpoint for a new access token and keeps it. `rejected` means the server
 * confirmed that this tab has no live session; `unavailable` is a temporary failure worth retrying.
 * The request and response shapes live in the mock until UL-141 lands them in `contracts`.
 */
async function refreshAccessToken(generation: number): Promise<SessionRefreshResult> {
  try {
    // Plain fetch, not apiFetch: a refresh proves itself without a bearer token, and a 401
    // answered to it must not start another refresh.
    const response = await fetch('/api/auth/refresh', { method: 'POST' });
    if (generation !== sessionGeneration) return 'rejected';
    if (!response.ok) {
      return response.status === 401 || response.status === 403 ? 'rejected' : 'unavailable';
    }
    const { accessToken } = LoginResponseSchema.parse(await response.json());
    if (generation !== sessionGeneration) return 'rejected';
    sessionStore.setState({ accessToken, signedOut: false });
    return 'refreshed';
  } catch {
    return generation === sessionGeneration ? 'unavailable' : 'rejected';
  }
}

interface RestoreRequest {
  generation: number;
  promise: Promise<SessionRefreshResult>;
}

let restoreRequest: RestoreRequest | undefined;

/**
 * Restores the session once: the access token lives only in memory, so after a page reload (or
 * when a request finds the token expired) the refresh endpoint is asked for a new one. Every
 * caller shares the one in-flight request of the same session generation.
 */
export function restoreSession(): Promise<SessionRefreshResult> {
  wireHttpClient();
  // An explicit sign-out is not undone: the gate never asks then, and neither do we.
  if (sessionStore.getState().signedOut) return Promise.resolve('rejected');
  const generation = sessionGeneration;
  if (restoreRequest?.generation === generation) return restoreRequest.promise;
  const request = { generation } as RestoreRequest;
  request.promise = refreshAccessToken(generation).finally(() => {
    if (restoreRequest === request) restoreRequest = undefined;
  });
  restoreRequest = request;
  return request.promise;
}

export async function signIn(credentials: LoginRequest): Promise<void> {
  const { accessToken } = LoginResponseSchema.parse(await authLogin(credentials));
  wireHttpClient();
  sessionGeneration += 1;
  sessionStore.setState({ accessToken, signedOut: false });
}

/** Forgets the access token. The caller drops cached API data and leaves the closed pages. */
export function signOut(): void {
  sessionGeneration += 1;
  sessionStore.setState({ accessToken: undefined, signedOut: true });
}
