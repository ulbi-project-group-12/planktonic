import { PRODUCT_DISPLAY_NAME } from '@app/config/product';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { HomePage } from './home-page';

describe('HomePage', () => {
  it('shows the product name from the single source as the heading', () => {
    render(<HomePage />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(PRODUCT_DISPLAY_NAME);
  });

  it('renders the "About this skeleton" button', () => {
    render(<HomePage />);
    expect(screen.getByRole('button', { name: 'About this skeleton' })).toBeInTheDocument();
  });
});
