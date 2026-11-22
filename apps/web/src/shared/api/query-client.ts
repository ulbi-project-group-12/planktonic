import { QueryClient } from '@tanstack/react-query';
import { ApiError } from './http-client';

/** Attempts after the first failure for errors worth retrying. */
const MAX_RETRIES = 2;

/**
 * Whether a failed query runs again. A 4xx answer is final (bad input, no access, not found):
 * repeating it only delays the error on screen. Network failures and 5xx get two more attempts.
 */
export function shouldRetryQuery(failureCount: number, error: unknown): boolean {
  if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false;
  return failureCount < MAX_RETRIES;
}

/**
 * The one way to create a QueryClient: the app, Storybook and tests share these defaults.
 * `retry: false` is for tests and stories, where an error state must show at once.
 */
export function createQueryClient({ retry = true }: { retry?: boolean } = {}): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: retry ? shouldRetryQuery : false },
      // A repeated POST can create a duplicate; a screen that wants a retry asks for it.
      mutations: { retry: false },
    },
  });
}
