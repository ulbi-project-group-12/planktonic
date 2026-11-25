import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { server } from '@/shared/api-mocks-node';
import { renderWithApi } from '@/shared/lib/testing';
import { invitableRoles } from '../model/roles';
import { InviteMemberButton } from './invite-member-button';
import { InviteMemberDialog } from './invite-member-dialog';

function mockInviteCreate(token = 'abc123', role = 'MEMBER') {
  server.use(
    http.post('/api/workspaces/:slug/invites', () =>
      HttpResponse.json({ token, role }, { status: 201 }),
    ),
  );
}

describe('InviteMemberButton', () => {
  it('renders «Пригласить» for the owner', () => {
    renderWithApi(<InviteMemberButton workspaceSlug="demo-hq" inviterRole="OWNER" />);
    expect(screen.getByRole('button', { name: 'Пригласить' })).toBeInTheDocument();
  });

  it('hides «Пригласить» from a member (ADR-0002 §2)', () => {
    renderWithApi(<InviteMemberButton workspaceSlug="demo-hq" inviterRole="MEMBER" />);
    expect(screen.queryByRole('button', { name: 'Пригласить' })).not.toBeInTheDocument();
  });
});

describe('invitableRoles', () => {
  it('owner can invite member or admin, admin only member, member nobody', () => {
    expect(invitableRoles('OWNER')).toEqual(['MEMBER', 'ADMIN']);
    expect(invitableRoles('ADMIN')).toEqual(['MEMBER']);
    expect(invitableRoles('MEMBER')).toEqual([]);
  });
});

describe('InviteMemberDialog', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('creates a link on open and copies it to the clipboard', async () => {
    // userEvent.setup() installs its own clipboard stub — assert through readText().
    const user = userEvent.setup();
    mockInviteCreate('tok42');
    renderWithApi(
      <InviteMemberDialog isShown onClose={() => {}} workspaceSlug="demo-hq" inviterRole="OWNER" />,
    );

    const linkInput = await screen.findByLabelText('Invite-ссылка');
    await waitFor(() => {
      expect(linkInput).toHaveValue('http://localhost:3000/invite/tok42');
    });

    await user.click(screen.getByRole('button', { name: 'Копировать' }));
    expect(await navigator.clipboard.readText()).toBe('http://localhost:3000/invite/tok42');
    expect(screen.getByRole('button', { name: 'Скопировано' })).toBeInTheDocument();
  });

  it('keeps «Скопировано» for a fresh link even when the old copy timer was still armed', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    server.use(
      http.post('/api/workspaces/:slug/invites', async ({ request }) => {
        const { role } = (await request.json()) as { role: string };
        return HttpResponse.json({ token: `tok-${role}`, role }, { status: 201 });
      }),
    );
    renderWithApi(
      <InviteMemberDialog isShown onClose={() => {}} workspaceSlug="demo-hq" inviterRole="OWNER" />,
    );
    // Timer callbacks set state — advancing the clock outside act() would leave the
    // rendered output stale. The sync callback makes act() flush synchronously.
    const advance = (ms: number) => {
      void act(() => vi.advanceTimersByTime(ms));
    };

    const linkInput = await screen.findByLabelText('Invite-ссылка');
    await waitFor(() => {
      expect(linkInput).toHaveValue('http://localhost:3000/invite/tok-MEMBER');
    });
    await user.click(screen.getByRole('button', { name: 'Копировать' }));
    expect(screen.getByRole('button', { name: 'Скопировано' })).toBeInTheDocument();

    // 1.5s into the 2s reset window the role changes and the new link is copied:
    // the armed timer of the old link must not flip the button back early.
    advance(1500);
    await user.click(screen.getByRole('button', { name: /участник/i }));
    await user.click(screen.getByRole('option', { name: 'Админ' }));
    await waitFor(() => {
      expect(linkInput).toHaveValue('http://localhost:3000/invite/tok-ADMIN');
    });
    await user.click(screen.getByRole('button', { name: 'Копировать' }));

    advance(600); // past the old timer's deadline, inside the new one
    expect(screen.getByRole('button', { name: 'Скопировано' })).toBeInTheDocument();
    advance(2000);
    expect(screen.getByRole('button', { name: 'Копировать' })).toBeInTheDocument();
  });

  it('offers the admin only the member role (ADR-0002 §2)', async () => {
    const user = userEvent.setup();
    renderWithApi(
      <InviteMemberDialog isShown onClose={() => {}} workspaceSlug="demo-hq" inviterRole="ADMIN" />,
    );

    // A single possible role makes the select a fixed readout — no listbox to open.
    const trigger = screen.getByRole('button', { name: /участник/i });
    expect(trigger).toBeDisabled();
    await user.click(trigger);
    expect(screen.queryByRole('option')).not.toBeInTheDocument();
  });
});
