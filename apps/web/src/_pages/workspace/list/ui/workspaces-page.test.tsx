import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { server } from '@/shared/api-mocks-node';
import { renderWithApi } from '@/shared/lib/testing';
import { WorkspacesPage } from './workspaces-page';

const push = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));

async function postWorkspace(name: string, slug: string) {
  const response = await fetch('http://api.example.invalid/api/workspaces', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name, slug }),
  });
  expect(response.status).toBe(201);
}

describe('WorkspacesPage', () => {
  beforeEach(() => {
    push.mockClear();
  });

  it('shows an empty state when there are no workspaces', async () => {
    renderWithApi(<WorkspacesPage />);
    expect(await screen.findByText('У вас пока нет пространств')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Создать пространство/ })).toBeInTheDocument();
  });

  it('lists workspaces and navigates on click', async () => {
    await postWorkspace('Alpha Team', 'alpha-team');
    await postWorkspace('Beta Crew', 'beta-crew');

    renderWithApi(<WorkspacesPage />);
    expect(await screen.findByText('Alpha Team')).toBeInTheDocument();
    expect(screen.getByText('Beta Crew')).toBeInTheDocument();

    expect(screen.getByRole('link', { name: /Alpha Team/ })).toHaveAttribute(
      'href',
      '/workspaces/alpha-team',
    );
  });

  it('shows an error with retry', async () => {
    const user = userEvent.setup();
    server.use(
      http.get('/api/workspaces', () => HttpResponse.json({ message: 'fail' }, { status: 500 })),
    );

    renderWithApi(<WorkspacesPage />);
    expect(await screen.findByText(/Не удалось загрузить пространства/)).toBeInTheDocument();

    server.use(http.get('/api/workspaces', () => HttpResponse.json([], { status: 200 })));
    await user.click(screen.getByRole('button', { name: /Повторить/ }));

    await waitFor(() => {
      expect(screen.getByText('У вас пока нет пространств')).toBeInTheDocument();
    });
  });
});
