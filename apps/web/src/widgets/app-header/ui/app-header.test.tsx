import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PRODUCT_DISPLAY_NAME } from '@app/config/product';
import { sessionStore } from '@/shared/api';
import { server } from '@/shared/api-mocks-node';
import { renderWithApi } from '@/shared/lib/testing';
import { AppHeader } from './app-header';

const push = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  useParams: () => ({}),
}));

describe('AppHeader', () => {
  beforeEach(() => {
    push.mockClear();
    document.documentElement.classList.remove('dark');
    localStorage.removeItem('theme');
  });

  it('shows the product logo and name', () => {
    renderWithApi(<AppHeader onOpenMobileSidebar={vi.fn()} />);
    expect(screen.getByText(PRODUCT_DISPLAY_NAME)).toBeInTheDocument();
  });

  it('shows a skeleton while the user is loading', () => {
    renderWithApi(<AppHeader onOpenMobileSidebar={vi.fn()} />);
    expect(screen.getByLabelText(/Загрузка меню пользователя/)).toBeInTheDocument();
  });

  it('shows the current user name once loaded', async () => {
    renderWithApi(<AppHeader onOpenMobileSidebar={vi.fn()} />);
    expect(await screen.findByText('Ada')).toBeInTheDocument();
  });

  it('navigates to profile settings', async () => {
    const user = userEvent.setup();
    renderWithApi(<AppHeader onOpenMobileSidebar={vi.fn()} />);
    await user.click(await screen.findByText('Ada'));
    await user.click(screen.getByRole('menuitem', { name: /Настройки профиля/ }));
    expect(push).toHaveBeenCalledWith('/settings/profile');
  });

  it('opens the theme switcher and applies the selected theme', async () => {
    const user = userEvent.setup();
    renderWithApi(<AppHeader onOpenMobileSidebar={vi.fn()} />);
    await screen.findByText('Ada');

    await user.click(screen.getByRole('button', { name: /Тема оформления/ }));
    await user.click(screen.getByRole('menuitem', { name: /Тёмная/ }));

    expect(localStorage.getItem('theme')).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('switches between light, dark and system themes', async () => {
    const user = userEvent.setup();
    renderWithApi(<AppHeader onOpenMobileSidebar={vi.fn()} />);
    await screen.findByText('Ada');

    await user.click(screen.getByRole('button', { name: /Тема оформления/ }));
    await user.click(screen.getByRole('menuitem', { name: /Светлая/ }));
    expect(localStorage.getItem('theme')).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);

    await user.click(screen.getByRole('button', { name: /Тема оформления/ }));
    await user.click(screen.getByRole('menuitem', { name: /Как в системе/ }));
    expect(localStorage.getItem('theme')).toBeNull();
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('forgets the access token and clears the query cache on logout', async () => {
    const logout = Promise.withResolvers<Response>();
    server.use(http.post('*/api/auth/logout', () => logout.promise));
    const user = userEvent.setup();
    sessionStore.setState({ accessToken: 'token' });
    const { queryClient } = renderWithApi(<AppHeader onOpenMobileSidebar={vi.fn()} />);
    queryClient.setQueryData(['test'], 'value');

    try {
      await user.click(await screen.findByText('Ada'));
      await user.click(screen.getByRole('menuitem', { name: /Выйти/ }));

      expect(queryClient.getQueryData(['test'])).toBeUndefined();
    } finally {
      logout.resolve(HttpResponse.json({}));
    }

    await waitFor(() => {
      expect(sessionStore.getState().accessToken).toBeUndefined();
    });
  });

  it('closes the user dropdown with Escape', async () => {
    const user = userEvent.setup();
    renderWithApi(<AppHeader onOpenMobileSidebar={vi.fn()} />);
    await user.click(await screen.findByText('Ada'));
    expect(screen.getByRole('menuitem', { name: /Выйти/ })).toBeInTheDocument();

    await user.keyboard('{Escape}');
    await waitFor(() => {
      expect(screen.queryByRole('menuitem', { name: /Выйти/ })).not.toBeInTheDocument();
    });
  });

  it('closes the theme dropdown with Escape', async () => {
    const user = userEvent.setup();
    renderWithApi(<AppHeader onOpenMobileSidebar={vi.fn()} />);
    await screen.findByText('Ada');

    await user.click(screen.getByRole('button', { name: /Тема оформления/ }));
    expect(screen.getByRole('menuitem', { name: /Как в системе/ })).toBeInTheDocument();

    await user.keyboard('{Escape}');
    await waitFor(() => {
      expect(screen.queryByRole('menuitem', { name: /Как в системе/ })).not.toBeInTheDocument();
    });
  });

  it('opens the mobile sidebar from the burger button', async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    renderWithApi(<AppHeader onOpenMobileSidebar={onOpen} />);
    await user.click(screen.getByRole('button', { name: /Открыть меню/ }));
    expect(onOpen).toHaveBeenCalled();
  });
});
