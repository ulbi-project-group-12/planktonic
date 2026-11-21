import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { ApiDemoPage } from './api-demo-page';

it('shows the mocked health response through the generated hook', async () => {
  const client = new QueryClient();
  render(
    <QueryClientProvider client={client}>
      <ApiDemoPage />
    </QueryClientProvider>,
  );

  expect(await screen.findByText('msw-demo')).toBeVisible();
  expect(screen.getByText('ok')).toBeVisible();
});
