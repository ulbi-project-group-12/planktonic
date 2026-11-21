'use client';

import { API_DEMO_MOCK_HEADER, apiDemoMocksEnabled, useHealthLive } from '@/shared/api';

export function ApiDemoPage() {
  const health = useHealthLive({
    query: { retry: false },
    request: apiDemoMocksEnabled ? { headers: { [API_DEMO_MOCK_HEADER]: 'true' } } : undefined,
  });

  return (
    <main className="mx-auto max-w-lg p-6">
      <h1 className="text-xl font-semibold">API health</h1>
      {health.isPending && <p role="status">Loading API status…</p>}
      {health.isError && <p role="alert">Could not load API status.</p>}
      {health.isSuccess && (
        <dl>
          <dt>Status</dt>
          <dd>{health.data.status}</dd>
          <dt>Instance</dt>
          <dd>{health.data.instanceId}</dd>
        </dl>
      )}
    </main>
  );
}
