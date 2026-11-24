import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
import { startApiMocks } from '@/shared/api-mocks';
import { ApiProviders } from './api-providers';

vi.mock('@/shared/api-mocks', () => ({ startApiMocks: vi.fn() }));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.mocked(startApiMocks).mockReset();
});

it('renders the page without starting mocks unless they are switched on in development', () => {
  vi.stubEnv('NODE_ENV', 'production');
  vi.stubEnv('NEXT_PUBLIC_API_MOCKING', 'true');
  const first = render(<ApiProviders>Page content</ApiProviders>);
  expect(screen.getByText('Page content')).toBeVisible();
  first.unmount();

  vi.stubEnv('NODE_ENV', 'development');
  vi.stubEnv('NEXT_PUBLIC_API_MOCKING', '');
  render(<ApiProviders>Page content</ApiProviders>);
  expect(screen.getByText('Page content')).toBeVisible();
  expect(startApiMocks).not.toHaveBeenCalled();
});

it('waits for the mocks on every page, retries a failed startup and starts them once', async () => {
  vi.stubEnv('NODE_ENV', 'development');
  vi.stubEnv('NEXT_PUBLIC_API_MOCKING', 'true');
  const start = vi.mocked(startApiMocks);
  start.mockRejectedValueOnce(new Error('Temporary registration failure')).mockResolvedValueOnce();
  const user = userEvent.setup();
  const app = render(<ApiProviders>Page content</ApiProviders>);

  expect(screen.queryByText('Page content')).not.toBeInTheDocument();
  expect(await screen.findByRole('alert')).toHaveTextContent('Could not start API mocks.');
  await user.click(screen.getByRole('button', { name: 'Retry' }));

  expect(await screen.findByText('Page content')).toBeVisible();
  expect(start).toHaveBeenCalledTimes(2);

  app.rerender(<ApiProviders>Other page</ApiProviders>);
  expect(screen.getByText('Other page')).toBeVisible();
  expect(start).toHaveBeenCalledTimes(2);
});
