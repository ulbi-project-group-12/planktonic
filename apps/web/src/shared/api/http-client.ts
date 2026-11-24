import { getSessionGeneration } from './session-generation';

export class ApiError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(status: number, body: unknown) {
    super(`API request failed with HTTP ${String(status)}`);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

export type ApiRequestOptions = RequestInit;

let accessTokenProvider: (() => string | undefined) | undefined;
let rejectedTokenHandler: ((token: string) => void) | undefined;
let refreshHandler: (() => Promise<boolean>) | undefined;

/**
 * Registers the single source of the access token (kept in application memory by the auth
 * code). Every request asks it and sends `Authorization: Bearer <token>` when it returns one.
 * Pass `undefined` to remove it. `onRejected` hears about unrecovered `401` responses to requests
 * that carried the provider's token in the current session, so the session can end in one place.
 */
export function setAccessTokenProvider(
  provider: (() => string | undefined) | undefined,
  onRejected?: (token: string) => void,
): void {
  accessTokenProvider = provider;
  rejectedTokenHandler = provider ? onRejected : undefined;
}

/**
 * Registers the callback used to restore an expired access token. The handler is invoked when
 * an eligible request returns `401` and no newer token is available. It returns `true` when a new token is
 * available and `false` when the session cannot be restored, in which case the rejected token
 * handler is called so the session ends. Pass `undefined` to remove it.
 */
export function setRefreshHandler(handler: (() => Promise<boolean>) | undefined): void {
  refreshHandler = handler;
}

// Orval supplies the documented error body as a type argument. HTTP bodies are
// unvalidated, and fetch can also reject with an arbitrary abort reason.
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- Orval always passes a type argument.
export type ErrorType<ResponseBody> = unknown;

function normalizeHeaders(input: HeadersInit | undefined): Headers {
  if (!input || input instanceof Headers || Array.isArray(input)) return new Headers(input);

  const headers = new Headers();
  for (const [name, value] of Object.entries(input)) {
    // Orval spreads caller headers after its JSON default in a plain object.
    if (name.toLowerCase() === 'content-type') headers.set(name, value);
    else headers.append(name, value);
  }
  return headers;
}

async function unauthorizedError(response: Response): Promise<ApiError> {
  const text = await response.text().catch(() => undefined);
  return new ApiError(response.status, text);
}

export async function apiFetch<T>(url: string, options: ApiRequestOptions = {}): Promise<T> {
  // Not a TypeError: that is what fetch throws for a network failure, and those are retried.
  if (!url.startsWith('/api/')) throw new Error('Expected a relative /api/ URL');

  async function send(isRetry: boolean): Promise<T> {
    const headers = normalizeHeaders(options.headers);
    const accessToken = accessTokenProvider?.();
    const sentToken = accessToken && !headers.has('Authorization') ? accessToken : undefined;
    const sentGeneration = getSessionGeneration();
    if (sentToken) headers.set('Authorization', `Bearer ${sentToken}`);
    const response = await fetch(url, { ...options, headers, credentials: 'same-origin' });

    if (response.status === 401 && sentToken) {
      if (getSessionGeneration() !== sentGeneration) {
        throw await unauthorizedError(response);
      }

      if (!isRetry && url !== '/api/auth/refresh') {
        const currentToken = accessTokenProvider?.();
        if (currentToken && currentToken !== sentToken) return send(true);

        if (refreshHandler) {
          const refreshed = await refreshHandler();
          if (getSessionGeneration() !== sentGeneration) {
            throw await unauthorizedError(response);
          }
          if (refreshed) return send(true);
          rejectedTokenHandler?.(sentToken);
          throw await unauthorizedError(response);
        }
      }

      // Before the body is read: the status is enough, and reading the body can still fail.
      rejectedTokenHandler?.(sentToken);
    }
    const text = await response.text();

    if (!response.ok) {
      let body: unknown = text;
      if (text) {
        try {
          body = JSON.parse(text) as unknown;
        } catch {
          // Preserve non-JSON errors from proxies and other upstream services.
        }
      }
      throw new ApiError(response.status, body);
    }

    return (text ? JSON.parse(text) : undefined) as T;
  }

  return send(false);
}
