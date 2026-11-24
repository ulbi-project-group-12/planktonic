import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { server } from '@/shared/api-mocks-node';
import { renderWithApi } from '@/shared/lib/testing';
import { ConfirmEmailCard } from './confirm-email-card';

const push = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));

const resendButton = () => screen.getByRole('button', { name: 'Отправить ещё раз' });

async function renderSignedIn() {
  renderWithApi(<ConfirmEmailCard />);
  // The resend UI appears once the profile answers with the address.
  await screen.findByText('ada@example.com');
}

describe('ConfirmEmailCard', () => {
  beforeEach(() => {
    push.mockClear();
  });

  it('shows the email the account is registered with', async () => {
    await renderSignedIn();

    expect(screen.getByText('Подтвердите email')).toBeVisible();
    expect(screen.getByText('ada@example.com')).toBeVisible();
    expect(resendButton()).toBeEnabled();
    expect(screen.getByText(/Проверьте папку «Спам»/)).toBeVisible();
  });

  it('resends once and locks the button for the pause the api reports', async () => {
    let calls = 0;
    server.use(
      http.post('*/api/auth/verify-email/resend', () => {
        calls += 1;
        return HttpResponse.json({ resendAfterSec: 30 });
      }),
    );
    const user = userEvent.setup();
    await renderSignedIn();

    await user.click(resendButton());

    expect(calls).toBe(1);
    expect(resendButton()).toBeDisabled();
    expect(screen.getByText('Можно отправить повторно через 30 с')).toBeVisible();
    // A press on the locked button does not send again.
    await user.click(resendButton());
    expect(calls).toBe(1);
  });

  it('takes the wait from a 429 the api answers with', async () => {
    server.use(
      http.post('*/api/auth/verify-email/resend', () =>
        HttpResponse.json(
          { statusCode: 429, message: 'Too many requests', retryAfterSec: 45 },
          { status: 429 },
        ),
      ),
    );
    const user = userEvent.setup();
    await renderSignedIn();

    await user.click(resendButton());

    expect(await screen.findByText('Можно отправить повторно через 45 с')).toBeVisible();
    expect(resendButton()).toBeDisabled();
  });

  it('unlocks the button when the wait ends', async () => {
    // A one-second pause keeps the check on real timers: the countdown chains timeouts through
    // an effect, and a tick scheduled before useFakeTimers() would stay out of fake time anyway.
    server.use(
      http.post('*/api/auth/verify-email/resend', () => HttpResponse.json({ resendAfterSec: 1 })),
    );
    const user = userEvent.setup();
    await renderSignedIn();

    await user.click(resendButton());
    expect(resendButton()).toBeDisabled();
    expect(screen.getByText('Можно отправить повторно через 1 с')).toBeVisible();

    // The tick lands around 1 s — right at the default waitFor timeout.
    await waitFor(
      () => {
        expect(resendButton()).toBeEnabled();
      },
      { timeout: 3000 },
    );
    expect(screen.getByText(/Проверьте папку «Спам»/)).toBeVisible();
  });

  it('shows a banner when the api answers with an error', async () => {
    server.use(
      http.post('*/api/auth/verify-email/resend', () =>
        HttpResponse.json({ statusCode: 500, message: 'Internal server error' }, { status: 500 }),
      ),
    );
    const user = userEvent.setup();
    await renderSignedIn();

    await user.click(resendButton());

    const banner = await screen.findByRole('alert');
    expect(banner).toHaveTextContent('Не удалось отправить письмо');
    expect(banner).toHaveTextContent('Сервер ответил ошибкой');
    // A failed try does not lock the button.
    expect(resendButton()).toBeEnabled();
  });

  it('shows a banner on a network error', async () => {
    server.use(http.post('*/api/auth/verify-email/resend', () => HttpResponse.error()));
    const user = userEvent.setup();
    await renderSignedIn();

    await user.click(resendButton());

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Проверьте подключение к сети и попробуйте ещё раз.',
    );
  });

  it('asks a guest to sign in instead of offering a resend', async () => {
    server.use(
      http.get('*/api/auth/me', () =>
        HttpResponse.json({ statusCode: 401, message: 'Unauthorized' }, { status: 401 }),
      ),
    );
    renderWithApi(<ConfirmEmailCard />);

    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Войти' }));

    expect(push).toHaveBeenCalledWith('/login');
    expect(screen.queryByRole('button', { name: 'Отправить ещё раз' })).not.toBeInTheDocument();
  });

  it('offers a retry when the profile fails to load', async () => {
    server.use(
      http.get('*/api/auth/me', () =>
        HttpResponse.json({ statusCode: 500, message: 'Internal server error' }, { status: 500 }),
      ),
    );
    renderWithApi(<ConfirmEmailCard />);

    const banner = await screen.findByRole('alert');
    expect(banner).toHaveTextContent('Не удалось загрузить профиль');
    expect(screen.getByRole('button', { name: 'Повторить' })).toBeVisible();
  });
});
