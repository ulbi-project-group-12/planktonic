import { screen } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import { describe, expect, it } from 'vitest';
import { server } from '@/shared/api-mocks-node';
import { renderWithApi } from '@/shared/lib/testing';
import { WorkspaceAccess } from './workspace-access';

const slug = 'my-team';

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

  it('offers sign-in when the session is missing', async () => {
    server.use(http.get('/api/workspaces/my-team', () => new HttpResponse(null, { status: 401 })));

    renderWorkspace();

    expect(await screen.findByRole('link', { name: /Войдите/ })).toHaveAttribute('href', '/login');
    expect(screen.queryByText('Workspace content')).not.toBeInTheDocument();
  });
});
