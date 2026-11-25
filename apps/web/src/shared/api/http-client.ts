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
export type SessionRefreshResult = 'refreshed' | 'rejected' | 'unavailable';

interface RefreshEntry {
  key: unknown;
  promise: Promise<SessionRefreshResult>;
}

let accessTokenProvider: (() => string | undefined) | undefined;
let rejectedTokenHandler: ((token: string) => void) | undefined;
let sessionRefresher: (() => Promise<SessionRefreshResult>) | undefined;
let sessionRefreshKey: (() => unknown) | undefined;
let refreshEntry: RefreshEntry | undefined;

/**
 * Registers the single source of the access token (kept in application memory by the auth
 * code). Every request asks it and sends `Authorization: Bearer <token>` when it returns one.
 * Pass `undefined` to remove it. `onRejected` hears about every `401` answered to a request that
 * carried the provider's token, whichever screen sent it, so the session can end in one place.
 * `refresh` gets a `401` answered to a provider's token first: when it resolves `refreshed`, the
 * request is repeated once with the new token and `onRejected` only fires if that one fails too.
 * `unavailable` leaves the token alone so a later request can try refresh again; `refreshKey`
 * separates the shared in-flight refresh of one session generation from the next one.
 */
export function setAccessTokenProvider(
  provider: (() => string | undefined) | undefined,
  onRejected?: (token: string) => void,
  refresh?: () => Promise<SessionRefreshResult>,
  refreshKey?: () => unknown,
): void {
  accessTokenProvider = provider;
  rejectedTokenHandler = provider ? onRejected : undefined;
  sessionRefresher = provider ? refresh : undefined;
  sessionRefreshKey = provider ? refreshKey : undefined;
}

/**
 * One shared refresh for every request waiting on it: a second call would rotate the refresh
 * token again while later requests still hold the old one, and the server treats a rotated
 * token's reuse as theft and revokes the session. `rejected` when no refresher is registered.
 */
function refreshSession(): Promise<SessionRefreshResult> {
  if (!sessionRefresher) return Promise.resolve('rejected');
  const key = sessionRefreshKey?.();
  const current = refreshEntry;
  if (current && current.key === key) return current.promise;
  const entry = { key } as RefreshEntry;
  entry.promise = sessionRefresher()
    .catch((): SessionRefreshResult => 'unavailable')
    .finally(() => {
      if (refreshEntry === entry) refreshEntry = undefined;
    });
  refreshEntry = entry;
  return entry.promise;
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

async function send(
  url: string,
  options: ApiRequestOptions,
): Promise<{ response: Response; sentToken: string | undefined }> {
  const headers = normalizeHeaders(options.headers);
  const accessToken = accessTokenProvider?.();
  const sentToken = accessToken && !headers.has('Authorization') ? accessToken : undefined;
  if (sentToken) headers.set('Authorization', `Bearer ${sentToken}`);
  return { response: await fetch(url, { ...options, headers }), sentToken };
}

export async function apiFetch<T>(url: string, options: ApiRequestOptions = {}): Promise<T> {
  // Not a TypeError: that is what fetch throws for a network failure, and those are retried.
  if (!url.startsWith('/api/')) throw new Error('Expected a relative /api/ URL');

  const requestRefreshKey = sessionRefreshKey?.();
  const refreshKeyChanged = () => sessionRefreshKey?.() !== requestRefreshKey;
  let { response, sentToken } = await send(url, options);
  let refreshResult: SessionRefreshResult | undefined;
  if (response.status === 401 && sentToken && !refreshKeyChanged()) {
    refreshResult = await refreshSession();
    if (refreshResult === 'refreshed' && !refreshKeyChanged()) {
      ({ response, sentToken } = await send(url, options));
    }
  }
  // Before the body is read: the status is enough, and reading the body can still fail.
  if (
    response.status === 401 &&
    sentToken &&
    refreshResult !== 'unavailable' &&
    !refreshKeyChanged()
  ) {
    rejectedTokenHandler?.(sentToken);
  }
  const text = await response.text();

  if (!response.ok) {
    let body: unknown = text || undefined;
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
