import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { server } from '@/shared/api-mocks-node';
import { renderWithApi } from '@/shared/lib/testing';
import { CreateWorkspaceForm } from './create-workspace-form';

const push = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));

describe('CreateWorkspaceForm', () => {
  beforeEach(() => {
    push.mockClear();
  });

  it('suggests the slug from the name, submits and opens the workspace page', async () => {
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

    await user.click(screen.getByRole('button', { name: 'Продолжить' }));

    await waitFor(() => {
      expect(push).toHaveBeenCalledWith('/workspaces/komanda-marketinga');
    });
    expect(posted).toEqual({ name: 'Команда маркетинга', slug: 'komanda-marketinga' });
  });

  it('stops suggesting once the address was edited by hand', async () => {
    const user = userEvent.setup();
    renderWithApi(<CreateWorkspaceForm />);

    const slug = screen.getByLabelText(/Адрес/);
    await user.type(slug, 'hq');
    await user.type(screen.getByLabelText(/Название/), 'Команда маркетинга');

    expect(slug).toHaveValue('hq');
  });

  it('shows validation errors and does not submit', async () => {
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
    await user.click(screen.getByRole('button', { name: 'Продолжить' }));

    expect(
      await screen.findByText('Только латиница, цифры и дефис, без дефиса в начале и в конце'),
    ).toBeVisible();
    expect(push).not.toHaveBeenCalled();
    expect(posts).toBe(0);
  });

  it('shows a taken-slug error on the address field', async () => {
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
    await user.click(screen.getByRole('button', { name: 'Продолжить' }));

    expect(await screen.findByText('Этот адрес уже занят — придумайте другой')).toBeVisible();
    expect(push).not.toHaveBeenCalled();
  });

  it('shows a banner on a network error and keeps the entered values', async () => {
    server.use(http.post('/api/workspaces', () => HttpResponse.error()));
    const user = userEvent.setup();
    renderWithApi(<CreateWorkspaceForm />);

    await user.type(screen.getByLabelText(/Название/), 'My Team');
    await user.click(screen.getByRole('button', { name: 'Продолжить' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Не удалось создать пространство');
    expect(screen.getByLabelText(/Название/)).toHaveValue('My Team');
    expect(push).not.toHaveBeenCalled();
  });

  it('disables the submit while the request is in flight', async () => {
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
    const submit = screen.getByRole('button', { name: 'Продолжить' });
    await user.click(submit);

    await waitFor(() => expect(submit).toBeDisabled());
    release();
    await waitFor(() => {
      expect(push).toHaveBeenCalledWith('/workspaces/my-team');
    });
  });
});
