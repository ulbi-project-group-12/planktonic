import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import { describe, expect, it } from 'vitest';
import { getAuthMeQueryKey } from '@/shared/api';
import { server } from '@/shared/api-mocks-node';
import { renderWithApi } from '@/shared/lib/testing';
import type { ProfileMe } from '../api/profile';
import { ProfileForm } from './profile-form';

const ada: ProfileMe = {
  id: '019a8f00-0000-7000-8000-000000000004',
  name: 'Ada',
  email: 'ada@example.com',
  tz: 'Europe/Berlin',
};

const nameInput = () => screen.getByLabelText('Имя');
const submitButton = () => screen.getByRole('button', { name: 'Сохранить' });

describe('ProfileForm', () => {
  it('sends the edited values to PATCH /api/users/me and writes the answer into the me cache', async () => {
    let patched: unknown;
    server.use(
      http.patch('*/api/users/me', async ({ request }) => {
        patched = await request.json();
        return HttpResponse.json({ ...ada, name: 'Vlad' });
      }),
    );
    const { queryClient } = renderWithApi(<ProfileForm initial={ada} />);
    const user = userEvent.setup();

    await user.clear(nameInput());
    await user.type(nameInput(), 'Vlad');
    await user.click(submitButton());

    await waitFor(() => {
      expect(patched).toMatchObject({ name: 'Vlad', tz: 'Europe/Berlin' });
    });
    // The header reads useAuthMe — the same key — so it shows the new name without a reload.
    expect(queryClient.getQueryData(getAuthMeQueryKey())).toMatchObject({ name: 'Vlad' });
  });

  it('keeps submit disabled until the form is dirty', async () => {
    renderWithApi(<ProfileForm initial={ada} />);
    const user = userEvent.setup();

    expect(submitButton()).toBeDisabled();
    await user.type(nameInput(), 'a');
    expect(submitButton()).toBeEnabled();
  });

  it('puts a server issue under its field and keeps the form filled', async () => {
    server.use(
      http.patch('*/api/users/me', () =>
        HttpResponse.json(
          {
            statusCode: 400,
            message: 'Validation failed',
            issues: [{ path: 'name', message: 'Это имя уже занято' }],
          },
          { status: 400 },
        ),
      ),
    );
    renderWithApi(<ProfileForm initial={ada} />);
    const user = userEvent.setup();

    await user.type(nameInput(), 'x');
    await user.click(submitButton());

    expect(await screen.findByText('Это имя уже занято')).toBeInTheDocument();
    expect(nameInput()).toHaveValue('Adax');
  });

  it('blocks an empty name on the client without a request', async () => {
    let patched: unknown;
    server.use(
      http.patch('*/api/users/me', async ({ request }) => {
        patched = await request.json();
        return HttpResponse.json(ada);
      }),
    );
    renderWithApi(<ProfileForm initial={ada} />);
    const user = userEvent.setup();

    await user.clear(nameInput());
    await user.click(submitButton());

    expect(await screen.findByText('Введите имя')).toBeInTheDocument();
    expect(patched).toBeUndefined();
  });

  it('shows a banner when the server answers without issues', async () => {
    server.use(
      http.patch('*/api/users/me', () =>
        HttpResponse.json({ statusCode: 500, message: 'Internal Server Error' }, { status: 500 }),
      ),
    );
    renderWithApi(<ProfileForm initial={ada} />);
    const user = userEvent.setup();

    await user.type(nameInput(), 'x');
    await user.click(submitButton());

    expect(
      await screen.findByText('Сервер ответил ошибкой. Попробуйте ещё раз чуть позже.'),
    ).toBeInTheDocument();
  });
});
