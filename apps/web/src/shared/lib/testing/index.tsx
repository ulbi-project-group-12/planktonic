import { QueryClientProvider } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import type { RenderOptions, RenderResult } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { createQueryClient } from '../../api';

export interface RenderWithApiOptions extends Omit<RenderOptions, 'wrapper'> {
  /** A client prepared by the test, for example with `setQueryData`. Default: a fresh one. */
  queryClient?: QueryClient;
}

/**
 * Test-only (ESLint forbids importing it elsewhere): renders `ui` inside a QueryClient with
 * retries off, so every test starts with an empty cache and an error state shows at once.
 * Requests go to the MSW server from vitest.setup.ts. Returns the client for cache assertions.
 */
export function renderWithApi(
  ui: ReactElement,
  { queryClient = createQueryClient({ retry: false }), ...options }: RenderWithApiOptions = {},
): RenderResult & { queryClient: QueryClient } {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return Object.assign(render(ui, { ...options, wrapper }), { queryClient });
}
