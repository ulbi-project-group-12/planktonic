import { QueryObserver } from '@tanstack/react-query';
import { afterEach, expect, it, vi } from 'vitest';
import { ApiError, apiFetch } from './http-client';
import { createQueryClient, shouldRetryQuery } from './query-client';

afterEach(() => vi.restoreAllMocks());

it('does not retry a client error', () => {
  for (const status of [400, 404, 408, 429, 499]) {
    expect(shouldRetryQuery(0, new ApiError(status, undefined))).toBe(false);
  }
});

it('retries server and network errors twice', () => {
  for (const error of [new ApiError(500, undefined), new TypeError('Failed to fetch')]) {
    expect(shouldRetryQuery(0, error)).toBe(true);
    expect(shouldRetryQuery(1, error)).toBe(true);
    expect(shouldRetryQuery(2, error)).toBe(false);
  }
});

it('does not retry failures that cannot go away', async () => {
  expect(shouldRetryQuery(0, new DOMException('Aborted', 'AbortError'))).toBe(false);
  expect(shouldRetryQuery(0, new SyntaxError('Unexpected token'))).toBe(false);
  // A URL the client refuses is a bug in the caller, not a network failure.
  const refused: unknown = await apiFetch('https://example.com/api/health').catch(
    (error: unknown) => error,
  );
  expect(refused).toBeInstanceOf(Error);
  expect(shouldRetryQuery(0, refused)).toBe(false);
});

/** Runs one query on a real client and counts how often TanStack Query calls its function. */
async function attempts(error: unknown, options?: { retry: false }): Promise<number> {
  const queryFn = vi.fn(() => Promise.reject(error as Error));
  const client = createQueryClient(options);
  const observer = new QueryObserver(client, { queryKey: ['probe'], queryFn, retryDelay: 0 });
  const unsubscribe = observer.subscribe(() => undefined);
  await vi.waitFor(() => {
    expect(observer.getCurrentResult().isError).toBe(true);
  });
  unsubscribe();
  client.clear();
  return queryFn.mock.calls.length;
}

it('makes three attempts for a 503 and one for a 404 on a real client', async () => {
  await expect(attempts(new ApiError(503, undefined))).resolves.toBe(3);
  await expect(attempts(new ApiError(404, undefined))).resolves.toBe(1);
});

it('makes one attempt when retries are switched off for tests and stories', async () => {
  await expect(attempts(new ApiError(503, undefined), { retry: false })).resolves.toBe(1);
  expect(createQueryClient({ retry: false }).getDefaultOptions().queries?.retry).toBe(false);
});

it('never retries mutations', () => {
  expect(createQueryClient().getDefaultOptions().mutations?.retry).toBe(false);
});
