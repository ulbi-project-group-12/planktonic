import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Checkbox } from './checkbox';

describe('Checkbox', () => {
  it('toggles by click when uncontrolled', async () => {
    render(<Checkbox defaultChecked={false} aria-label="чекбокс" />);
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toHaveAttribute('data-state', 'unchecked');
    await userEvent.click(checkbox);
    expect(checkbox).toHaveAttribute('data-state', 'checked');
  });

  it('calls onCheckedChange without changing state when controlled', async () => {
    const onCheckedChange = vi.fn();
    render(<Checkbox checked={false} onCheckedChange={onCheckedChange} aria-label="чекбокс" />);
    const checkbox = screen.getByRole('checkbox');
    await userEvent.click(checkbox);
    expect(onCheckedChange).toHaveBeenCalledWith(true);
    expect(checkbox).toHaveAttribute('data-state', 'unchecked');
  });

  it('does not toggle when disabled', async () => {
    const onCheckedChange = vi.fn();
    render(<Checkbox disabled onCheckedChange={onCheckedChange} aria-label="чекбокс" />);
    await userEvent.click(screen.getByRole('checkbox'));
    expect(onCheckedChange).not.toHaveBeenCalled();
  });

  it('toggles by clicking the label', async () => {
    render(<Checkbox defaultChecked={false} label="Уведомления" />);
    await userEvent.click(screen.getByText('Уведомления'));
    expect(screen.getByRole('checkbox')).toHaveAttribute('data-state', 'checked');
  });

  it('пробрасывает aria-label на чекбокс без подписи', () => {
    render(<Checkbox checked aria-label="Принимаю условия" />);
    expect(screen.getByRole('checkbox', { name: 'Принимаю условия' })).toBeInTheDocument();
  });

  it('toggles with the keyboard: Space', async () => {
    const user = userEvent.setup();
    render(<Checkbox defaultChecked={false} label="Уведомления" />);
    const checkbox = screen.getByRole('checkbox');
    checkbox.focus();
    await user.keyboard(' ');
    expect(checkbox).toHaveAttribute('data-state', 'checked');
    await user.keyboard(' ');
    expect(checkbox).toHaveAttribute('data-state', 'unchecked');
  });

  it('renders a dash in the indeterminate state and keeps checked a plain boolean', () => {
    render(<Checkbox checked={false} indeterminate aria-label="чекбокс" />);
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toHaveAttribute('data-state', 'indeterminate');
    expect(checkbox).toHaveAttribute('aria-checked', 'mixed');
  });
});
