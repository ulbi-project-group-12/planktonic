import { screen } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { server } from '@/shared/api-mocks-node';
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

  it('confirms the new token when the token in the address changes', async () => {
    // The mock's 'valid' token is single-use and the test above spent it.
    server.use(
      http.post('*/api/auth/verify-email', async ({ request }) => {
        const { token } = (await request.json()) as { token: string };
        return token === 'second-link'
          ? HttpResponse.json({ status: 'confirmed' })
          : HttpResponse.json({ statusCode: 410, message: 'Gone' }, { status: 410 });
      }),
    );
    search = 'token=first-link';
    const { rerender } = renderWithApi(<VerifyEmailContent />);
    expect(await screen.findByText('Ссылка недействительна')).toBeVisible();

    // A client-side navigation to another link keeps the page mounted.
    search = 'token=second-link';
    rerender(<VerifyEmailContent />);

    expect(await screen.findByText('Email подтверждён')).toBeVisible();
  });
});
