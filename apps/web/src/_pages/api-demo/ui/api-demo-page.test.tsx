import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import { expect, it } from 'vitest';
import { server } from '@/shared/api-mocks-node';
import { ApiDemoPage } from './api-demo-page';

function renderPage() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <ApiDemoPage />
    </QueryClientProvider>,
  );
}

it('shows the mocked health response through the generated hook', async () => {
  renderPage();

  expect(await screen.findByText('msw-demo')).toBeVisible();
  expect(screen.getByText('ok')).toBeVisible();
});

it('shows the error state when a test overrides the mock', async () => {
  server.use(http.get('*/api/health', () => new HttpResponse(null, { status: 503 })));
  renderPage();

  expect(await screen.findByRole('alert')).toHaveTextContent('Could not load API status.');
});
