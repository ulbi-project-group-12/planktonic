import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { renderWithApi } from '@/shared/lib/testing';
import { MobileNavDrawer } from './mobile-nav-drawer';

vi.mock('next/navigation', () => ({
  usePathname: () => '/workspaces',
  useParams: () => ({}),
  useRouter: () => ({ push: vi.fn() }),
}));

describe('MobileNavDrawer', () => {
  it('renders the sidebar when open', () => {
    renderWithApi(<MobileNavDrawer open onOpenChange={vi.fn()} />);
    expect(screen.getByRole('complementary', { name: 'Боковая панель' })).toBeInTheDocument();
  });

  it('calls onOpenChange with false when the close button is clicked', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    renderWithApi(<MobileNavDrawer open onOpenChange={onOpenChange} />);

    await user.click(screen.getByRole('button', { name: /Закрыть меню/ }));
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
  });

  it('closes with Escape', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    renderWithApi(<MobileNavDrawer open onOpenChange={onOpenChange} />);

    await user.keyboard('{Escape}');
    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it('closes when a workspace is selected', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    await fetch('http://api.example.invalid/api/workspaces', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Alpha Mobile', slug: 'alpha-mobile' }),
    });

    renderWithApi(<MobileNavDrawer open onOpenChange={onOpenChange} />);

    await user.click(await screen.findByRole('button', { name: /Выберите пространство/ }));
    await user.click(await screen.findByRole('menuitem', { name: /Alpha Mobile/ }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('traps focus inside the drawer', async () => {
    const user = userEvent.setup();
    renderWithApi(<MobileNavDrawer open onOpenChange={vi.fn()} />);

    const closeButton = screen.getByRole('button', { name: /Закрыть меню/ });
    await waitFor(() => expect(closeButton).toHaveFocus());

    await user.tab();
    expect(screen.getByRole('complementary', { name: 'Боковая панель' })).toContainElement(
      document.activeElement as HTMLElement,
    );
  });
});
