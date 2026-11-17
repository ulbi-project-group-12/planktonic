import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Progress } from './progress';

describe('Progress', () => {
  it('renders a track with a brand indicator', () => {
    const { container } = render(<Progress value={60} aria-label="Загрузка файла" />);
    const root = container.firstChild;
    expect(root).toHaveAttribute('data-slot', 'progress');
    expect(root).toHaveAttribute('aria-valuenow', '60');
    expect(root).toHaveClass('bg-sunken');
    const indicator = root?.firstChild as HTMLElement;
    expect(indicator.style.width).toBe('60%');
    expect(indicator).toHaveClass('bg-brand-primary');
  });

  it('clamps the value to 0–100', () => {
    const { container, rerender } = render(<Progress value={140} />);
    expect(container.firstChild).toHaveAttribute('aria-valuenow', '100');
    rerender(<Progress value={-10} />);
    expect(container.firstChild).toHaveAttribute('aria-valuenow', '0');
  });
});
