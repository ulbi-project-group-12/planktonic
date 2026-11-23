'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode, useEffect, useState } from 'react';
import { createQueryClient } from '@/shared/api';
import { Button } from '@/shared/ui';

export function ApiProviders({ children }: { children: ReactNode }) {
  // Opt-in and development only: `pnpm dev` with NEXT_PUBLIC_API_MOCKING=true serves every
  // REST request from the MSW mock set, so screens work without the api.
  const mocking =
    process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_API_MOCKING === 'true';
  const [queryClient] = useState(() => createQueryClient());
  const [mockState, setMockState] = useState<'starting' | 'ready' | 'failed'>('starting');

  useEffect(() => {
    if (!mocking || mockState !== 'starting') return;

    let active = true;
    // Loaded on demand: MSW and faker never reach a page that does not mock.
    void import('@/shared/api-mocks')
      .then(({ startApiMocks }) => startApiMocks())
      .then(
        () => {
          if (active) setMockState('ready');
        },
        () => {
          if (active) setMockState('failed');
        },
      );
    return () => {
      active = false;
    };
  }, [mocking, mockState]);

  return (
    <QueryClientProvider client={queryClient}>
      {mocking && mockState === 'starting' ? (
        <p role="status">Starting API mocks…</p>
      ) : mocking && mockState === 'failed' ? (
        <div>
          <p role="alert">Could not start API mocks.</p>
          <Button
            type="button"
            onClick={() => {
              setMockState('starting');
            }}
          >
            Retry
          </Button>
        </div>
      ) : (
        children
      )}
    </QueryClientProvider>
  );
}
