import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderWithApi } from '@/shared/lib/testing';
import { AppSidebar } from './app-sidebar';

let pathname = '/workspaces';

const push = vi.fn();

vi.mock('next/navigation', () => ({
  usePathname: () => pathname,
  useParams: () => ({ workspaceSlug: undefined }),
  useRouter: () => ({ push }),
}));

describe('AppSidebar', () => {
  it('renders the workspace switcher and navigation', () => {
    pathname = '/workspaces';
    renderWithApi(<AppSidebar />);
    expect(screen.getByRole('complementary', { name: 'Боковая панель' })).toBeInTheDocument();
    expect(
      screen.getByRole('navigation', { name: 'Навигация по пространству' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Все пространства/ })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('marks the active nav item', () => {
    pathname = '/settings/profile';
    renderWithApi(<AppSidebar />);
    expect(screen.getByRole('link', { name: /Все пространства/ })).not.toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('disables workspace sections when no workspace is selected', () => {
    pathname = '/workspaces';
    renderWithApi(<AppSidebar />);
    expect(screen.getByText('Проекты').closest('[aria-disabled]')).toBeInTheDocument();
    expect(screen.getByText('Каналы').closest('[aria-disabled]')).toBeInTheDocument();
    expect(screen.getByText('Личные сообщения').closest('[aria-disabled]')).toBeInTheDocument();
    expect(screen.getByText(/Разделы появятся после выбора пространства/)).toBeInTheDocument();
  });

  it('calls onWidthChange within min and max bounds on drag', () => {
    const onWidthChange = vi.fn();
    renderWithApi(<AppSidebar width={264} onWidthChange={onWidthChange} />);

    const handle = screen.getByRole('separator', { name: 'Ширина боковой панели' });
    fireEvent.pointerDown(handle, { clientX: 264, pointerId: 1 });

    window.dispatchEvent(new PointerEvent('pointermove', { clientX: 500 }));
    expect(onWidthChange).toHaveBeenLastCalledWith(400);

    window.dispatchEvent(new PointerEvent('pointermove', { clientX: 0 }));
    expect(onWidthChange).toHaveBeenLastCalledWith(200);

    fireEvent.pointerUp(window);
  });

  it('exposes the width to assistive technology and stops resizing when the gesture is cancelled', () => {
    const onWidthChange = vi.fn();
    renderWithApi(<AppSidebar width={264} onWidthChange={onWidthChange} />);

    const handle = screen.getByRole('separator', { name: 'Ширина боковой панели' });
    expect(handle).toHaveAttribute('aria-valuenow', '264');
    expect(handle).toHaveAttribute('aria-valuemin', '200');
    expect(handle).toHaveAttribute('aria-valuemax', '400');

    fireEvent.pointerDown(handle, { clientX: 264, pointerId: 1 });
    window.dispatchEvent(new PointerEvent('pointercancel'));
    window.dispatchEvent(new PointerEvent('pointermove', { clientX: 300 }));
    expect(onWidthChange).not.toHaveBeenCalled();
  });

  it('calls onWidthChange with arrow keys within min and max bounds', () => {
    const onWidthChange = vi.fn();
    const { rerender } = renderWithApi(<AppSidebar width={264} onWidthChange={onWidthChange} />);

    const handle = screen.getByRole('separator', { name: 'Ширина боковой панели' });
    fireEvent.keyDown(handle, { key: 'ArrowRight' });
    expect(onWidthChange).toHaveBeenLastCalledWith(280);

    fireEvent.keyDown(handle, { key: 'ArrowLeft' });
    expect(onWidthChange).toHaveBeenLastCalledWith(248);

    rerender(<AppSidebar width={200} onWidthChange={onWidthChange} />);
    fireEvent.keyDown(handle, { key: 'ArrowLeft' });
    expect(onWidthChange).toHaveBeenLastCalledWith(200);

    rerender(<AppSidebar width={400} onWidthChange={onWidthChange} />);
    fireEvent.keyDown(handle, { key: 'ArrowRight' });
    expect(onWidthChange).toHaveBeenLastCalledWith(400);
  });
});
