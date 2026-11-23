import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithApi } from '@/shared/lib/testing';
import { WorkspaceSwitcher } from './workspace-switcher';

const push = vi.fn();
let workspaceSlug: string | undefined;
let slugCounter = 0;

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  useParams: () => ({ workspaceSlug }),
}));

function uniqueSlug(base: string) {
  slugCounter += 1;
  return `${base}-${String(slugCounter)}`;
}

async function postWorkspace(name: string, slug: string) {
  const response = await fetch('http://api.example.invalid/api/workspaces', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name, slug }),
  });
  expect(response.status).toBe(201);
}

function getMenuItem(name: RegExp | string) {
  const items = screen.getAllByRole('menuitem', { name });
  expect(items.length).toBeGreaterThanOrEqual(1);
  return items[0]!;
}

describe('WorkspaceSwitcher', () => {
  beforeEach(() => {
    push.mockClear();
    workspaceSlug = undefined;
  });

  it('is disabled when there are no workspaces', async () => {
    renderWithApi(<WorkspaceSwitcher />);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Выберите пространство/ })).toBeDisabled(),
    );
  });

  it('shows the current workspace', async () => {
    const slug = uniqueSlug('alpha');
    await postWorkspace('Alpha Team', slug);
    workspaceSlug = slug;
    renderWithApi(<WorkspaceSwitcher />);
    expect(await screen.findByRole('button', { name: /Alpha Team/ })).toBeEnabled();
  });

  it('loads and searches workspaces', async () => {
    const user = userEvent.setup();
    const alphaSlug = uniqueSlug('alpha');
    const betaSlug = uniqueSlug('beta');
    await postWorkspace('Alpha Search', alphaSlug);
    await postWorkspace('Beta Search', betaSlug);

    renderWithApi(<WorkspaceSwitcher />);
    await user.click(await screen.findByRole('button', { name: /Выберите пространство/ }));

    expect(getMenuItem(/Alpha Search/)).toBeInTheDocument();
    expect(getMenuItem(/Beta Search/)).toBeInTheDocument();

    const search = screen.getByRole('textbox', { name: /Поиск пространств/ });
    await user.type(search, 'beta');

    await waitFor(
      () => {
        expect(getMenuItem(/Beta Search/)).toBeInTheDocument();
        expect(screen.queryByRole('menuitem', { name: /Alpha Search/ })).not.toBeInTheDocument();
      },
      { timeout: 2000 },
    );
  });

  it('switches to another workspace', async () => {
    const user = userEvent.setup();
    const alphaSlug = uniqueSlug('alpha');
    const betaSlug = uniqueSlug('beta');
    await postWorkspace('Alpha Switch', alphaSlug);
    await postWorkspace('Beta Switch', betaSlug);
    workspaceSlug = alphaSlug;

    renderWithApi(<WorkspaceSwitcher />);
    await user.click(await screen.findByRole('button', { name: /Alpha Switch/ }));
    await user.click(getMenuItem(/Beta Switch/));

    expect(push).toHaveBeenCalledWith(`/workspaces/${betaSlug}`);
  });

  it('navigates to workspace creation', async () => {
    const user = userEvent.setup();
    const slug = uniqueSlug('alpha');
    await postWorkspace('Alpha Create', slug);

    renderWithApi(<WorkspaceSwitcher />);
    await user.click(await screen.findByRole('button', { name: /Выберите пространство/ }));
    await user.click(getMenuItem(/Создать пространство/));

    expect(push).toHaveBeenCalledWith('/workspaces/create');
  });

  it('closes the dropdown and resets search on Escape', async () => {
    const user = userEvent.setup();
    const slug = uniqueSlug('alpha');
    await postWorkspace('Alpha Escape', slug);

    renderWithApi(<WorkspaceSwitcher />);
    await user.click(await screen.findByRole('button', { name: /Выберите пространство/ }));
    const search = screen.getByRole('textbox', { name: /Поиск пространств/ });
    await user.type(search, 'no-match');

    await waitFor(() => {
      expect(screen.getByText('Ничего не найдено')).toBeInTheDocument();
    });

    await user.keyboard('{Escape}');
    await waitFor(() => {
      expect(screen.queryByRole('menuitem', { name: /Alpha Escape/ })).not.toBeInTheDocument();
    });
  });
});
