import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { sessionStore, setAccessTokenProvider } from '@/shared/api';
import { server } from '@/shared/api-mocks-node';
import { renderWithApi } from '@/shared/lib/testing';
import { AppLayout } from './app-layout';

const push = vi.fn();
const replace = vi.fn();

vi.mock('next/navigation', () => ({
  usePathname: () => '/workspaces',
  useRouter: () => ({ push, replace }),
  useParams: () => ({}),
}));

const profile = {
  id: '019a8f00-0000-7000-8000-000000000004',
  name: 'Ада Лавлейс',
  email: 'ada@example.com',
};

function renderLayout() {
  return renderWithApi(
    <AppLayout>
      <main>content</main>
    </AppLayout>,
  );
}

describe('AppLayout behind the login', () => {
  beforeEach(() => {
    push.mockClear();
    replace.mockClear();
    window.history.replaceState(null, '', '/workspaces');
    server.use(http.get('/api/auth/me', () => HttpResponse.json(profile)));
  });

  afterEach(() => {
    sessionStore.setState({ accessToken: undefined, signedOut: false });
    setAccessTokenProvider(undefined);
  });

  it('does not mount the shell for a guest and sends them to login', async () => {
    renderLayout();

    await waitFor(() => {
      expect(replace).toHaveBeenCalledExactlyOnceWith('/login?next=%2Fworkspaces');
    });
    expect(screen.queryByRole('banner')).not.toBeInTheDocument();
    expect(screen.queryByText('content')).not.toBeInTheDocument();
  });

  it('shows the signed-in user in the header and signs out from its menu', async () => {
    setAccessTokenProvider(() => sessionStore.getState().accessToken);
    sessionStore.setState({ accessToken: 'test-access-token' });
    const user = userEvent.setup();
    renderLayout();

    expect(await screen.findByText('content')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: `Меню пользователя ${profile.name}` }));
    await user.click(screen.getByRole('menuitem', { name: /Выйти/ }));

    await waitFor(() => {
      expect(replace).toHaveBeenCalledExactlyOnceWith('/login');
    });
    expect(sessionStore.getState().accessToken).toBeUndefined();
    expect(screen.queryByRole('banner')).not.toBeInTheDocument();
  });
});
