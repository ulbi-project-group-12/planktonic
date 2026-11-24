import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
    renderWithApi(
      <AppLayout>
        <main>content</main>
      </AppLayout>,
    );

    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('complementary', { name: 'App sidebar' })).toBeInTheDocument();
    expect(screen.getByRole('main')).toHaveTextContent('content');
  });

  it('renders the workspaces list without a workspace sidebar', () => {
    pathname = '/workspaces';
    renderWithApi(
      <AppLayout>
        <main>content</main>
      </AppLayout>,
    );

    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.queryByRole('complementary', { name: 'App sidebar' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Открыть меню' })).not.toBeInTheDocument();
    expect(screen.getByRole('main')).toHaveTextContent('content');
  });

  it.each([
    '/workspaces/create',
    '/workspaces/my-team/settings',
    '/workspaces/my-team/projects/create',
  ])('renders head-only shell on %s', (path) => {
    pathname = path;
    renderWithApi(
      <AppLayout>
        <main>content</main>
      </AppLayout>,
    );

    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.queryByRole('complementary', { name: 'App sidebar' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Открыть меню' })).not.toBeInTheDocument();
    expect(screen.getByRole('main')).toHaveTextContent('content');
  });

  it('renders the page inside a single main landmark', () => {
    pathname = '/workspaces/my-team';
    renderWithApi(
      <AppLayout>
        <main>content</main>
      </AppLayout>,
    );

    expect(screen.getAllByRole('main')).toHaveLength(1);
  });

  it('does not reopen the mobile drawer after a visit to a page without the sidebar', async () => {
    const user = userEvent.setup();
    // A new element on every call: React skips a re-render of the very same element.
    const page = () => (
      <AppLayout>
        <main>content</main>
      </AppLayout>
    );
    pathname = '/workspaces/my-team';
    const { rerender } = renderWithApi(page());

    await user.click(screen.getByRole('button', { name: 'Открыть меню' }));
    expect(screen.getByRole('dialog', { name: 'Навигация' })).toBeInTheDocument();

    pathname = '/workspaces';
    rerender(page());
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    pathname = '/workspaces/my-team';
    rerender(page());
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
