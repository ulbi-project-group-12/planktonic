import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { sessionStore } from '@/shared/api';
import { server } from '@/shared/api-mocks-node';
import { routes } from '@/shared/config';
import { Toaster } from '@/shared/ui/toast';
import { LandingCta, LandingLoginButton } from './landing-cta';

const push = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));

function refreshRejected() {
  return http.post('*/api/auth/refresh', () =>
    HttpResponse.json({ statusCode: 401, message: 'Unauthorized' }, { status: 401 }),
  );
}

function resetSession() {
  sessionStore.setState({ accessToken: undefined, restoreStatus: 'idle', signedOut: false });
}

describe('LandingCta', () => {
  beforeEach(() => {
    push.mockClear();
    localStorage.clear();
    resetSession();
  });

  afterEach(() => {
    resetSession();
  });

  it('sends a guest to the registration', async () => {
    server.use(refreshRejected());
    const user = userEvent.setup();
    render(<LandingCta />);

    await user.click(screen.getByRole('button', { name: /Зарегистрироваться/ }));

    await waitFor(() => {
      expect(push).toHaveBeenCalledWith(routes.register());
    });
  });

  it('sends a signed-in visitor to the app', async () => {
    // The default mock answers the refresh with a token, so the restore on mount signs in.
    const user = userEvent.setup();
    render(<LandingCta />);

    await user.click(screen.getByRole('button', { name: /Зарегистрироваться/ }));

    await waitFor(() => {
      expect(push).toHaveBeenCalledWith(routes.workspaces());
    });
  });

  it('goes straight to the app when the session is already in memory', async () => {
    sessionStore.setState({ accessToken: 'test-token', restoreStatus: 'done' });
    const user = userEvent.setup();
    render(<LandingCta />);

    await user.click(screen.getByRole('button', { name: /Зарегистрироваться/ }));

    expect(push).toHaveBeenCalledWith(routes.workspaces());
    expect(push).not.toHaveBeenCalledWith(routes.register());
  });

  it('stays on the landing and reports it when the refresh fails with a network error', async () => {
    server.use(http.post('*/api/auth/refresh', () => HttpResponse.error()));
    const user = userEvent.setup();
    render(
      <>
        <LandingCta />
        <Toaster />
      </>,
    );

    await user.click(screen.getByRole('button', { name: /Зарегистрироваться/ }));

    expect(await screen.findByText('Не удалось проверить сессию')).toBeInTheDocument();
    expect(sessionStore.getState().restoreStatus).toBe('error');
    expect(push).not.toHaveBeenCalled();
  });

  it('retries the restore on the next click after a network error', async () => {
    server.use(http.post('*/api/auth/refresh', () => HttpResponse.error()));
    const user = userEvent.setup();
    render(<LandingCta />);

    await user.click(screen.getByRole('button', { name: /Зарегистрироваться/ }));
    await waitFor(() => {
      expect(sessionStore.getState().restoreStatus).toBe('error');
    });
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Зарегистрироваться/ })).toBeEnabled();
    });
    expect(push).not.toHaveBeenCalled();

    // The network is back and the server confirms there is no session.
    server.use(refreshRejected());
    await user.click(screen.getByRole('button', { name: /Зарегистрироваться/ }));

    await waitFor(() => {
      expect(push).toHaveBeenCalledWith(routes.register());
    });
  });
});

describe('LandingLoginButton', () => {
  it('is a real link to the login page', () => {
    render(<LandingLoginButton />);

    const link = screen.getByRole('link', { name: 'Войти' });
    expect(link).toHaveAttribute('href', routes.login());
  });
});
