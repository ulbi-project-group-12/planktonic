import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Alert } from './alert';

describe('Alert', () => {
  it('renders title with the palette icon', () => {
    render(<Alert palette="danger" title="Не отправлено" />);
    expect(screen.getByRole('alert')).toHaveAttribute('data-palette', 'danger');
    expect(screen.getByText('Не отправлено')).toHaveClass('text-danger');
    expect(document.querySelector('[data-slot="alert"] svg')).not.toBeNull();
  });

  it('renders description and action', async () => {
    const onClick = vi.fn();
    render(
      <Alert
        title="Не отправлено"
        description="Проверьте соединение с сетью"
        action={{ label: 'Повторить', onClick }}
      />,
    );
    expect(screen.getByText('Проверьте соединение с сетью')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Повторить' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('renders the close button and calls onClose', async () => {
    const onClose = vi.fn();
    render(<Alert title="Задача создана" closable onClose={onClose} />);
    await userEvent.click(screen.getByRole('button', { name: 'Закрыть' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders no close button without closable', () => {
    render(<Alert title="Задача создана" />);
    expect(screen.queryByRole('button', { name: 'Закрыть' })).not.toBeInTheDocument();
  });
});
