import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Separator } from './separator';

describe('Separator', () => {
  it('renders a decorative horizontal rule hidden from assistive tech', () => {
    const { container } = render(<Separator />);
    const line = container.querySelector('[data-slot="separator"]');
    expect(line).toHaveAttribute('data-orientation', 'horizontal');
    // decorative → role="none" (Radix), so the rule is not exposed as a landmark
    expect(line).toHaveAttribute('role', 'none');
    expect(screen.queryByRole('separator')).toBeNull();
  });

  it('exposes role=separator when decorative is false', () => {
    render(<Separator decorative={false} />);
    // horizontal is the default orientation — aria-orientation is omitted
    expect(screen.getByRole('separator')).not.toHaveAttribute('aria-orientation');
  });

  it('maps tones to token classes and thickness', () => {
    const { container, rerender } = render(<Separator />);
    const line = () => container.querySelector('[data-slot="separator"]');
    expect(line()).toHaveClass('bg-line');
    rerender(<Separator tone="strong" />);
    expect(line()).toHaveClass('bg-line-strong');
    rerender(<Separator tone="thick" />);
    expect(line()).toHaveClass('bg-line', 'h-[2px]');
    rerender(<Separator tone="brand" />);
    expect(line()).toHaveClass('bg-brand-primary', 'h-[2px]');
  });

  it('renders a centered caption between two line halves', () => {
    render(<Separator>или</Separator>);
    expect(screen.getByText('или')).toBeInTheDocument();
    const wrapper = screen.getByText('или').closest('[data-slot="separator-labeled"]');
    expect(wrapper?.querySelectorAll('[data-slot="separator"]')).toHaveLength(2);
  });

  it('uppercases a section label', () => {
    render(<Separator section>Новые</Separator>);
    expect(screen.getByText('Новые')).toHaveClass('uppercase');
  });
});
