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
export type RefreshResult = 'refreshed' | 'rejected' | 'unavailable';

const REFRESH_URL = '/api/auth/refresh';
const LOGIN_URL = '/api/auth/login';

let accessTokenProvider: (() => string | undefined) | undefined;
let rejectedTokenHandler: ((token: string) => void) | undefined;
let refreshHandler: (() => Promise<RefreshResult>) | undefined;

/**
 * Registers the single source of the access token (kept in application memory by the auth
 * code). Every request asks it and sends `Authorization: Bearer <token>` when it returns one.
 * Pass `undefined` to remove it. `onRejected` hears when refresh confirms that the current
 * session's credentials are no longer accepted.
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
 * an eligible request returns `401` and no newer token is available. `rejected` means the
 * session is over and ends it; `unavailable` is a temporary failure and keeps it. Pass
 * `undefined` to remove the callback.
 */
export function setRefreshHandler(handler: (() => Promise<RefreshResult>) | undefined): void {
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

function parseErrorBody(text: string | undefined): unknown {
  if (!text) return text;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    // Preserve non-JSON errors from proxies and other upstream services.
    return text;
  }
}

async function unauthorizedError(response: Response): Promise<ApiError> {
  const text = await response.text().catch(() => undefined);
  return new ApiError(response.status, parseErrorBody(text));
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

    if (response.status === 401 && sentToken && url !== REFRESH_URL && url !== LOGIN_URL) {
      if (getSessionGeneration() !== sentGeneration) {
        throw await unauthorizedError(response);
      }

      if (!isRetry) {
        const currentToken = accessTokenProvider?.();
        if (currentToken && currentToken !== sentToken) return send(true);

        if (refreshHandler) {
          const result = await refreshHandler();
          if (getSessionGeneration() !== sentGeneration) {
            throw await unauthorizedError(response);
          }
          if (result === 'refreshed') return send(true);
          if (result === 'rejected') rejectedTokenHandler?.(sentToken);
          throw await unauthorizedError(response);
        }
      }
    }
    const text = await response.text().catch((error: unknown) => {
      // For refresh the status alone decides what happens next (401, 404 and 405 end the session,
      // the rest is temporary), even if the connection drops mid-body.
      if (url === REFRESH_URL && !response.ok) return '';
      throw error;
    });

    if (!response.ok) throw new ApiError(response.status, parseErrorBody(text));

    return (text ? JSON.parse(text) : undefined) as T;
  }

  return send(false);
}
