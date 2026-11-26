import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { sessionStore } from '@/shared/api';
import { server } from '@/shared/api-mocks-node';
import { routes } from '@/shared/config';
import { LandingCta } from './landing-cta';

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

    await user.click(screen.getByRole('button', { name: /Начать/ }));

    await waitFor(() => {
      expect(push).toHaveBeenCalledWith(routes.register());
    });
  });

  it('sends a signed-in visitor to the app', async () => {
    // The default mock answers the refresh with a token, so the restore on mount signs in.
    const user = userEvent.setup();
    render(<LandingCta />);

    await user.click(screen.getByRole('button', { name: /Начать/ }));

    await waitFor(() => {
      expect(push).toHaveBeenCalledWith(routes.workspaces());
    });
  });

  it('goes straight to the app when the session is already in memory', async () => {
    sessionStore.setState({ accessToken: 'test-token', restoreStatus: 'done' });
    const user = userEvent.setup();
    render(<LandingCta />);

    await user.click(screen.getByRole('button', { name: /Начать/ }));

    expect(push).toHaveBeenCalledWith(routes.workspaces());
    expect(push).not.toHaveBeenCalledWith(routes.register());
  });
});
