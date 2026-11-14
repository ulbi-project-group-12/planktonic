import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Input } from './input';

describe('Input', () => {
  it('passes aria-invalid through to the input element', () => {
    render(<Input aria-label="Email" aria-invalid />);
    expect(screen.getByRole('textbox', { name: 'Email' })).toHaveAttribute('aria-invalid', 'true');
  });

  it('is disabled when disabled', () => {
    render(<Input aria-label="Email" disabled />);
    expect(screen.getByRole('textbox', { name: 'Email' })).toBeDisabled();
  });
});
