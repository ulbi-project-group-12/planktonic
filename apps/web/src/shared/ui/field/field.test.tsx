import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Checkbox } from '@/shared/ui/checkbox';
import { Input } from '@/shared/ui/input';
import { Field } from './field';

describe('Field', () => {
  it('finds the control by its label', () => {
    render(
      <Field label="Email">
        <Input />
      </Field>,
    );
    expect(screen.getByRole('textbox', { name: 'Email' })).toBeInTheDocument();
  });

  it('generates an id for the control and points the label at it', () => {
    render(
      <Field label="Email">
        <Input />
      </Field>,
    );
    const input = screen.getByRole('textbox', { name: 'Email' });
    expect(input.id).not.toBe('');
    expect(screen.getByText('Email')).toHaveAttribute('for', input.id);
  });

  it('links the hint via aria-describedby', () => {
    render(
      <Field label="Email" hint="Мы не передаём адрес третьим лицам">
        <Input />
      </Field>,
    );
    expect(screen.getByRole('textbox', { name: 'Email' })).toHaveAccessibleDescription(
      'Мы не передаём адрес третьим лицам',
    );
  });

  it('links the error, sets aria-invalid and keeps the hint description', () => {
    render(
      <Field label="Email" hint="Формат user@example.com" error="Этот адрес уже занят">
        <Input status="error" />
      </Field>,
    );
    const input = screen.getByRole('textbox', { name: 'Email' });
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('Формат user@example.com Этот адрес уже занят');
  });

  it('keeps an external aria-describedby of the control together with the error', () => {
    render(
      <>
        <Field label="Email" error="Этот адрес уже занят">
          <Input aria-describedby="external-help" />
        </Field>
        <p id="external-help">Внешнее описание</p>
      </>,
    );
    expect(screen.getByRole('textbox', { name: 'Email' })).toHaveAccessibleDescription(
      'Внешнее описание Этот адрес уже занят',
    );
  });

  it('respects the control id given explicitly', () => {
    render(
      <Field label="Email">
        <Input id="signup-email" />
      </Field>,
    );
    expect(screen.getByRole('textbox', { name: 'Email' })).toHaveAttribute('id', 'signup-email');
  });

  it('marks the label required', () => {
    render(
      <Field label="Пароль" required>
        <Input type="password" />
      </Field>,
    );
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('labels a checkbox and toggles it by clicking the label', async () => {
    const user = userEvent.setup();
    render(
      <Field label="Принимаю условия">
        <Checkbox onCheckedChange={() => {}} />
      </Field>,
    );
    await user.click(screen.getByText('Принимаю условия'));
    expect(screen.getByRole('checkbox')).toHaveAttribute('data-state', 'checked');
  });

  it('passes aria props down to a native select control', () => {
    render(
      <Field label="Направление" error="Выберите направление">
        <select>
          <option>Разработка</option>
        </select>
      </Field>,
    );
    const select = screen.getByRole('combobox', { name: 'Направление' });
    expect(select).toHaveAttribute('aria-invalid', 'true');
    expect(select).toHaveAccessibleDescription('Выберите направление');
  });
});
