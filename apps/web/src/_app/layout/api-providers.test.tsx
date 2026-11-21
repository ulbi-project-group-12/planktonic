import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { usePathname } from 'next/navigation';
import { expect, it, vi } from 'vitest';
import { startDemoApiMocks } from '@/shared/api';
import { ApiProviders } from './api-providers';

vi.mock('next/navigation', () => ({ usePathname: vi.fn() }));
vi.mock('@/shared/api', () => ({ apiDemoMocksEnabled: true, startDemoApiMocks: vi.fn() }));

it('retries a failed demo startup and keeps the successful state across navigation', async () => {
  const pathname = vi.mocked(usePathname);
  const start = vi.mocked(startDemoApiMocks);
  pathname.mockReturnValue('/api-demo');
  start.mockRejectedValueOnce(new Error('Temporary registration failure')).mockResolvedValueOnce();
  const user = userEvent.setup();
  const app = render(<ApiProviders>Page content</ApiProviders>);

  expect(await screen.findByRole('alert')).toHaveTextContent('Could not start API mocks.');
  expect(screen.queryByText('Page content')).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Retry' }));

  expect(await screen.findByText('Page content')).toBeVisible();
  expect(start).toHaveBeenCalledTimes(2);

  pathname.mockReturnValue('/prototype');
  app.rerender(<ApiProviders>Page content</ApiProviders>);
  pathname.mockReturnValue('/api-demo');
  app.rerender(<ApiProviders>Page content</ApiProviders>);

  expect(screen.getByText('Page content')).toBeVisible();
  expect(start).toHaveBeenCalledTimes(2);
});
