import { QueryClientProvider } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { createQueryClient } from '../../api';

/**
 * Test-only: renders `ui` inside a fresh QueryClient with retries off, so every test starts with
 * an empty cache and an error state shows at once. Requests go to the MSW server from
 * vitest.setup.ts. Returns the client for cache assertions.
 */
export function renderWithApi(ui: ReactElement): RenderResult & { queryClient: QueryClient } {
  const queryClient = createQueryClient({ retry: false });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return Object.assign(render(ui, { wrapper }), { queryClient });
}
