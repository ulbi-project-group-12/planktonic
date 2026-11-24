import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderWithApi } from '@/shared/lib/testing';
import { VerifyEmailContent } from './verify-email-content';

let search = '';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(search),
}));

describe('VerifyEmailContent', () => {
  it('shows the "confirm your email" screen without a token', async () => {
    search = '';
    renderWithApi(<VerifyEmailContent />);

    expect(await screen.findByText('Подтвердите email')).toBeVisible();
  });

  it('shows the link page with a token', async () => {
    search = 'token=valid';
    renderWithApi(<VerifyEmailContent />);

    expect(await screen.findByText('Email подтверждён')).toBeVisible();
  });
});
