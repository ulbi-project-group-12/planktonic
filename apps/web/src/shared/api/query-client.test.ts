import { expect, it } from 'vitest';
import { ApiError } from './http-client';
import { createQueryClient, shouldRetryQuery } from './query-client';

it('does not retry a client error', () => {
  expect(shouldRetryQuery(0, new ApiError(400, undefined))).toBe(false);
  expect(shouldRetryQuery(0, new ApiError(404, undefined))).toBe(false);
  expect(shouldRetryQuery(0, new ApiError(499, undefined))).toBe(false);
});

it('retries server and network errors twice', () => {
  for (const error of [new ApiError(500, undefined), new TypeError('Failed to fetch')]) {
    expect(shouldRetryQuery(0, error)).toBe(true);
    expect(shouldRetryQuery(1, error)).toBe(true);
    expect(shouldRetryQuery(2, error)).toBe(false);
  }
});

it('applies the retry policy to queries and never retries mutations', () => {
  const { queries, mutations } = createQueryClient().getDefaultOptions();

  expect(queries?.retry).toBe(shouldRetryQuery);
  expect(mutations?.retry).toBe(false);
});

it('switches query retries off for tests and stories', () => {
  expect(createQueryClient({ retry: false }).getDefaultOptions().queries?.retry).toBe(false);
});
