import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Button } from './button';

describe('Button', () => {
  it('calls onClick once per click when enabled', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Save</Button>);
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onClick).toHaveBeenCalledTimes(2);
  });

  it('is disabled and ignores clicks when disabled', async () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Save
      </Button>,
    );
    const button = screen.getByRole('button', { name: 'Save' });
    expect(button).toBeDisabled();
    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('renders variant, palette and size data attributes', () => {
    render(
      <Button variant="subtle" palette="success" size="l">
        Принять
      </Button>,
    );
    const button = screen.getByRole('button', { name: 'Принять' });
    expect(button).toHaveAttribute('data-variant', 'subtle');
    expect(button).toHaveAttribute('data-palette', 'success');
    expect(button).toHaveAttribute('data-size', 'l');
  });

  it('shows a spinner and a loading label when loading', () => {
    render(<Button loading>Save</Button>);
    const button = screen.getByRole('button', { name: /Save/ });
    expect(button).toHaveAttribute('data-loading', 'true');
    expect(button).toHaveAttribute('aria-busy', 'true');
  });

  it('falls back to a default loading label when no children', () => {
    render(<Button loading />);
    expect(screen.getByText('Загрузка…')).toBeInTheDocument();
  });

  it('keeps full opacity styles for loading state', () => {
    render(<Button loading>Save</Button>);
    expect(screen.getByRole('button')).not.toBeDisabled();
  });
});
