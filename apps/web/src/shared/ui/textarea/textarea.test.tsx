import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Textarea } from './textarea';

describe('Textarea', () => {
  it('renders with placeholder', () => {
    render(<Textarea placeholder="Расскажите о проекте" aria-label="Описание" />);
    expect(screen.getByLabelText('Описание')).toHaveAttribute(
      'placeholder',
      'Расскажите о проекте',
    );
  });

  it('links the label to the field', () => {
    render(<Textarea label="Описание" />);
    expect(screen.getByLabelText('Описание')).toBeInTheDocument();
  });

  it('accepts typing', async () => {
    const user = userEvent.setup();
    render(<Textarea label="Описание" />);
    const textarea = screen.getByLabelText('Описание');
    await user.type(textarea, 'Привет');
    expect(textarea).toHaveValue('Привет');
  });

  it('shows an error message, links it and sets aria-invalid', () => {
    render(<Textarea label="Описание" status="error" message="Текст слишком короткий" />);
    const textarea = screen.getByLabelText('Описание');
    expect(textarea).toHaveAttribute('aria-invalid', 'true');
    expect(textarea).toHaveAccessibleDescription('Текст слишком короткий');
  });

  it('links the hint to the field', () => {
    render(<Textarea label="Описание" hint="2–3 предложения" />);
    expect(screen.getByLabelText('Описание')).toHaveAccessibleDescription('2–3 предложения');
  });

  it('prefers message over hint', () => {
    render(<Textarea label="Описание" hint="Подсказка" message="Сообщение" />);
    expect(screen.getByLabelText('Описание')).toHaveAccessibleDescription('Сообщение');
    expect(screen.queryByText('Подсказка')).not.toBeInTheDocument();
  });

  it('keeps an external aria-describedby together with the hint', () => {
    render(
      <>
        <Textarea label="Описание" hint="Подсказка" aria-describedby="external-help" />
        <p id="external-help">Внешнее описание</p>
      </>,
    );
    expect(screen.getByLabelText('Описание')).toHaveAccessibleDescription(
      'Внешнее описание Подсказка',
    );
  });

  it('renders disabled', () => {
    render(<Textarea label="Описание" disabled />);
    expect(screen.getByLabelText('Описание')).toBeDisabled();
  });
});
