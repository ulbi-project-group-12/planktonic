import { screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ensureSessionHandlers,
  sessionStore,
  setAccessTokenProvider,
  setRefreshHandler,
} from '@/shared/api';
import { server } from '@/shared/api-mocks-node';
import { renderWithApi } from '@/shared/lib/testing';
import { InviteLayout } from './invite-layout';

const replace = vi.fn();

vi.mock('next/navigation', () => ({
  usePathname: () => '/invite/tok42',
  useRouter: () => ({ replace }),
}));

function renderLayout() {
  return renderWithApi(
    <InviteLayout>
      <main>invite screen</main>
    </InviteLayout>,
  );
}

describe('InviteLayout', () => {
  beforeEach(() => {
    replace.mockClear();
    ensureSessionHandlers();
    sessionStore.setState({ accessToken: undefined, signedOut: false, restoreStatus: 'idle' });
    window.history.replaceState(null, '', '/invite/tok42');
  });

  afterEach(() => {
    sessionStore.setState({ accessToken: undefined, signedOut: false, restoreStatus: 'idle' });
    setAccessTokenProvider(undefined);
    setRefreshHandler(undefined);
  });

  it('sends a guest to the login screen with the invite link to come back to', async () => {
    server.use(
      http.post('/api/auth/refresh', () =>
        HttpResponse.json({ statusCode: 401, message: 'Unauthorized' }, { status: 401 }),
      ),
    );
    renderLayout();

    await waitFor(() => {
      expect(replace).toHaveBeenCalledExactlyOnceWith('/login?next=%2Finvite%2Ftok42');
    });
    expect(screen.queryByText('invite screen')).not.toBeInTheDocument();
  });

  it('restores the session of a fresh tab and shows the invite', async () => {
    renderLayout();

    expect(await screen.findByText('invite screen')).toBeInTheDocument();
    expect(sessionStore.getState().accessToken).toBe('msw-refreshed-token');
    expect(replace).not.toHaveBeenCalled();
  });
});
