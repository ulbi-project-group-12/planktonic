import { screen, waitFor } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { server } from '@/shared/api-mocks-node';
import { renderWithApi } from '@/shared/lib/testing';
import { RegisterForm } from './register-form';

const push = vi.fn();

// Radix renders a hidden native checkbox inside a <form> and sizes it with ResizeObserver,
// which jsdom lacks.
vi.stubGlobal(
  'ResizeObserver',
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));

const PASSWORD = 'correct-horse-battery';

async function fill(user: UserEvent, overrides: Partial<Record<string, string>> = {}) {
  const values = {
    name: 'Ada',
    email: 'ada@example.com',
    password: PASSWORD,
    confirm: PASSWORD,
    terms: 'yes',
    ...overrides,
  };
  if (values.name) await user.type(screen.getByLabelText(/Имя/), values.name);
  if (values.email) await user.type(screen.getByLabelText(/Email/), values.email);
  if (values.password) await user.type(screen.getByLabelText(/^Пароль/), values.password);
  if (values.confirm) await user.type(screen.getByLabelText(/Повторите пароль/), values.confirm);
  if (values.terms !== 'no') await user.click(screen.getByRole('checkbox', { name: /условиями/ }));
}

const submit = () => screen.getByRole('button', { name: 'Создать аккаунт' });

describe('RegisterForm', () => {
  beforeEach(() => {
    push.mockClear();
  });

  it('registers and goes to the login screen', async () => {
    let posted: unknown;
    server.use(
      http.post('*/api/auth/register', async ({ request }) => {
        posted = await request.json();
        return HttpResponse.json(
          { id: '0190a8a4-0000-7000-8000-000000000000', name: 'Ada', email: 'ada@example.com' },
          { status: 201 },
        );
      }),
    );
    const user = userEvent.setup();
    renderWithApi(<RegisterForm />);

    await fill(user);
    await user.click(submit());

    await waitFor(() => {
      expect(push).toHaveBeenCalledWith('/login');
    });
    expect(posted).toEqual({
      name: 'Ada',
      email: 'ada@example.com',
      password: PASSWORD,
      confirmPassword: PASSWORD,
    });
  });

  it('toggles each password visibility independently', async () => {
    const user = userEvent.setup();
    renderWithApi(<RegisterForm />);

    const password = screen.getByLabelText(/^Пароль/);
    expect(password).toHaveAccessibleDescription('Не короче 15 символов');
    const confirm = screen.getByLabelText(/Повторите пароль/);
    await user.type(password, PASSWORD);
    await user.type(confirm, PASSWORD);
    expect(password).toHaveAttribute('type', 'password');
    expect(confirm).toHaveAttribute('type', 'password');

    await user.click(screen.getByRole('button', { name: 'Показать пароль' }));
    expect(password).toHaveAttribute('type', 'text');
    expect(password).toHaveValue(PASSWORD);
    expect(confirm).toHaveAttribute('type', 'password');

    await user.click(screen.getByRole('button', { name: 'Показать повтор пароля' }));
    expect(confirm).toHaveAttribute('type', 'text');
    expect(confirm).toHaveValue(PASSWORD);

    await user.click(screen.getByRole('button', { name: 'Скрыть пароль' }));
    await user.click(screen.getByRole('button', { name: 'Скрыть повтор пароля' }));
    expect(password).toHaveAttribute('type', 'password');
    expect(confirm).toHaveAttribute('type', 'password');
  });

  it('validates with the contract schema and does not submit', async () => {
    let posts = 0;
    server.use(
      http.post('*/api/auth/register', () => {
        posts += 1;
        return HttpResponse.json({}, { status: 201 });
      }),
    );
    const user = userEvent.setup();
    renderWithApi(<RegisterForm />);

    await fill(user, { name: 'A', email: 'not-an-email', password: 'short', confirm: 'other' });
    await user.click(submit());

    expect(await screen.findByText('Имя — от 2 до 15 символов')).toBeVisible();
    expect(screen.getByText('Введите корректный email')).toBeVisible();
    expect(screen.getByText('Пароль — не короче 15 символов')).toBeVisible();
    // The hint gives the real rule and steps aside for the error, which repeats it.
    expect(screen.getByLabelText(/^Пароль/)).toHaveAccessibleDescription(
      'Пароль — не короче 15 символов',
    );
    expect(screen.getByText('Пароли не совпадают')).toBeVisible();
    expect(posts).toBe(0);
    expect(push).not.toHaveBeenCalled();
  });

  it('keeps submit disabled until the terms are accepted', async () => {
    let posts = 0;
    server.use(
      http.post('*/api/auth/register', () => {
        posts += 1;
        return HttpResponse.json({}, { status: 201 });
      }),
    );
    const user = userEvent.setup();
    renderWithApi(<RegisterForm />);

    await fill(user, { terms: 'no' });
    expect(submit()).toBeDisabled();
    expect(posts).toBe(0);
    expect(screen.queryByText('Нужно согласие с условиями использования')).not.toBeInTheDocument();

    await user.click(screen.getByRole('checkbox', { name: /условиями/ }));
    expect(submit()).toBeEnabled();
  });

  it('shows "email taken" on the email field and focuses it', async () => {
    server.use(
      http.post('*/api/auth/register', () =>
        HttpResponse.json(
          {
            statusCode: 409,
            message: 'Email is already registered',
            error: 'Conflict',
            issues: [{ path: 'email', message: 'Email is already registered' }],
          },
          { status: 409 },
        ),
      ),
    );
    const user = userEvent.setup();
    renderWithApi(<RegisterForm />);

    await fill(user);
    await user.click(submit());

    expect(await screen.findByText(/Этот email уже зарегистрирован/)).toBeVisible();
    expect(screen.getByLabelText(/Email/)).toHaveFocus();
    expect(push).not.toHaveBeenCalled();
  });

  it('puts a weak-password issue of a 400 next to the password field', async () => {
    server.use(
      http.post('*/api/auth/register', () =>
        HttpResponse.json(
          {
            statusCode: 400,
            message: 'Validation failed',
            issues: [{ path: 'password', message: 'Пароль слишком простой' }],
          },
          { status: 400 },
        ),
      ),
    );
    const user = userEvent.setup();
    renderWithApi(<RegisterForm />);

    await fill(user);
    await user.click(submit());

    expect(await screen.findByText('Пароль слишком простой')).toBeVisible();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('does not blame the network when the server answers with an error', async () => {
    server.use(
      http.post('*/api/auth/register', () =>
        HttpResponse.json({ statusCode: 500, message: 'Internal server error' }, { status: 500 }),
      ),
    );
    const user = userEvent.setup();
    renderWithApi(<RegisterForm />);

    await fill(user);
    await user.click(submit());

    const banner = await screen.findByRole('alert');
    expect(banner).toHaveTextContent('Сервер ответил ошибкой');
    expect(banner).not.toHaveTextContent('подключение к сети');
  });

  it('shows a banner on a network error and keeps the entered values', async () => {
    server.use(http.post('*/api/auth/register', () => HttpResponse.error()));
    const user = userEvent.setup();
    renderWithApi(<RegisterForm />);

    await fill(user);
    await user.click(submit());

    expect(await screen.findByRole('alert')).toHaveTextContent('Не удалось зарегистрироваться');
    expect(screen.getByLabelText(/Email/)).toHaveValue('ada@example.com');
    expect(push).not.toHaveBeenCalled();
  });

  it('does not show "email taken" next to an address typed during the request', async () => {
    let release: () => void = () => {};
    const received = new Promise<void>((entered) => {
      server.use(
        http.post('*/api/auth/register', async () => {
          await new Promise<void>((resolve) => {
            release = resolve;
            entered();
          });
          return HttpResponse.json(
            {
              statusCode: 409,
              message: 'Email is already in use',
              issues: [{ path: 'email', message: 'Email is already in use' }],
            },
            { status: 409 },
          );
        }),
      );
    });
    const user = userEvent.setup();
    renderWithApi(<RegisterForm />);

    await fill(user);
    await user.click(submit());
    await received;
    await user.type(screen.getByLabelText(/Email/), '.org');
    release();

    await waitFor(() => {
      expect(submit()).toBeEnabled();
    });
    expect(screen.queryByText(/Этот email уже зарегистрирован/)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/Email/)).toHaveValue('ada@example.com.org');
    expect(push).not.toHaveBeenCalled();
  });

  it('disables the submit while the request is in flight', async () => {
    let release: () => void = () => {};
    // Resolves once the handler holds the request: only then does `release` let it through.
    let entered: () => void = () => {};
    const received = new Promise<void>((resolve) => {
      entered = resolve;
    });
    server.use(
      http.post('*/api/auth/register', async () => {
        await new Promise<void>((resolve) => {
          release = resolve;
          entered();
        });
        return HttpResponse.json(
          { id: '0190a8a4-0000-7000-8000-000000000000', name: 'Ada', email: 'ada@example.com' },
          { status: 201 },
        );
      }),
    );
    const user = userEvent.setup();
    renderWithApi(<RegisterForm />);

    await fill(user);
    await user.click(submit());

    await waitFor(() => {
      expect(submit()).toBeDisabled();
    });
    await received;
    release();
    await waitFor(() => {
      expect(push).toHaveBeenCalledWith('/login');
    });
  });
});
