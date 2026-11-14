import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Typography } from './typography';

describe('Typography', () => {
  it('renders the size, color and weight token classes', () => {
    render(
      <Typography size="6xl" color="fg-muted" weight="700">
        Заголовок
      </Typography>,
    );
    const element = screen.getByText('Заголовок');
    expect(element).toHaveClass('text-6xl');
    expect(element).toHaveClass('text-fg-muted');
    expect(element).toHaveClass('font-bold');
    expect(element).toHaveAttribute('data-size', '6xl');
    expect(element).toHaveAttribute('data-color', 'fg-muted');
    expect(element).toHaveAttribute('data-weight', '700');
  });

  it('renders as the requested element', () => {
    render(<Typography as="h2">Заголовок</Typography>);
    expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument();
  });

  it('defaults to body size, regular weight and primary text color', () => {
    render(<Typography>Текст</Typography>);
    const element = screen.getByText('Текст');
    expect(element).toHaveClass('text-sm');
    expect(element).toHaveClass('text-fg-primary');
    expect(element).toHaveClass('font-normal');
  });
});
