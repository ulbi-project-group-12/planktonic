import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Modal } from './modal';

describe('Modal', () => {
  it('renders nothing when isShown is false', () => {
    render(<Modal isShown={false} title="Заголовок" />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows the modal with the title as its accessible name', () => {
    render(<Modal isShown title="Удалить канал?" />);
    expect(screen.getByRole('dialog')).toHaveAccessibleName('Удалить канал?');
  });

  it('renders a visually hidden title when title is not given', () => {
    render(<Modal isShown>Тело модалки</Modal>);
    expect(screen.getByText('Диалог')).toBeInTheDocument();
    expect(screen.getByText('Тело модалки')).toBeInTheDocument();
  });

  it('calls onClose on Escape', async () => {
    const onClose = vi.fn();
    render(<Modal isShown title="Заголовок" onClose={onClose} />);
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when the overlay is clicked', async () => {
    const onClose = vi.fn();
    render(<Modal isShown title="Заголовок" onClose={onClose} />);
    const overlay = document.querySelector('[data-slot="modal-overlay"]');
    if (!(overlay instanceof HTMLElement)) throw new Error('overlay not found');
    await userEvent.click(overlay);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose from the desktop close button', async () => {
    const onClose = vi.fn();
    render(<Modal isShown title="Заголовок" onClose={onClose} />);
    await userEvent.click(screen.getByRole('button', { name: 'Закрыть' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders footer actions and stays open after a click (controlled)', async () => {
    const onClick = vi.fn();
    render(
      <Modal
        isShown
        title="Удалить канал?"
        secondaryAction={{ label: 'Отмена' }}
        primaryAction={{ label: 'Удалить', palette: 'danger', onClick }}
      >
        История будет удалена безвозвратно.
      </Modal>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Удалить' }));
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('renders no footer without actions', () => {
    render(<Modal isShown title="Настройки" />);
    expect(document.querySelector('[data-slot="modal-footer"]')).toBeNull();
  });
});
