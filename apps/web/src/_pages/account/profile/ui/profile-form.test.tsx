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
const zoneTrigger = () => screen.getByRole('button', { name: 'Часовой пояс' });
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
    // The saved answer is the new baseline: nothing left to save.
    await waitFor(() => {
      expect(submitButton()).toBeDisabled();
    });
    expect(nameInput()).toHaveValue('Vlad');
  });

  it('picks a zone from the searchable IANA list and sends it', async () => {
    let patched: unknown;
    server.use(
      http.patch('*/api/users/me', async ({ request }) => {
        patched = await request.json();
        return HttpResponse.json({ ...ada, tz: 'Asia/Tokyo' });
      }),
    );
    renderWithApi(<ProfileForm initial={ada} />);
    const user = userEvent.setup();

    await user.click(zoneTrigger());
    await user.type(screen.getByLabelText('Поиск по списку'), 'tokyo');
    await user.click(screen.getByRole('option', { name: /^Asia\/Tokyo \(UTC\+9\)$/ }));
    await user.click(submitButton());

    await waitFor(() => {
      expect(patched).toEqual({ name: 'Ada', tz: 'Asia/Tokyo' });
    });
  });

  it('takes a refetched profile into untouched fields and keeps the edited ones', async () => {
    const { rerender } = renderWithApi(<ProfileForm initial={ada} />);
    const user = userEvent.setup();

    // Nothing edited: the name changed elsewhere replaces the shown one, the form stays clean.
    rerender(<ProfileForm initial={{ ...ada, name: 'Grace' }} />);
    await waitFor(() => {
      expect(nameInput()).toHaveValue('Grace');
    });
    expect(submitButton()).toBeDisabled();

    // The name is being edited: a refetch brings a new zone but must not drop the input.
    await user.clear(nameInput());
    await user.type(nameInput(), 'Vlad');
    rerender(<ProfileForm initial={{ ...ada, name: 'Grace', tz: 'Asia/Tokyo' }} />);
    await waitFor(() => {
      expect(zoneTrigger()).toHaveTextContent('Asia/Tokyo');
    });
    expect(nameInput()).toHaveValue('Vlad');
    expect(submitButton()).toBeEnabled();
  });

  it('follows a refetch again after a save: the saved field is no longer treated as edited', async () => {
    const patched: unknown[] = [];
    server.use(
      http.patch('*/api/users/me', async ({ request }) => {
        const body = (await request.json()) as Partial<ProfileMe>;
        patched.push(body);
        return HttpResponse.json({ ...ada, ...body });
      }),
    );
    const { rerender } = renderWithApi(<ProfileForm initial={ada} />);
    const user = userEvent.setup();

    await user.clear(nameInput());
    await user.type(nameInput(), 'Vlad');
    await user.click(submitButton());
    await waitFor(() => {
      expect(submitButton()).toBeDisabled();
    });
    expect(nameInput()).toHaveValue('Vlad');

    // The name is changed elsewhere after the save: the form must show it, not keep 'Vlad'.
    rerender(<ProfileForm initial={{ ...ada, name: 'Grace' }} />);
    await waitFor(() => {
      expect(nameInput()).toHaveValue('Grace');
    });

    await user.click(zoneTrigger());
    await user.type(screen.getByLabelText('Поиск по списку'), 'tokyo');
    await user.click(screen.getByRole('option', { name: /^Asia\/Tokyo/ }));
    await user.click(submitButton());
    await waitFor(() => {
      expect(patched).toHaveLength(2);
    });
    expect(patched[1]).toEqual({ name: 'Grace', tz: 'Asia/Tokyo' });
  });

  it('falls back to the browser zone when the profile has none', () => {
    renderWithApi(<ProfileForm initial={{ id: ada.id, name: ada.name, email: ada.email }} />);

    expect(zoneTrigger()).toHaveTextContent(Intl.DateTimeFormat().resolvedOptions().timeZone);
  });

  it('holds the name to the registration limits without a request', async () => {
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
    await user.type(nameInput(), 'A');
    await user.click(submitButton());
    expect(await screen.findByText('Имя — от 2 до 15 символов')).toBeInTheDocument();

    await user.clear(nameInput());
    await user.type(nameInput(), 'A'.repeat(16));
    await user.click(submitButton());
    expect(await screen.findByText('Имя — не длиннее 15 символов')).toBeInTheDocument();
    expect(patched).toBeUndefined();
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
