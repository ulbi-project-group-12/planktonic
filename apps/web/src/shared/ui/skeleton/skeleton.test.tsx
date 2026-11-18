import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Skeleton } from './skeleton';

describe('Skeleton', () => {
  it('renders a sunken rounded block', () => {
    const { container } = render(<Skeleton className="h-4 w-32" />);
    const skeleton = container.firstChild;
    expect(skeleton).toHaveAttribute('data-slot', 'skeleton');
    expect(skeleton).toHaveAttribute('aria-hidden', 'true');
    expect(skeleton).toHaveClass('bg-sunken', 'rounded-sm', 'h-4', 'w-32');
  });

  it('stops pulsing under prefers-reduced-motion', () => {
    const { container } = render(<Skeleton />);
    expect(container.firstChild).toHaveClass('animate-pulse', 'motion-reduce:animate-none');
  });
});
