import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Label } from './label';

describe('Label', () => {
  it('renders the text', () => {
    render(<Label>Email</Label>);
    expect(screen.getByText('Email')).toBeInTheDocument();
  });

  it('links to a control via htmlFor', () => {
    render(
      <>
        <Label htmlFor="email">Email</Label>
        <input id="email" />
      </>,
    );
    expect(screen.getByLabelText('Email')).toHaveAttribute('id', 'email');
  });

  it('marks required fields with an asterisk', () => {
    render(<Label required>Пароль</Label>);
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('renders muted when disabled', () => {
    render(<Label disabled>Название</Label>);
    expect(screen.getByText('Название')).toHaveClass('text-fg-muted');
  });
});
