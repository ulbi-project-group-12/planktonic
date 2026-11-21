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

export interface ApiRequestOptions extends RequestInit {
  /** Optional access token supplied by the caller from application memory. */
  accessToken?: string;
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

export async function apiFetch<T>(
  url: string,
  { accessToken, ...options }: ApiRequestOptions = {},
): Promise<T> {
  if (!url.startsWith('/api/')) throw new TypeError('Expected a relative /api/ URL');

  const headers = normalizeHeaders(options.headers);
  if (accessToken && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }
  const response = await fetch(url, { ...options, headers });
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
