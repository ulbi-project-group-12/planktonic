'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { usePathname } from 'next/navigation';
import { type ReactNode, useEffect, useState } from 'react';
import { apiDemoMocksEnabled, startDemoApiMocks } from '@/shared/api';
import { Button } from '@/shared/ui';

export function ApiProviders({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const needsDemoMocks = apiDemoMocksEnabled && pathname === '/api-demo';
  const [queryClient] = useState(() => new QueryClient());
  const [mockState, setMockState] = useState<'starting' | 'ready' | 'failed'>('starting');

  useEffect(() => {
    if (!needsDemoMocks || mockState !== 'starting') return;

    let active = true;
    void startDemoApiMocks().then(
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
  }, [needsDemoMocks, mockState]);

  return (
    <QueryClientProvider client={queryClient}>
      {needsDemoMocks && mockState === 'starting' ? (
        <p role="status">Starting API mocks…</p>
      ) : needsDemoMocks && mockState === 'failed' ? (
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
