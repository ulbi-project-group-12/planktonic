import { screen } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import { expect, it } from 'vitest';
import { server } from '@/shared/api-mocks-node';
import { renderWithApi } from '@/shared/lib/testing';
import { ApiDemoPage } from './api-demo-page';

it('shows the mocked health response through the generated hook', async () => {
  renderWithApi(<ApiDemoPage />);

  expect(await screen.findByText('msw-demo')).toBeVisible();
  expect(screen.getByText('ok')).toBeVisible();
});

it('shows the error state when a test overrides the mock', async () => {
  server.use(http.get('*/api/health', () => new HttpResponse(null, { status: 503 })));
  renderWithApi(<ApiDemoPage />);

  expect(await screen.findByRole('alert')).toHaveTextContent('Could not load API status.');
});
