import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Badge } from './badge';

describe('Badge', () => {
  it('renders a count badge', () => {
    render(<Badge count={3} />);
    const badge = screen.getByText('3');
    expect(badge).toHaveAttribute('data-slot', 'badge');
    expect(badge).toHaveClass('bg-brand-primary');
  });

  it('caps the count at 99+', () => {
    render(<Badge count={128} />);
    expect(screen.getByText('99+')).toBeInTheDocument();
  });

  it('renders a mention badge', () => {
    render(<Badge count={4} mention />);
    expect(screen.getByText('@4')).toBeInTheDocument();
  });

  it('renders a dot without text', () => {
    render(<Badge dot variant="success" />);
    const dot = screen.getByText((_, el) => el?.getAttribute('data-slot') === 'badge');
    expect(dot.textContent).toBe('');
    expect(dot).toHaveClass('bg-success', 'size-2');
  });

  it('renders a muted badge', () => {
    render(<Badge count={7} variant="muted" />);
    expect(screen.getByText('7')).toHaveClass('bg-sunken', 'text-fg-muted');
  });
});
