import { QueryClient } from '@tanstack/react-query';
import { ApiError } from './http-client';

/** Attempts after the first failure for errors worth retrying. */
const MAX_RETRIES = 2;

/**
 * Whether a failed query runs again (`failureCount` is 0 after the first failure). Only failures
 * that can go away by themselves get two more attempts: a 5xx answer, and the `TypeError` fetch
 * rejects with when the network fails. Everything else is final, because repeating it only
 * delays the error on screen: every 4xx (408 and 429 included: the screen offers the retry),
 * an aborted request, a response that is not JSON.
 */
export function shouldRetryQuery(failureCount: number, error: unknown): boolean {
  const transient = error instanceof ApiError ? error.status >= 500 : error instanceof TypeError;
  return transient && failureCount < MAX_RETRIES;
}

/**
 * The one way to create a QueryClient: the app, Storybook and tests share these defaults (ESLint
 * forbids `new QueryClient` elsewhere). The policy also applies to `fetchQuery` and
 * `prefetchQuery`. `retry: false` is for tests and stories, where an error state must show at once.
 */
export function createQueryClient({ retry = true }: { retry?: boolean } = {}): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: retry ? shouldRetryQuery : false,
        // Fresh data does not refetch when a new observer mounts. Without this, two components
        // subscribing to the same query (e.g. SessionGate and AppHeader for /api/auth/me) fire
        // two identical requests back-to-back.
        staleTime: 30 * 1000,
      },
      // A repeated POST can create a duplicate; a screen that wants a retry asks for it.
      mutations: { retry: false },
    },
  });
}
