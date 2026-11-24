import { screen, waitFor } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { createQueryClient, getWorkspaceGetBySlugQueryKey } from '@/shared/api';
import { server } from '@/shared/api-mocks-node';
import { renderWithApi } from '@/shared/lib/testing';
import { WorkspaceAccess } from './workspace-access';

const slug = 'my-team';

vi.mock('next/navigation', () => ({
  usePathname: () => '/workspaces/my-team/settings',
}));

/** A client that already holds the answer of an earlier, successful access check. */
function withCachedWorkspace() {
  const queryClient = createQueryClient({ retry: false });
  queryClient.setQueryData(getWorkspaceGetBySlugQueryKey(slug), {
    id: '019a8f00-0000-7000-8000-000000000004',
    name: 'My team',
    slug,
  });
  return queryClient;
}

function renderWorkspace() {
  renderWithApi(<WorkspaceAccess slug={slug}>Workspace content</WorkspaceAccess>);
}

describe('WorkspaceAccess', () => {
  it('shows content once the API grants access', async () => {
    server.use(
      http.get('/api/workspaces/my-team', () =>
        HttpResponse.json({ id: '019a8f00-0000-7000-8000-000000000004', name: 'My team', slug }),
      ),
    );

    renderWorkspace();

    expect(screen.getByRole('status')).toBeVisible();
    expect(screen.queryByText('Workspace content')).not.toBeInTheDocument();
    expect(await screen.findByText('Workspace content')).toBeVisible();
  });

  it('shows the 404 page when the API denies access', async () => {
    server.use(http.get('/api/workspaces/my-team', () => new HttpResponse(null, { status: 404 })));

    renderWorkspace();

    expect(await screen.findByRole('heading', { name: '404' })).toBeVisible();
    expect(screen.queryByText('Workspace content')).not.toBeInTheDocument();
  });

  it('shows an error with a retry when the first load fails', async () => {
    server.use(http.get('/api/workspaces/my-team', () => new HttpResponse(null, { status: 500 })));

    renderWorkspace();

    expect(await screen.findByRole('alert')).toHaveTextContent('Не удалось загрузить пространство');
    expect(screen.getByRole('button', { name: 'Попробовать ещё раз' })).toBeVisible();
    expect(screen.queryByText('Workspace content')).not.toBeInTheDocument();
  });

  it('keeps an open workspace on screen when a background refetch fails', async () => {
    server.use(http.get('/api/workspaces/my-team', () => new HttpResponse(null, { status: 500 })));
    const key = getWorkspaceGetBySlugQueryKey(slug);

    const { queryClient } = renderWithApi(
      <WorkspaceAccess slug={slug}>Workspace content</WorkspaceAccess>,
      { queryClient: withCachedWorkspace() },
    );

    await waitFor(() => {
      expect(queryClient.getQueryState(key)?.status).toBe('error');
    });
    expect(screen.getByText('Workspace content')).toBeVisible();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('closes an open workspace when a refetch answers 404', async () => {
    server.use(http.get('/api/workspaces/my-team', () => new HttpResponse(null, { status: 404 })));

    renderWithApi(<WorkspaceAccess slug={slug}>Workspace content</WorkspaceAccess>, {
      queryClient: withCachedWorkspace(),
    });

    expect(await screen.findByRole('heading', { name: '404' })).toBeVisible();
    expect(screen.queryByText('Workspace content')).not.toBeInTheDocument();
  });

  it('stays closed when a 500 follows the 404', async () => {
    server.use(http.get('/api/workspaces/my-team', () => new HttpResponse(null, { status: 404 })));
    const { queryClient } = renderWithApi(
      <WorkspaceAccess slug={slug}>Workspace content</WorkspaceAccess>,
      { queryClient: withCachedWorkspace() },
    );
    expect(await screen.findByRole('heading', { name: '404' })).toBeVisible();

    server.use(http.get('/api/workspaces/my-team', () => new HttpResponse(null, { status: 500 })));
    await queryClient.refetchQueries({ queryKey: getWorkspaceGetBySlugQueryKey(slug) });

    expect(await screen.findByRole('alert')).toHaveTextContent('Не удалось загрузить пространство');
    expect(screen.queryByText('Workspace content')).not.toBeInTheDocument();
  });

  it('offers sign-in with the address to come back to when the session is missing', async () => {
    server.use(http.get('/api/workspaces/my-team', () => new HttpResponse(null, { status: 401 })));

    renderWorkspace();

    expect(await screen.findByRole('link', { name: /Войдите/ })).toHaveAttribute(
      'href',
      '/login?next=%2Fworkspaces%2Fmy-team%2Fsettings',
    );
    expect(screen.queryByText('Workspace content')).not.toBeInTheDocument();
  });
});
