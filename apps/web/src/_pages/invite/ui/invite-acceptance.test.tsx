import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getWorkspaceListQueryKey } from '@/shared/api';
import { server } from '@/shared/api-mocks-node';
import { renderWithApi } from '@/shared/lib/testing';
import { InviteAcceptance } from './invite-acceptance';

const push = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));

describe('InviteAcceptance', () => {
  beforeEach(() => {
    push.mockClear();
  });

  it('shows a skeleton while the invite loads', () => {
    server.use(http.get('/api/invites/:token', () => new Promise(() => {})));
    renderWithApi(<InviteAcceptance token="tok" />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('shows the workspace name and role, then joins on «Присоединиться»', async () => {
    const user = userEvent.setup();
    server.use(
      http.get('/api/invites/tok42', () =>
        HttpResponse.json({
          workspaceName: 'Demo HQ',
          workspaceSlug: 'demo-hq',
          role: 'MEMBER',
        }),
      ),
      http.post('/api/invites/tok42/accept', () => HttpResponse.json({ workspaceSlug: 'demo-hq' })),
    );
    renderWithApi(<InviteAcceptance token="tok42" />);

    expect(await screen.findByText('Demo HQ')).toBeInTheDocument();
    expect(screen.getByText('Ваша роль: Участник')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Присоединиться' }));
    await waitFor(() => {
      expect(push).toHaveBeenCalledWith('/workspaces/demo-hq');
    });
  });

  it('does not flash the dead-link notice while navigating after accept', async () => {
    const user = userEvent.setup();
    let gets = 0;
    server.use(
      http.get('/api/invites/tok9', () => {
        gets += 1;
        // First load: valid invite. The refetch after accept: consumed → 404.
        return gets === 1
          ? HttpResponse.json({
              workspaceName: 'Demo HQ',
              workspaceSlug: 'demo-hq',
              role: 'MEMBER',
            })
          : HttpResponse.json({ statusCode: 404 }, { status: 404 });
      }),
      http.post('/api/invites/tok9/accept', () => HttpResponse.json({ workspaceSlug: 'demo-hq' })),
    );
    renderWithApi(<InviteAcceptance token="tok9" />);
    await screen.findByText('Demo HQ');

    await user.click(screen.getByRole('button', { name: 'Присоединиться' }));
    await waitFor(() => {
      expect(push).toHaveBeenCalledWith('/workspaces/demo-hq');
    });
    // The post-accept refetch of the consumed invite settled — and still no dead-link notice.
    await waitFor(() => {
      expect(gets).toBe(2);
    });
    expect(screen.getByText('Открываем пространство…')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('marks the cached workspace list stale after the join', async () => {
    const user = userEvent.setup();
    server.use(
      http.get('/api/invites/tok7', () =>
        HttpResponse.json({ workspaceName: 'Demo HQ', workspaceSlug: 'demo-hq', role: 'MEMBER' }),
      ),
      http.post('/api/invites/tok7/accept', () => HttpResponse.json({ workspaceSlug: 'demo-hq' })),
    );
    const { queryClient } = renderWithApi(<InviteAcceptance token="tok7" />);
    // The list was loaded before the join and does not have the new workspace.
    queryClient.setQueryData(getWorkspaceListQueryKey(), []);
    await screen.findByText('Demo HQ');

    await user.click(screen.getByRole('button', { name: 'Присоединиться' }));

    await waitFor(() => {
      expect(push).toHaveBeenCalledWith('/workspaces/demo-hq');
    });
    expect(queryClient.getQueryState(getWorkspaceListQueryKey())?.isInvalidated).toBe(true);
  });

  it('shows the dead-link notice when the link was used between the load and the click', async () => {
    const user = userEvent.setup();
    server.use(
      http.get('/api/invites/tok410', () =>
        HttpResponse.json({ workspaceName: 'Demo HQ', workspaceSlug: 'demo-hq', role: 'MEMBER' }),
      ),
      http.post('/api/invites/tok410/accept', () =>
        HttpResponse.json({ statusCode: 410, message: 'Gone' }, { status: 410 }),
      ),
    );
    renderWithApi(<InviteAcceptance token="tok410" />);
    await screen.findByText('Demo HQ');

    await user.click(screen.getByRole('button', { name: 'Присоединиться' }));

    expect(
      await screen.findByText(/Ссылка недействительна или уже использована/),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Присоединиться' })).not.toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it('keeps the join button on a transient accept error', async () => {
    const user = userEvent.setup();
    server.use(
      http.get('/api/invites/tok503', () =>
        HttpResponse.json({ workspaceName: 'Demo HQ', workspaceSlug: 'demo-hq', role: 'MEMBER' }),
      ),
      http.post('/api/invites/tok503/accept', () =>
        HttpResponse.json({ statusCode: 503 }, { status: 503 }),
      ),
    );
    renderWithApi(<InviteAcceptance token="tok503" />);
    await screen.findByText('Demo HQ');

    await user.click(screen.getByRole('button', { name: 'Присоединиться' }));

    expect(await screen.findByText('Не удалось принять приглашение')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Присоединиться' })).toBeEnabled();
  });

  it('offers a retry on a transient load error instead of a dead-link notice', async () => {
    const user = userEvent.setup();
    let gets = 0;
    server.use(
      http.get('/api/invites/tok500', () => {
        gets += 1;
        return gets === 1
          ? HttpResponse.json({ statusCode: 503 }, { status: 503 })
          : HttpResponse.json({
              workspaceName: 'Demo HQ',
              workspaceSlug: 'demo-hq',
              role: 'MEMBER',
            });
      }),
    );
    renderWithApi(<InviteAcceptance token="tok500" />);

    expect(await screen.findByText('Не удалось загрузить приглашение')).toBeInTheDocument();
    expect(screen.queryByText(/Ссылка недействительна/)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Попробовать ещё раз' }));

    expect(await screen.findByText('Demo HQ')).toBeInTheDocument();
    expect(gets).toBe(2);
  });

  it('shows a dead-link notice for an unknown or used token', async () => {
    server.use(
      http.get('/api/invites/dead', () =>
        HttpResponse.json(
          { statusCode: 404, message: 'Invite not found', error: 'Not Found' },
          { status: 404 },
        ),
      ),
    );
    renderWithApi(<InviteAcceptance token="dead" />);
    expect(
      await screen.findByText(/Ссылка недействительна или уже использована/),
    ).toBeInTheDocument();
  });
});
