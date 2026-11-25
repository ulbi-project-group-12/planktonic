import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getWorkspaceListQueryKey } from '@/shared/api';
import { server } from '@/shared/api-mocks-node';
import { renderWithApi } from '@/shared/lib/testing';
import { CreateWorkspaceForm } from './create-workspace-form';

const push = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));

const continueButton = () => screen.getByRole('button', { name: 'Продолжить' });
const createButton = () => screen.getByRole('button', { name: 'Создать пространство' });
const backButton = () => screen.getByRole('button', { name: 'Назад' });

describe('CreateWorkspaceForm', () => {
  beforeEach(() => {
    push.mockClear();
  });

  it('suggests the slug from the name and opens the workspace after step 2', async () => {
    let posted: unknown;
    server.use(
      http.post('/api/workspaces', async ({ request }) => {
        posted = await request.json();
        return HttpResponse.json(
          { id: 'ws-1', name: 'Команда маркетинга', slug: 'komanda-marketinga' },
          { status: 201 },
        );
      }),
    );
    const user = userEvent.setup();
    renderWithApi(<CreateWorkspaceForm />);

    await user.type(screen.getByLabelText(/Название/), 'Команда маркетинга');
    expect(screen.getByLabelText(/Адрес/)).toHaveValue('komanda-marketinga');

    await user.click(continueButton());
    expect(await screen.findByText('Пригласите участников')).toBeVisible();
    expect(screen.getByText('Шаг 2 из 2 — Команда маркетинга')).toBeVisible();
    expect(posted).toBeUndefined();

    await user.click(createButton());

    await waitFor(() => {
      expect(push).toHaveBeenCalledWith('/workspaces/komanda-marketinga');
    });
    expect(posted).toEqual({ name: 'Команда маркетинга', slug: 'komanda-marketinga' });
  });

  it('offers an invite link on step 2 before the workspace exists', async () => {
    const user = userEvent.setup();
    renderWithApi(<CreateWorkspaceForm />);

    await user.type(screen.getByLabelText(/Название/), 'My Team');
    await user.click(continueButton());

    await waitFor(() => {
      expect(screen.getByLabelText('Invite-ссылка')).toHaveDisplayValue(/\/invite\//);
    });
  });

  it('goes back to step 1 keeping the entered values', async () => {
    const user = userEvent.setup();
    renderWithApi(<CreateWorkspaceForm />);

    await user.type(screen.getByLabelText(/Название/), 'My Team');
    await user.click(continueButton());
    expect(await screen.findByText('Пригласите участников')).toBeVisible();

    await user.click(backButton());

    expect(screen.getByLabelText(/Название/)).toHaveValue('My Team');
    expect(screen.getByLabelText(/Адрес/)).toHaveValue('my-team');
    expect(screen.getByText('Шаг 1 из 2 — название и адрес')).toBeVisible();
  });

  it('marks the cached workspace list stale after a successful create', async () => {
    server.use(
      http.post('/api/workspaces', () =>
        HttpResponse.json({ id: 'ws-1', name: 'My Team', slug: 'my-team' }, { status: 201 }),
      ),
    );
    const user = userEvent.setup();
    const { queryClient } = renderWithApi(<CreateWorkspaceForm />);
    // The shell's switcher loaded the list before the form was opened.
    queryClient.setQueryData(getWorkspaceListQueryKey(), []);

    await user.type(screen.getByLabelText(/Название/), 'My Team');
    await user.click(continueButton());
    await user.click(createButton());

    await waitFor(() => {
      expect(push).toHaveBeenCalledWith('/workspaces/my-team');
    });
    expect(queryClient.getQueryState(getWorkspaceListQueryKey())?.isInvalidated).toBe(true);
  });

  it('stops suggesting once the address was edited by hand', async () => {
    const user = userEvent.setup();
    renderWithApi(<CreateWorkspaceForm />);

    const slug = screen.getByLabelText(/Адрес/);
    await user.type(slug, 'hq');
    await user.type(screen.getByLabelText(/Название/), 'Команда маркетинга');

    expect(slug).toHaveValue('hq');
  });

  it('does not bring the suggestion back after the address was fully cleared', async () => {
    const user = userEvent.setup();
    renderWithApi(<CreateWorkspaceForm />);

    await user.type(screen.getByLabelText(/Название/), 'Команда маркетинга');
    const slug = screen.getByLabelText(/Адрес/);
    await user.clear(slug);
    await user.type(screen.getByLabelText(/Название/), ' и продажи');

    expect(slug).toHaveValue('');
  });

  it('shows validation errors and stays on step 1', async () => {
    let posts = 0;
    server.use(
      http.post('/api/workspaces', () => {
        posts += 1;
        return HttpResponse.json({}, { status: 201 });
      }),
    );
    const user = userEvent.setup();
    renderWithApi(<CreateWorkspaceForm />);

    const slug = screen.getByLabelText(/Адрес/);
    await user.clear(slug);
    await user.type(slug, 'плохой адрес!');
    await user.click(continueButton());

    expect(
      await screen.findByText('Только латиница, цифры и дефис, без дефиса в начале и в конце'),
    ).toBeVisible();
    expect(screen.queryByText('Пригласите участников')).not.toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
    expect(posts).toBe(0);
  });

  it('returns to step 1 with a taken-slug error on the address field', async () => {
    server.use(
      http.post('/api/workspaces', () =>
        HttpResponse.json(
          {
            statusCode: 409,
            message: 'Workspace slug is already taken',
            error: 'Conflict',
            issues: [{ path: 'slug', message: 'This slug is already taken' }],
          },
          { status: 409 },
        ),
      ),
    );
    const user = userEvent.setup();
    renderWithApi(<CreateWorkspaceForm />);

    await user.type(screen.getByLabelText(/Название/), 'My Team');
    await user.click(continueButton());
    await user.click(createButton());

    expect(await screen.findByText('Этот адрес уже занят — придумайте другой')).toBeVisible();
    // Keyboard and screen-reader users land on the field they have to fix.
    await waitFor(() => {
      expect(screen.getByLabelText(/Адрес/)).toHaveFocus();
    });
    expect(screen.getByText('Шаг 1 из 2 — название и адрес')).toBeVisible();
    expect(push).not.toHaveBeenCalled();
  });

  it('drops the taken-slug error once the name suggests another address', async () => {
    server.use(
      http.post('/api/workspaces', () =>
        HttpResponse.json(
          { statusCode: 409, message: 'Workspace slug is already taken', error: 'Conflict' },
          { status: 409 },
        ),
      ),
    );
    const user = userEvent.setup();
    renderWithApi(<CreateWorkspaceForm />);

    await user.type(screen.getByLabelText(/Название/), 'My Team');
    await user.click(continueButton());
    await user.click(createButton());
    expect(await screen.findByText('Этот адрес уже занят — придумайте другой')).toBeVisible();

    await user.type(screen.getByLabelText(/Название/), ' 2');

    expect(screen.getByLabelText(/Адрес/)).toHaveValue('my-team-2');
    await waitFor(() => {
      expect(
        screen.queryByText('Этот адрес уже занят — придумайте другой'),
      ).not.toBeInTheDocument();
    });
  });

  it('does not put a taken-slug error next to an address changed during the request', async () => {
    let release: () => void = () => {};
    server.use(
      http.post('/api/workspaces', async () => {
        await new Promise<void>((resolve) => {
          release = resolve;
        });
        return HttpResponse.json(
          { statusCode: 409, message: 'Workspace slug is already taken', error: 'Conflict' },
          { status: 409 },
        );
      }),
    );
    const user = userEvent.setup();
    renderWithApi(<CreateWorkspaceForm />);

    await user.type(screen.getByLabelText(/Название/), 'My Team');
    await user.click(continueButton());
    await user.click(createButton());
    await waitFor(() => expect(createButton()).toBeDisabled());
    await user.click(backButton());
    await user.type(screen.getByLabelText(/Адрес/), '-2');
    release();

    await waitFor(() => {
      expect(screen.getByLabelText(/Адрес/)).toHaveValue('my-team-2');
    });
    expect(screen.queryByText('Этот адрес уже занят — придумайте другой')).not.toBeInTheDocument();
  });

  it('puts the field issues of a 400 next to their fields on step 1', async () => {
    server.use(
      http.post('/api/workspaces', () =>
        HttpResponse.json(
          {
            statusCode: 400,
            message: 'Validation failed',
            issues: [{ path: 'name', message: 'Название не подходит' }],
          },
          { status: 400 },
        ),
      ),
    );
    const user = userEvent.setup();
    renderWithApi(<CreateWorkspaceForm />);

    await user.type(screen.getByLabelText(/Название/), 'My Team');
    await user.click(continueButton());
    await user.click(createButton());

    expect(await screen.findByText('Название не подходит')).toBeVisible();
    expect(screen.getByText('Шаг 1 из 2 — название и адрес')).toBeVisible();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('does not put a 400 field issue next to a name changed during the request', async () => {
    let release: () => void = () => {};
    server.use(
      http.post('/api/workspaces', async () => {
        await new Promise<void>((resolve) => {
          release = resolve;
        });
        return HttpResponse.json(
          {
            statusCode: 400,
            message: 'Validation failed',
            issues: [{ path: 'name', message: 'Название не подходит' }],
          },
          { status: 400 },
        );
      }),
    );
    const user = userEvent.setup();
    renderWithApi(<CreateWorkspaceForm />);

    await user.type(screen.getByLabelText(/Название/), 'My Team');
    await user.click(continueButton());
    await user.click(createButton());
    await waitFor(() => expect(createButton()).toBeDisabled());
    await user.click(backButton());
    await user.type(screen.getByLabelText(/Название/), ' 2');
    release();

    expect(screen.queryByText('Название не подходит')).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('does not blame the network when the server answers with an error', async () => {
    server.use(
      http.post('/api/workspaces', () =>
        HttpResponse.json({ statusCode: 500, message: 'Internal server error' }, { status: 500 }),
      ),
    );
    const user = userEvent.setup();
    renderWithApi(<CreateWorkspaceForm />);

    await user.type(screen.getByLabelText(/Название/), 'My Team');
    await user.click(continueButton());
    await user.click(createButton());

    const banner = await screen.findByRole('alert');
    expect(banner).toHaveTextContent('Сервер ответил ошибкой');
    expect(banner).not.toHaveTextContent('подключение к сети');
  });

  it('shows a banner on a network error and keeps the entered values', async () => {
    server.use(http.post('/api/workspaces', () => HttpResponse.error()));
    const user = userEvent.setup();
    renderWithApi(<CreateWorkspaceForm />);

    await user.type(screen.getByLabelText(/Название/), 'My Team');
    await user.click(continueButton());
    await user.click(createButton());

    expect(await screen.findByRole('alert')).toHaveTextContent('Не удалось создать пространство');
    expect(push).not.toHaveBeenCalled();

    // The entered values survive stepping back.
    await user.click(backButton());
    expect(screen.getByLabelText(/Название/)).toHaveValue('My Team');

    // The banner describes the failed request: it goes away once the form itself is invalid.
    await user.clear(screen.getByLabelText(/Название/));
    await user.click(continueButton());
    expect(await screen.findByText('Введите название пространства')).toBeVisible();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('stays on the list when the user left the wizard while the request was in flight', async () => {
    let release: () => void = () => {};
    server.use(
      http.post('/api/workspaces', async () => {
        await new Promise<void>((resolve) => {
          release = resolve;
        });
        return HttpResponse.json({ id: 'ws-1', name: 'My Team', slug: 'my-team' }, { status: 201 });
      }),
    );
    const user = userEvent.setup();
    renderWithApi(<CreateWorkspaceForm />);

    await user.type(screen.getByLabelText(/Название/), 'My Team');
    await user.click(continueButton());
    await user.click(createButton());
    await waitFor(() => expect(createButton()).toBeDisabled());
    await user.click(backButton());
    await user.click(screen.getByRole('button', { name: 'Отмена' }));
    release();

    await waitFor(() => {
      expect(push).toHaveBeenCalledTimes(1);
    });
    expect(push).toHaveBeenCalledWith('/workspaces');
  });

  it('disables the create button while the request is in flight', async () => {
    let release: () => void = () => {};
    server.use(
      http.post('/api/workspaces', async () => {
        await new Promise<void>((resolve) => {
          release = resolve;
        });
        return HttpResponse.json({ id: 'ws-1', name: 'My Team', slug: 'my-team' }, { status: 201 });
      }),
    );
    const user = userEvent.setup();
    renderWithApi(<CreateWorkspaceForm />);

    await user.type(screen.getByLabelText(/Название/), 'My Team');
    await user.click(continueButton());
    await user.click(createButton());

    await waitFor(() => expect(createButton()).toBeDisabled());
    release();
    await waitFor(() => {
      expect(push).toHaveBeenCalledWith('/workspaces/my-team');
    });
  });
});
