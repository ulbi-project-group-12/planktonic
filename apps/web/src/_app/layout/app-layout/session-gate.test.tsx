import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  apiFetch,
  clearSignedOutFlag,
  ensureSessionHandlers,
  sessionStore,
  setAccessTokenProvider,
  setRefreshHandler,
  signOut,
} from '@/shared/api';
import { server } from '@/shared/api-mocks-node';
import { renderWithApi } from '@/shared/lib/testing';
import { SessionGate } from './session-gate';

const replace = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace }),
  usePathname: () => '/workspaces/my-team',
}));

const profile = {
  id: '019a8f00-0000-7000-8000-000000000004',
  name: 'Ада Лавлейс',
  email: 'ada@example.com',
};

// The wiring signIn sets up, with a token the test chooses.
function signInAs(accessToken: string) {
  setAccessTokenProvider(
    () => sessionStore.getState().accessToken,
    () => {
      sessionStore.setState({ accessToken: undefined });
    },
  );
  // Set restoreStatus first so a render that sees the old token state never starts restore.
  sessionStore.setState({ restoreStatus: 'done' });
  sessionStore.setState({ accessToken });
}

function renderGate() {
  return renderWithApi(
    <SessionGate>
      <p>Закрытая страница</p>
    </SessionGate>,
  );
}

function refreshRejected() {
  return http.post('/api/auth/refresh', () =>
    HttpResponse.json({ statusCode: 401, message: 'Unauthorized' }, { status: 401 }),
  );
}

describe('SessionGate', () => {
  beforeEach(() => {
    replace.mockClear();
    ensureSessionHandlers();
    sessionStore.setState({ accessToken: undefined, signedOut: false, restoreStatus: 'done' });
    window.history.replaceState(null, '', '/workspaces/my-team?tab=members');
  });

  afterEach(() => {
    sessionStore.setState({ accessToken: undefined, signedOut: false, restoreStatus: 'done' });
    setAccessTokenProvider(undefined);
    setRefreshHandler(undefined);
    clearSignedOutFlag();
  });

  it('restores the session on load when no token is in memory', async () => {
    sessionStore.setState({ restoreStatus: 'idle' });
    let authorization: string | null = null;
    server.use(
      http.post('/api/auth/refresh', () => HttpResponse.json({ accessToken: 'restored-token' })),
      http.get('/api/auth/me', ({ request }) => {
        authorization = request.headers.get('authorization');
        return HttpResponse.json(profile);
      }),
    );

    renderGate();

    expect(screen.getByLabelText('Загрузка')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText('Закрытая страница')).toBeInTheDocument();
    });
    expect(authorization).toBe('Bearer restored-token');
    expect(replace).not.toHaveBeenCalled();
  });

  it('offers to retry a failed restore without redirecting to login', async () => {
    sessionStore.setState({ restoreStatus: 'idle' });
    let attempts = 0;
    server.use(
      http.post('/api/auth/refresh', () => {
        attempts += 1;
        if (attempts === 1) return new HttpResponse(null, { status: 503 });
        return HttpResponse.json({ accessToken: 'restored-token' });
      }),
      http.get('/api/auth/me', () => HttpResponse.json(profile)),
    );

    renderGate();

    expect(await screen.findByRole('alert')).toHaveTextContent('Не удалось восстановить сессию');
    expect(replace).not.toHaveBeenCalled();
    expect(attempts).toBe(1);

    await userEvent.click(screen.getByRole('button', { name: 'Повторить' }));

    expect(await screen.findByText('Закрытая страница')).toBeInTheDocument();
    expect(attempts).toBe(2);
    expect(replace).not.toHaveBeenCalled();
  });

  it('sends a guest to the login screen when refresh is rejected', async () => {
    sessionStore.setState({ restoreStatus: 'idle' });
    let refreshCount = 0;
    server.use(
      http.post('/api/auth/refresh', () => {
        refreshCount += 1;
        return HttpResponse.json({ statusCode: 401, message: 'Unauthorized' }, { status: 401 });
      }),
      http.get('/api/auth/me', () => {
        throw new Error('me should not be called');
      }),
    );

    renderGate();

    await waitFor(() => {
      expect(replace).toHaveBeenCalledExactlyOnceWith(
        '/login?next=%2Fworkspaces%2Fmy-team%3Ftab%3Dmembers',
      );
    });
    expect(refreshCount).toBe(1);
    expect(screen.queryByText('Закрытая страница')).not.toBeInTheDocument();
  });

  it('sends a guest to the login screen with the address to return to', async () => {
    let asked = false;
    server.use(
      refreshRejected(),
      http.get('/api/auth/me', () => {
        asked = true;
        return HttpResponse.json(profile);
      }),
    );

    renderGate();

    await waitFor(() => {
      expect(replace).toHaveBeenCalledExactlyOnceWith(
        '/login?next=%2Fworkspaces%2Fmy-team%3Ftab%3Dmembers',
      );
    });
    expect(screen.queryByText('Закрытая страница')).not.toBeInTheDocument();
    expect(asked).toBe(false);
  });

  it('keeps the hash of the address in the return address', async () => {
    server.use(refreshRejected());
    window.history.replaceState(null, '', '/workspaces/my-team?thread=t1#m2');

    renderGate();

    await waitFor(() => {
      expect(replace).toHaveBeenLastCalledWith(
        '/login?next=%2Fworkspaces%2Fmy-team%3Fthread%3Dt1%23m2',
      );
    });
  });

  it('shows the page to a signed-in user', async () => {
    let authorization: string | null = null;
    server.use(
      http.get('/api/auth/me', ({ request }) => {
        authorization = request.headers.get('authorization');
        return HttpResponse.json(profile);
      }),
    );
    signInAs('test-access-token');

    renderGate();

    expect(await screen.findByText('Закрытая страница')).toBeInTheDocument();
    expect(authorization).toBe('Bearer test-access-token');
    expect(replace).not.toHaveBeenCalled();
  });

  it('forgets a token the api rejects and sends the visitor to login', async () => {
    server.use(
      refreshRejected(),
      http.get('/api/auth/me', () =>
        HttpResponse.json({ statusCode: 401, message: 'Unauthorized' }, { status: 401 }),
      ),
    );
    signInAs('expired-access-token');

    const { queryClient } = renderGate();

    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith('/login?next=%2Fworkspaces%2Fmy-team%3Ftab%3Dmembers');
    });
    expect(sessionStore.getState().accessToken).toBeUndefined();
    expect(queryClient.getQueryData(['/api/auth/me'])).toBeUndefined();
    expect(screen.queryByText('Закрытая страница')).not.toBeInTheDocument();
  });

  it('sends the visitor to login when another request finds the token rejected', async () => {
    server.use(
      http.get('/api/auth/me', () => HttpResponse.json(profile)),
      http.get('/api/workspaces', () =>
        HttpResponse.json({ statusCode: 401, message: 'Unauthorized' }, { status: 401 }),
      ),
      refreshRejected(),
    );
    signInAs('expired-access-token');
    renderGate();
    await screen.findByText('Закрытая страница');

    await expect(apiFetch('/api/workspaces')).rejects.toMatchObject({ status: 401 });

    await waitFor(() => {
      expect(replace).toHaveBeenCalledExactlyOnceWith(
        '/login?next=%2Fworkspaces%2Fmy-team%3Ftab%3Dmembers',
      );
    });
    expect(screen.queryByText('Закрытая страница')).not.toBeInTheDocument();
  });

  it('leaves for the login screen without a return address after sign-out', async () => {
    server.use(http.get('/api/auth/me', () => HttpResponse.json(profile)));
    signInAs('test-access-token');
    const { queryClient } = renderGate();
    await screen.findByText('Закрытая страница');

    await act(async () => {
      await signOut();
    });

    await waitFor(() => {
      expect(replace).toHaveBeenCalledExactlyOnceWith('/login');
    });
    expect(queryClient.getQueryData(['/api/auth/me'])).toBeUndefined();
    expect(screen.queryByText('Закрытая страница')).not.toBeInTheDocument();
    // The next guest visit is an ordinary one again.
    expect(sessionStore.getState().signedOut).toBe(false);
  });

  it('keeps the session when the profile returns 401 and refresh is unavailable', async () => {
    server.use(
      http.get('/api/auth/me', () => new HttpResponse(null, { status: 401 })),
      http.post('/api/auth/refresh', () => new HttpResponse(null, { status: 503 })),
    );
    signInAs('expired-access-token');

    renderGate();

    expect(await screen.findByRole('alert')).toHaveTextContent('Не удалось загрузить профиль');
    expect(replace).not.toHaveBeenCalled();
    expect(sessionStore.getState().accessToken).toBe('expired-access-token');
  });

  it('keeps the session and offers a retry when the profile request fails', async () => {
    let fail = true;
    server.use(
      http.get('/api/auth/me', () =>
        fail
          ? HttpResponse.json(
              { statusCode: 500, message: 'Internal Server Error' },
              { status: 500 },
            )
          : HttpResponse.json(profile),
      ),
    );
    signInAs('test-access-token');

    expect(sessionStore.getState().accessToken).toBe('test-access-token');
    renderGate();

    expect(await screen.findByRole('alert')).toHaveTextContent('Не удалось загрузить профиль');
    expect(replace).not.toHaveBeenCalled();
    expect(sessionStore.getState().accessToken).toBe('test-access-token');

    fail = false;
    await userEvent.click(screen.getByRole('button', { name: 'Повторить' }));

    expect(await screen.findByText('Закрытая страница')).toBeInTheDocument();
  });
});
