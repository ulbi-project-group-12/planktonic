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
 * Pass `undefined` to remove it. `onRejected` hears about every `401` answered to a request that
 * carried the provider's token, whichever screen sent it, so the session can end in one place.
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
 * an api request that carried a token returns `401`. It must return `true` when a new token is
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

export async function apiFetch<T>(url: string, options: ApiRequestOptions = {}): Promise<T> {
  // Not a TypeError: that is what fetch throws for a network failure, and those are retried.
  if (!url.startsWith('/api/')) throw new Error('Expected a relative /api/ URL');

  async function send(isRetry: boolean): Promise<T> {
    const headers = normalizeHeaders(options.headers);
    const accessToken = accessTokenProvider?.();
    const sentToken = accessToken && !headers.has('Authorization') ? accessToken : undefined;
    if (sentToken) headers.set('Authorization', `Bearer ${sentToken}`);
    const response = await fetch(url, { ...options, headers, credentials: 'same-origin' });

    if (
      response.status === 401 &&
      sentToken &&
      !isRetry &&
      url !== '/api/auth/refresh' &&
      refreshHandler
    ) {
      // The session has changed while this request was in flight. Do not refresh or clear the
      // current session; just fail this stale request.
      if (accessTokenProvider?.() !== sentToken) {
        const text = await response.text().catch(() => undefined);
        throw new ApiError(response.status, text);
      }
      const refreshed = await refreshHandler();
      if (refreshed) {
        return send(true);
      }
      rejectedTokenHandler?.(sentToken);
      const text = await response.text().catch(() => undefined);
      throw new ApiError(response.status, text);
    }

    // Before the body is read: the status is enough, and reading the body can still fail.
    if (response.status === 401 && sentToken) rejectedTokenHandler?.(sentToken);
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
