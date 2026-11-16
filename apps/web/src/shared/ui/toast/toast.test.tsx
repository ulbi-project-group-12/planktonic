import type { ReactElement } from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Toast, ToastProvider } from './toast';
import { dismissToast, DEFAULT_TOAST_DURATION_MS, toast } from './toast-store';
import { Toaster } from './toaster';

function renderToast(ui: ReactElement) {
  return render(<ToastProvider>{ui}</ToastProvider>);
}

describe('Toast', () => {
  it('renders a toast with a palette icon and title', () => {
    renderToast(<Toast open onOpenChange={vi.fn()} palette="success" title="Задача создана" />);
    const toast = screen.getByText('Задача создана').closest('[data-slot="toast"]');
    expect(toast).not.toBeNull();
    expect(toast).toHaveAttribute('data-palette', 'success');
    expect(toast?.querySelector('svg')).not.toBeNull();
  });

  it('renders a description', () => {
    renderToast(
      <Toast
        open
        onOpenChange={vi.fn()}
        palette="danger"
        title="Генерация не удалась"
        description="Попробуйте ещё раз позже"
      />,
    );
    expect(screen.getByText('Попробуйте ещё раз позже')).toBeInTheDocument();
  });

  it('fires the action', async () => {
    const onClick = vi.fn();
    renderToast(
      <Toast
        open
        onOpenChange={vi.fn()}
        palette="danger"
        title="Не отправлено"
        action={{ label: 'Повторить', onClick }}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Повторить' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('closes via the cross', async () => {
    const onOpenChange = vi.fn();
    renderToast(<Toast open onOpenChange={onOpenChange} palette="info" title="PR #128 влит" />);
    await userEvent.click(screen.getByRole('button', { name: 'Закрыть' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});

describe('Toaster (императивный)', () => {
  it('shows a toast via toast() and hides it via dismissToast()', async () => {
    render(<Toaster />);
    let id = '';
    act(() => {
      id = toast({ title: 'Императивный тост', palette: 'warning' });
    });
    expect(await screen.findByText('Императивный тост')).toBeInTheDocument();
    act(() => {
      dismissToast(id);
    });
    await waitFor(() => {
      expect(screen.queryByText('Императивный тост')).toBeNull();
    });
  });
});

describe('Toaster (автозакрытие)', () => {
  it('auto-dismisses a toast after the default duration', () => {
    vi.useFakeTimers();
    try {
      render(<Toaster />);
      act(() => {
        toast({ title: 'Автотост' });
      });
      expect(screen.getByText('Автотост')).toBeInTheDocument();
      // +300 с запасом: 180 мс анимация скрытия + удаление из стора
      act(() => {
        vi.advanceTimersByTime(DEFAULT_TOAST_DURATION_MS + 300);
      });
      expect(screen.queryByText('Автотост')).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('respects a custom duration', () => {
    vi.useFakeTimers();
    try {
      render(<Toaster />);
      act(() => {
        toast({ title: 'Быстрый тост', duration: 1000 });
      });
      act(() => {
        vi.advanceTimersByTime(500);
      });
      expect(screen.getByText('Быстрый тост')).toBeInTheDocument();
      act(() => {
        vi.advanceTimersByTime(800);
      });
      expect(screen.queryByText('Быстрый тост')).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
  it('keeps auto-dismiss working for the rest after a manual close', () => {
    vi.useFakeTimers();
    try {
      render(<Toaster />);
      let firstId = '';
      act(() => {
        firstId = toast({ title: 'Первый тост' });
        toast({ title: 'Второй тост' });
      });
      // явно закрываем первый — удаление после анимации
      act(() => {
        dismissToast(firstId);
      });
      act(() => {
        vi.advanceTimersByTime(300);
      });
      expect(screen.queryByText('Первый тост')).toBeNull();
      // второй всё равно исчезает по своему таймеру
      act(() => {
        vi.advanceTimersByTime(DEFAULT_TOAST_DURATION_MS + 300);
      });
      expect(screen.queryByText('Второй тост')).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('auto-dismisses remaining toasts after closing the last one', () => {
    vi.useFakeTimers();
    try {
      render(<Toaster />);
      let secondId = '';
      act(() => {
        toast({ title: 'Тост А' });
        secondId = toast({ title: 'Тост Б' });
      });
      act(() => {
        dismissToast(secondId);
      });
      act(() => {
        vi.advanceTimersByTime(DEFAULT_TOAST_DURATION_MS + 300);
      });
      expect(screen.queryByText('Тост А')).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('Toaster (стек)', () => {
  it('stacks several toasts one under another', async () => {
    render(<Toaster />);
    act(() => {
      toast({ title: 'Первый тост' });
      toast({ title: 'Второй тост' });
      toast({ title: 'Третий тост' });
    });
    const viewport = (await screen.findByText('Первый тост')).closest(
      '[data-slot="toast"]',
    )?.parentElement;
    expect(viewport).not.toBeNull();
    expect(viewport?.children).toHaveLength(3);
    expect(await screen.findByText('Третий тост')).toBeInTheDocument();
  });
});
