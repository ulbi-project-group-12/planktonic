import { PRODUCT_DISPLAY_NAME } from '@app/config/product';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

  it('opens a dialog with a visible title and closes it again', async () => {
    render(<HomePage />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'About this skeleton' }));
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeVisible();
    expect(screen.getByRole('heading', { name: 'About this skeleton' })).toBeVisible();
    expect(dialog).toHaveAccessibleName('About this skeleton');

    await userEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
