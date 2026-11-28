'use client';

import {
  type LoginRequest,
  LoginResponseSchema,
  LogoutResponseSchema,
  RefreshResponseSchema,
} from '@app/contracts';
import { PRODUCT_SLUG } from '@app/config/product';
import { createStore } from 'zustand/vanilla';
import { authLogin } from './generated/api';
import {
  ApiError,
  apiFetch,
  setAccessTokenProvider,
  setRefreshHandler,
  type RefreshResult,
} from './http-client';
import { bumpSessionGeneration, getSessionGeneration } from './session-generation';

interface SessionState {
  accessToken: string | undefined;
  restoreStatus: 'idle' | 'pending' | 'done' | 'error';
  /** The visitor left with the sign-out button, so the login screen needs no return address. */
  signedOut?: boolean;
}

export const sessionStore = createStore<SessionState>()(() => ({
  accessToken: undefined,
  restoreStatus: 'idle',
}));

let refreshPromise: Promise<RefreshResult> | undefined;
let refreshPromiseGeneration: number | undefined;
const LOGOUT_TIMEOUT_MS = 5_000;
// Refresh answers that mean "there is no session to continue". 401: the refresh credentials are
// missing, expired or revoked. 404 and 405: this api has no refresh endpoint at all, so nothing
// can be restored and waiting or retrying would only keep the visitor away from the login screen.
// Anything else (network failure, 5xx, 503) is temporary.
const NO_SESSION_STATUSES: ReadonlySet<number> = new Set([401, 404, 405]);
export const SIGNED_OUT_FLAG_KEY = `__${PRODUCT_SLUG}_signed_out`;

function setSignedOutFlag(): void {
  try {
    localStorage.setItem(SIGNED_OUT_FLAG_KEY, '1');
  } catch {
    // Ignore storage failures (e.g. private mode).
  }
}

function hasSignedOutFlag(): boolean {
  try {
    return localStorage.getItem(SIGNED_OUT_FLAG_KEY) === '1';
  } catch {
    // Ignore storage failures.
    return false;
  }
}

export function clearSignedOutFlag(): void {
  try {
    localStorage.removeItem(SIGNED_OUT_FLAG_KEY);
  } catch {
    // Ignore storage failures.
  }
}

export async function refreshAccessToken(): Promise<RefreshResult> {
  const { accessToken, restoreStatus } = sessionStore.getState();
  if (restoreStatus === 'done' && accessToken === undefined) return 'unavailable';

  const generation = getSessionGeneration();
  if (refreshPromise && refreshPromiseGeneration === generation) return refreshPromise;

  refreshPromiseGeneration = generation;
  refreshPromise = (async () => {
    try {
      const { accessToken } = RefreshResponseSchema.parse(
        await apiFetch('/api/auth/refresh', { method: 'POST' }),
      );
      // signIn/signOut happened while the refresh was in flight: do not touch the new session.
      if (getSessionGeneration() !== generation) return 'unavailable';
      sessionStore.setState({ accessToken });
      return 'refreshed';
    } catch (error) {
      return error instanceof ApiError && NO_SESSION_STATUSES.has(error.status)
        ? 'rejected'
        : 'unavailable';
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
  if (restoreStatus !== 'idle' && restoreStatus !== 'error') return;

  // The user explicitly signed out in this browser, but the server revocation may have failed.
  // Do not silently restore the session from the refresh cookie until the user signs in again.
  // `signedOut` stays as it is: only the sign-out button drops the return address, and a later
  // visit to a deep link still comes back to it after the login.
  if (hasSignedOutFlag()) {
    sessionStore.setState({ restoreStatus: 'done' });
    return;
  }

  const generation = getSessionGeneration();
  sessionStore.setState({ restoreStatus: 'pending' });
  const result = await refreshAccessToken();
  // A newer session already has its own token; do not clear it because restore failed.
  if (getSessionGeneration() !== generation) return;
  sessionStore.setState({
    restoreStatus: result === 'unavailable' ? 'error' : 'done',
    ...(result === 'rejected' ? { accessToken: undefined } : {}),
  });
}

export function ensureSessionHandlers(): void {
  setAccessTokenProvider(
    () => sessionStore.getState().accessToken,
    // Refresh rejected the session credentials.
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
  clearSignedOutFlag();
  sessionStore.setState({ accessToken, signedOut: false, restoreStatus: 'done' });
}

/**
 * Revokes the server refresh credentials and forgets the access token. The caller drops cached
 * API data and leaves the closed pages. Local state is cleared even if the revocation request
 * fails, so the user is not trapped on a broken network.
 */
export async function signOut(): Promise<void> {
  bumpSessionGeneration();
  const generation = getSessionGeneration();
  // Mark the browser as explicitly signed out even before the server request, so a failed
  // revocation cannot be recovered by simply reloading the page.
  setSignedOutFlag();
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
    if (getSessionGeneration() === generation) {
      // Discard refreshes that started while logout was in flight.
      bumpSessionGeneration();
      sessionStore.setState({ accessToken: undefined, signedOut: true, restoreStatus: 'done' });
    }
  }
}
