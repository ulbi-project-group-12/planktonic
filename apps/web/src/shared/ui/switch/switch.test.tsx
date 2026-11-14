import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Switch } from './switch';

describe('Switch', () => {
  it('toggles by click when uncontrolled', async () => {
    render(<Switch defaultChecked={false} aria-label="переключатель" />);
    const switcher = screen.getByRole('switch');
    expect(switcher).toHaveAttribute('data-state', 'unchecked');
    await userEvent.click(switcher);
    expect(switcher).toHaveAttribute('data-state', 'checked');
  });

  it('calls onCheckedChange without changing state when controlled', async () => {
    const onCheckedChange = vi.fn();
    render(<Switch checked onCheckedChange={onCheckedChange} aria-label="переключатель" />);
    const switcher = screen.getByRole('switch');
    await userEvent.click(switcher);
    expect(onCheckedChange).toHaveBeenCalledWith(false);
    expect(switcher).toHaveAttribute('data-state', 'checked');
  });

  it('does not toggle when disabled', async () => {
    const onCheckedChange = vi.fn();
    render(<Switch disabled onCheckedChange={onCheckedChange} aria-label="переключатель" />);
    await userEvent.click(screen.getByRole('switch'));
    expect(onCheckedChange).not.toHaveBeenCalled();
  });

  it('toggles by clicking the label', async () => {
    render(<Switch defaultChecked label="Приватный" />);
    await userEvent.click(screen.getByText('Приватный'));
    expect(screen.getByRole('switch')).toHaveAttribute('data-state', 'unchecked');
  });
});
