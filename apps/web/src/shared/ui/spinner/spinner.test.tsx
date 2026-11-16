import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Spinner, spinnerSizes } from './spinner';

describe('Spinner', () => {
  it('renders with an accessible label', () => {
    render(<Spinner />);
    expect(screen.getByLabelText('Загрузка')).toHaveAttribute('data-slot', 'spinner');
  });

  it('maps each size to a class', () => {
    for (const size of spinnerSizes) {
      const { container, unmount } = render(<Spinner size={size} />);
      expect(container.firstChild).toHaveAttribute('data-size', size);
      unmount();
    }
  });

  it('spins with a 0.8s linear animation', () => {
    render(<Spinner />);
    expect(screen.getByLabelText('Загрузка')).toHaveClass('animate-[spin_0.8s_linear_infinite]');
  });
});
