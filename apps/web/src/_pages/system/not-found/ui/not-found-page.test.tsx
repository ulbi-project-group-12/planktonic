import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { NotFoundPage } from './not-found-page';

describe('NotFoundPage', () => {
  it('links back to the landing page', () => {
    render(<NotFoundPage />);
    expect(screen.getByRole('heading', { name: '404' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'На главную' })).toHaveAttribute('href', '/');
  });
});
