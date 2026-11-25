import { screen, waitFor } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getWorkspaceListQueryKey, sessionStore, setAccessTokenProvider } from '@/shared/api';
import { server } from '@/shared/api-mocks-node';
import { renderWithApi } from '@/shared/lib/testing';
import { LoginPage } from './login-page';
import { LoginForm } from './login-form';

const push = vi.fn();

let search = '';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => new URLSearchParams(search),
}));

const PASSWORD = 'correct-horse-battery';

async function fill(user: UserEvent, overrides: Partial<Record<string, string>> = {}) {
  const values = {
    email: 'ada@example.com',
    password: PASSWORD,
    ...overrides,
  };
  if (values.email) await user.type(screen.getByLabelText(/Email/), values.email);
  if (values.password) await user.type(screen.getByLabelText(/Пароль/), values.password);
}

const submit = () => screen.getByRole('button', { name: 'Войти' });

describe('LoginForm', () => {
  beforeEach(() => {
    push.mockClear();
    search = '';
    sessionStore.setState({ accessToken: undefined });
    setAccessTokenProvider(undefined);
  });

  it('opens creation when the authenticated workspace list is empty', async () => {
    let posted: unknown;
    let authorization: string | null = null;
    server.use(
      http.post('*/api/auth/login', async ({ request }) => {
        posted = await request.json();
        return HttpResponse.json({ accessToken: 'test-access-token' });
      }),
      http.get('*/api/workspaces', ({ request }) => {
        authorization = request.headers.get('Authorization');
        return HttpResponse.json([]);
      }),
    );
    const user = userEvent.setup();
    renderWithApi(<LoginForm />);

    await fill(user);
    await user.click(submit());

    await waitFor(() => {
      expect(push).toHaveBeenCalledWith('/workspaces/create');
    });
    expect(authorization).toBe('Bearer test-access-token');
    expect(posted).toEqual({ email: 'ada@example.com', password: PASSWORD });
    expect(sessionStore.getState().accessToken).toBe('test-access-token');
  });

  it.each([
    ['/workspaces/my-team?tab=members', '/workspaces/my-team?tab=members'],
    ['https://evil.example/', '/workspaces'],
    ['//evil.example', '/workspaces'],
  ])('after sign-in opens the return address %s as %s', async (next, expected) => {
    search = new URLSearchParams({ next }).toString();
    server.use(
      http.post('*/api/auth/login', () => HttpResponse.json({ accessToken: 'test-access-token' })),
      http.get('*/api/workspaces', () =>
        HttpResponse.json([{ id: 'ws-1', name: 'My team', slug: 'my-team' }]),
      ),
    );
    const user = userEvent.setup();
    renderWithApi(<LoginForm />);

    await fill(user);
    await user.click(submit());

    await waitFor(() => {
      expect(push).toHaveBeenCalledExactlyOnceWith(expected);
    });
  });

  it('does not reuse the workspace list cached for the previous account', async () => {
    server.use(
      http.post('*/api/auth/login', () => HttpResponse.json({ accessToken: 'test-access-token' })),
      http.get('*/api/workspaces', () => HttpResponse.json([])),
    );
    const user = userEvent.setup();
    const { queryClient } = renderWithApi(<LoginForm />);
    // Loaded a moment ago by another account in the same tab, so still fresh for the client.
    queryClient.setQueryData(getWorkspaceListQueryKey(), [
      { id: '019a8f00-0000-7000-8000-000000000004', name: 'Their team', slug: 'their-team' },
    ]);

    await fill(user);
    await user.click(submit());

    await waitFor(() => {
      expect(push).toHaveBeenCalledWith('/workspaces/create');
    });
    expect(queryClient.getQueryData(getWorkspaceListQueryKey())).toEqual([]);
  });

  it('goes to the workspace list when the list cannot be loaded', async () => {
    server.use(
      http.post('*/api/auth/login', () => HttpResponse.json({ accessToken: 'test-access-token' })),
      http.get('*/api/workspaces', () => new HttpResponse(null, { status: 500 })),
    );
    const user = userEvent.setup();
    renderWithApi(<LoginForm />);

    await fill(user);
    await user.click(submit());

    await waitFor(() => {
      expect(push).toHaveBeenCalledWith('/workspaces');
    });
  });

  it('toggles password visibility without clearing the value', async () => {
    const user = userEvent.setup();
    renderWithApi(<LoginForm />);

    const password = screen.getByLabelText(/Пароль/);
    await user.type(password, PASSWORD);
    expect(password).toHaveAttribute('type', 'password');

    await user.click(screen.getByRole('button', { name: 'Показать пароль' }));
    expect(password).toHaveAttribute('type', 'text');
    expect(password).toHaveValue(PASSWORD);
    expect(screen.getByRole('button', { name: 'Скрыть пароль' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    await user.click(screen.getByRole('button', { name: 'Скрыть пароль' }));
    expect(password).toHaveAttribute('type', 'password');
    expect(password).toHaveValue(PASSWORD);
  });

  it('validates with the contract schema and does not submit', async () => {
    let posts = 0;
    server.use(
      http.post('*/api/auth/login', () => {
        posts += 1;
        return HttpResponse.json({ accessToken: 'test-access-token' });
      }),
    );
    const user = userEvent.setup();
    renderWithApi(<LoginForm />);

    await fill(user, { email: 'not-an-email', password: '' });
    await user.click(submit());

    expect(await screen.findByText('Введите корректный email')).toBeVisible();
    expect(screen.getByText('Введите пароль')).toBeVisible();
    expect(posts).toBe(0);
    expect(push).not.toHaveBeenCalled();
  });

  it('shows one invalid-credentials error for a 401', async () => {
    server.use(
      http.post('*/api/auth/login', () =>
        HttpResponse.json(
          {
            statusCode: 401,
            message: 'Invalid email or password',
            error: 'Unauthorized',
          },
          { status: 401 },
        ),
      ),
    );
    const user = userEvent.setup();
    renderWithApi(<LoginForm />);

    await fill(user);
    await user.click(submit());

    const banner = await screen.findByRole('alert');
    expect(banner).toHaveTextContent('Неверный email или пароль');
    expect(push).not.toHaveBeenCalled();
    expect(sessionStore.getState().accessToken).toBeUndefined();
  });

  it('hides the banner of the previous attempt once the credentials are edited', async () => {
    server.use(
      http.post('*/api/auth/login', () =>
        HttpResponse.json(
          { statusCode: 401, message: 'Invalid email or password' },
          { status: 401 },
        ),
      ),
    );
    const user = userEvent.setup();
    renderWithApi(<LoginForm />);

    await fill(user);
    await user.click(submit());
    expect(await screen.findByRole('alert')).toBeVisible();

    await user.type(screen.getByLabelText(/Пароль/), '1');

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('does not show a late 401 next to credentials edited during the request', async () => {
    let release: () => void = () => {};
    let markEntered: () => void = () => {};
    const entered = new Promise<void>((resolve) => {
      markEntered = resolve;
    });
    server.use(
      http.post('*/api/auth/login', async () => {
        markEntered();
        await new Promise<void>((resolve) => {
          release = resolve;
        });
        return HttpResponse.json(
          { statusCode: 401, message: 'Invalid email or password' },
          { status: 401 },
        );
      }),
    );
    const user = userEvent.setup();
    renderWithApi(<LoginForm />);

    await fill(user);
    await user.click(submit());
    await entered;
    await user.type(screen.getByLabelText(/Пароль/), '1');
    release();

    await waitFor(() => {
      expect(submit()).toBeEnabled();
    });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('never falls back to a native GET submit that would put the password in the URL', () => {
    const { container } = renderWithApi(<LoginForm />);

    expect(container.querySelector('form')).toHaveAttribute('method', 'post');
  });

  it('puts field issues of a 400 next to their fields', async () => {
    server.use(
      http.post('*/api/auth/login', () =>
        HttpResponse.json(
          {
            statusCode: 400,
            message: 'Validation failed',
            issues: [
              { path: 'email', message: 'Email выглядит некорректно' },
              { path: 'password', message: 'Пароль обязателен' },
            ],
          },
          { status: 400 },
        ),
      ),
    );
    const user = userEvent.setup();
    renderWithApi(<LoginForm />);

    await fill(user);
    await user.click(submit());

    expect(await screen.findByText('Email выглядит некорректно')).toBeVisible();
    expect(screen.getByText('Пароль обязателен')).toBeVisible();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows a server-error banner when the api is unavailable', async () => {
    server.use(
      http.post('*/api/auth/login', () =>
        HttpResponse.json(
          {
            statusCode: 503,
            message: 'Login is unavailable',
            error: 'Service Unavailable',
          },
          { status: 503 },
        ),
      ),
    );
    const user = userEvent.setup();
    renderWithApi(<LoginForm />);

    await fill(user);
    await user.click(submit());

    const banner = await screen.findByRole('alert');
    expect(banner).toHaveTextContent('Сервер ответил ошибкой');
    expect(banner).not.toHaveTextContent('подключение к сети');
  });

  it('shows a banner on a network error and keeps the entered values', async () => {
    server.use(http.post('*/api/auth/login', () => HttpResponse.error()));
    const user = userEvent.setup();
    renderWithApi(<LoginForm />);

    await fill(user);
    await user.click(submit());

    expect(await screen.findByRole('alert')).toHaveTextContent('Не удалось войти');
    expect(screen.getByLabelText(/Email/)).toHaveValue('ada@example.com');
    expect(push).not.toHaveBeenCalled();
  });

  it('disables the submit while the request is in flight', async () => {
    let release: () => void = () => {};
    // The button is disabled before the request reaches the handler, so `release` may still be
    // the no-op: wait until the handler has run.
    let markEntered: () => void = () => {};
    const entered = new Promise<void>((resolve) => {
      markEntered = resolve;
    });
    server.use(
      http.post('*/api/auth/login', async () => {
        markEntered();
        await new Promise<void>((resolve) => {
          release = resolve;
        });
        return HttpResponse.json({ accessToken: 'test-access-token' });
      }),
    );
    const user = userEvent.setup();
    renderWithApi(<LoginForm />);

    await fill(user);
    await user.click(submit());

    await waitFor(() => {
      expect(submit()).toBeDisabled();
    });
    await entered;
    release();
    await waitFor(() => {
      expect(push).toHaveBeenCalledWith('/workspaces/create');
    });
  });
});

describe('LoginPage', () => {
  it('shows the secondary auth actions and links', () => {
    renderWithApi(<LoginPage />);

    expect(screen.getByRole('link', { name: 'Забыли пароль?' })).toHaveAttribute(
      'href',
      '/forgot-password',
    );
    expect(screen.getByRole('button', { name: 'Войти через GitHub' })).toBeDisabled();
    expect(screen.getByRole('link', { name: 'Зарегистрироваться' })).toHaveAttribute(
      'href',
      '/register',
    );
  });
});
