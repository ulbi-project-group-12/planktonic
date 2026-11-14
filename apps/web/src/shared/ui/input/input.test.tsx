import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Input } from './input';

describe('Input', () => {
  it('renders with placeholder', () => {
    render(<Input placeholder="Введите название" aria-label="Поле" />);
    expect(screen.getByLabelText('Поле')).toHaveAttribute('placeholder', 'Введите название');
  });

  it('links the label to the input', () => {
    render(<Input label="Название пространства" />);
    expect(screen.getByLabelText('Название пространства')).toBeInTheDocument();
  });

  it('shows an error message and error status', () => {
    render(<Input label="Slug" defaultValue="hq" status="error" message="Slug уже занят" />);
    expect(screen.getByText('Slug уже занят')).toBeInTheDocument();
    expect(document.querySelector('[data-status="error"]')).toBeInTheDocument();
  });

  it('shows a success message and success status', () => {
    render(<Input label="Slug" defaultValue="hq-team" status="success" message="Адрес свободен" />);
    expect(screen.getByText('Адрес свободен')).toBeInTheDocument();
    expect(document.querySelector('[data-status="success"]')).toBeInTheDocument();
  });

  it('supports success state without a message', () => {
    render(<Input defaultValue="alerts" status="success" aria-label="Поиск" />);
    expect(document.querySelector('[data-status="success"]')).toBeInTheDocument();
    expect(screen.queryByText('Адрес свободен')).not.toBeInTheDocument();
  });

  it('renders hint only when no message is given', () => {
    render(<Input hint="От 3 до 50 символов" aria-label="Поле" />);
    expect(screen.getByText('От 3 до 50 символов')).toBeInTheDocument();
  });

  it('prefers message over hint', () => {
    render(<Input hint="Подсказка" message="Сообщение" aria-label="Поле" />);
    expect(screen.getByText('Сообщение')).toBeInTheDocument();
    expect(screen.queryByText('Подсказка')).not.toBeInTheDocument();
  });

  it('disables the input', () => {
    render(<Input disabled aria-label="Поле" />);
    expect(screen.getByLabelText('Поле')).toBeDisabled();
  });
});
