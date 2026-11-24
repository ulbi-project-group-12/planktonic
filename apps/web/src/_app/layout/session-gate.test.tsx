import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { sessionStore, setAccessTokenProvider } from '@/shared/api';
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

function signInAs(accessToken: string) {
  setAccessTokenProvider(() => sessionStore.getState().accessToken);
  sessionStore.setState({ accessToken });
}

function renderGate() {
  return renderWithApi(
    <SessionGate>
      <p>Закрытая страница</p>
    </SessionGate>,
  );
}

describe('SessionGate', () => {
  beforeEach(() => {
    replace.mockClear();
    window.history.replaceState(null, '', '/workspaces/my-team?tab=members');
  });

  afterEach(() => {
    sessionStore.setState({ accessToken: undefined });
    setAccessTokenProvider(undefined);
  });

  it('sends a guest to the login screen with the address to return to', async () => {
    let asked = false;
    server.use(
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

  it('shows the page and the name of the signed-in user', async () => {
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
    expect(screen.getByTestId('current-user-name')).toHaveTextContent(profile.name);
    expect(authorization).toBe('Bearer test-access-token');
    expect(replace).not.toHaveBeenCalled();
  });

  it('forgets a token the api rejects and sends the visitor to login', async () => {
    server.use(
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
    expect(queryClient.getQueryCache().getAll()).toEqual([]);
    expect(screen.queryByText('Закрытая страница')).not.toBeInTheDocument();
  });

  it('signs out to the login screen without a return address', async () => {
    server.use(http.get('/api/auth/me', () => HttpResponse.json(profile)));
    signInAs('test-access-token');
    const { queryClient } = renderGate();

    await userEvent.click(await screen.findByRole('button', { name: 'Выйти' }));

    await waitFor(() => {
      expect(replace).toHaveBeenCalledExactlyOnceWith('/login');
    });
    expect(sessionStore.getState().accessToken).toBeUndefined();
    expect(queryClient.getQueryCache().getAll()).toEqual([]);
    expect(screen.queryByText('Закрытая страница')).not.toBeInTheDocument();
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

    renderGate();

    expect(await screen.findByRole('alert')).toHaveTextContent('Не удалось загрузить профиль');
    expect(replace).not.toHaveBeenCalled();
    expect(sessionStore.getState().accessToken).toBe('test-access-token');

    fail = false;
    await userEvent.click(screen.getByRole('button', { name: 'Повторить' }));

    expect(await screen.findByText('Закрытая страница')).toBeInTheDocument();
  });
});
