import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { server } from '@/shared/api-mocks-node';
import { renderWithApi } from '@/shared/lib/testing';
import { VerifyLinkCard } from './verify-link-card';

const push = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));

describe('VerifyLinkCard', () => {
  beforeEach(() => {
    push.mockClear();
  });

  it('confirms the token from the link and offers to sign in', async () => {
    let posted: unknown;
    server.use(
      http.post('*/api/auth/verify-email', async ({ request }) => {
        posted = await request.json();
        return HttpResponse.json({ status: 'confirmed' });
      }),
    );
    const user = userEvent.setup();
    renderWithApi(<VerifyLinkCard token="link-token" />);

    expect(await screen.findByText('Email подтверждён')).toBeVisible();
    expect(posted).toEqual({ token: 'link-token' });

    await user.click(screen.getByRole('button', { name: 'Войти' }));
    expect(push).toHaveBeenCalledWith('/login');
  });

  it('sends the token once on mount', async () => {
    let calls = 0;
    server.use(
      http.post('*/api/auth/verify-email', () => {
        calls += 1;
        return HttpResponse.json({ status: 'confirmed' });
      }),
    );
    renderWithApi(<VerifyLinkCard token="link-token" />);

    await screen.findByText('Email подтверждён');
    expect(calls).toBe(1);
  });

  it('reads a second open of the same link as already used', async () => {
    // 'valid' is consumed on the first confirm; a remount asks again and gets the 409.
    renderWithApi(<VerifyLinkCard token="valid" />);
    await screen.findByText('Email подтверждён');

    renderWithApi(<VerifyLinkCard token="valid" />);
    await waitFor(() => {
      expect(screen.getAllByText('Ссылка уже использована')).not.toHaveLength(0);
    });
  });

  it('shows the dead-link outcome for an expired token and offers a new letter', async () => {
    const user = userEvent.setup();
    renderWithApi(<VerifyLinkCard token="expired" />);

    expect(await screen.findByText('Ссылка недействительна')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Запросить новую ссылку' }));
    expect(push).toHaveBeenCalledWith('/verify-email');
  });

  it('treats an unknown token as a dead link', async () => {
    renderWithApi(<VerifyLinkCard token="no-such-token" />);

    expect(await screen.findByText('Ссылка недействительна')).toBeVisible();
  });

  it('offers a retry after a network failure and confirms on the second try', async () => {
    let calls = 0;
    server.use(
      http.post('*/api/auth/verify-email', () => {
        calls += 1;
        return calls === 1 ? HttpResponse.error() : HttpResponse.json({ status: 'confirmed' });
      }),
    );
    const user = userEvent.setup();
    renderWithApi(<VerifyLinkCard token="link-token" />);

    const banner = await screen.findByRole('alert');
    expect(banner).toHaveTextContent('Не удалось подтвердить email');
    expect(banner).toHaveTextContent('Проверьте подключение к сети');

    await user.click(screen.getByRole('button', { name: 'Повторить' }));
    expect(await screen.findByText('Email подтверждён')).toBeVisible();
    expect(calls).toBe(2);
  });

  it('shows a server error message when the api answers with an error', async () => {
    server.use(
      http.post('*/api/auth/verify-email', () =>
        HttpResponse.json({ statusCode: 500, message: 'Internal server error' }, { status: 500 }),
      ),
    );
    renderWithApi(<VerifyLinkCard token="link-token" />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Сервер ответил ошибкой');
  });
});
