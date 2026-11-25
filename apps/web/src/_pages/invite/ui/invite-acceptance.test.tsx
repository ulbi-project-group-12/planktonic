import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
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
    await waitFor(() => { expect(gets).toBe(2); });
    expect(screen.getByText('Открываем пространство…')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
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
