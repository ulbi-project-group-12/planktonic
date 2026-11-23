import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderWithApi } from '@/shared/lib/testing';
import { AppLayout } from './app-layout';

let pathname = '/workspaces';
const push = vi.fn();

vi.mock('next/navigation', () => ({
  usePathname: () => pathname,
  useRouter: () => ({ push }),
  useParams: () => ({}),
}));

describe('AppLayout', () => {
  it('renders the full shell with header, sidebar and main content', () => {
    pathname = '/workspaces/my-team';
    renderWithApi(<AppLayout>content</AppLayout>);

    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('complementary', { name: 'App sidebar' })).toBeInTheDocument();
    expect(screen.getByRole('main')).toHaveTextContent('content');
  });

  it('renders the workspaces list without a workspace sidebar', () => {
    pathname = '/workspaces';
    renderWithApi(<AppLayout>content</AppLayout>);

    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.queryByRole('complementary', { name: 'App sidebar' })).not.toBeInTheDocument();
    expect(screen.getByRole('main')).toHaveTextContent('content');
  });

  it.each([
    '/workspaces/create',
    '/workspaces/my-team/settings',
    '/workspaces/my-team/projects/create',
  ])('renders head-only shell on %s', (path) => {
    pathname = path;
    renderWithApi(<AppLayout>content</AppLayout>);

    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.queryByRole('complementary', { name: 'App sidebar' })).not.toBeInTheDocument();
    expect(screen.getByRole('main')).toHaveTextContent('content');
  });
});
