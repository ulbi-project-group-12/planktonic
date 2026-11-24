import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import { describe, expect, it } from 'vitest';
import { server } from '@/shared/api-mocks-node';
import { renderWithApi } from '@/shared/lib/testing';
import type { AuthSession } from '../api/sessions';
import { DevicesSettingsPage } from './devices-settings-page';

const current: AuthSession = {
  id: 'session-current',
  browser: 'Chrome 130',
  os: 'Windows 11',
  signedInAt: '2026-11-20T10:00:00Z',
  lastActiveAt: new Date(Date.now() - 60_000).toISOString(),
  isCurrent: true,
};

const phone: AuthSession = {
  id: 'session-phone',
  browser: 'Safari 18',
  os: 'iOS 18',
  signedInAt: '2026-11-19T09:00:00Z',
  lastActiveAt: new Date(Date.now() - 3 * 60 * 60_000).toISOString(),
  isCurrent: false,
};

const desktop: AuthSession = {
  id: 'session-desktop',
  browser: 'Firefox 132',
  os: 'Ubuntu 24.04',
  signedInAt: '2026-11-01T09:00:00Z',
  lastActiveAt: new Date(Date.now() - 26 * 60 * 60_000).toISOString(),
  isCurrent: false,
};

/** Stateful GET + DELETE mock over a test-owned list; the default handlers stay untouched. */
function mockSessions(initial: AuthSession[]) {
  const sessions = [...initial];
  server.use(
    http.get('*/api/auth/sessions', () => HttpResponse.json(sessions)),
    http.delete('*/api/auth/sessions/:sessionId', ({ params }) => {
      const index = sessions.findIndex((session) => session.id === params.sessionId);
      if (index === -1) return new HttpResponse(null, { status: 404 });
      sessions.splice(index, 1);
      return new HttpResponse(null, { status: 204 });
    }),
    http.delete('*/api/auth/sessions', () => {
      sessions.splice(0, sessions.length, ...sessions.filter((s) => s.isCurrent));
      return new HttpResponse(null, { status: 204 });
    }),
  );
}

function rowOf(text: string) {
  const row = screen.getByText(text).closest('[role="row"]');
  expect(row).not.toBeNull();
  return row as HTMLElement;
}

describe('DevicesSettingsPage', () => {
  it('lists the sessions and marks only the current device', async () => {
    mockSessions([current, phone, desktop]);
    renderWithApi(<DevicesSettingsPage />);

    expect(await screen.findByText('Chrome 130 · Windows 11')).toBeVisible();
    expect(screen.getByText('Safari 18 · iOS 18')).toBeVisible();
    expect(screen.getByText('Firefox 132 · Ubuntu 24.04')).toBeVisible();
    expect(screen.getAllByText('Это устройство')).toHaveLength(1);

    const currentRow = rowOf('Это устройство');
    expect(within(currentRow).queryByRole('button', { name: 'Завершить' })).toBeNull();
    expect(
      within(rowOf('Safari 18 · iOS 18')).getByRole('button', { name: 'Завершить' }),
    ).toBeVisible();
  });

  it('shows relative activity and falls back to a date after a day', async () => {
    mockSessions([current, phone, desktop]);
    renderWithApi(<DevicesSettingsPage />);

    expect(await screen.findByText('1 минуту назад')).toBeVisible();
    expect(screen.getByText('3 часа назад')).toBeVisible();
    // Older than a day: absolute date, not "26 часов назад" — both columns render dates.
    expect(within(rowOf('Firefox 132 · Ubuntu 24.04')).getAllByText(/ноября в/)).toHaveLength(2);
  });

  it('asks for confirmation before ending a session and removes the row', async () => {
    mockSessions([current, phone, desktop]);
    const user = userEvent.setup();
    renderWithApi(<DevicesSettingsPage />);

    await screen.findByText('Safari 18 · iOS 18');
    await user.click(
      within(rowOf('Safari 18 · iOS 18')).getByRole('button', {
        name: 'Завершить',
      }),
    );

    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('Завершить сессию?');
    expect(dialog).toHaveTextContent('Safari 18 · iOS 18');

    await user.click(within(dialog).getByRole('button', { name: 'Завершить' }));

    await waitFor(() => {
      expect(screen.queryByText('Safari 18 · iOS 18')).not.toBeInTheDocument();
    });
    expect(screen.getByText('Chrome 130 · Windows 11')).toBeVisible();
    expect(screen.getByText('Firefox 132 · Ubuntu 24.04')).toBeVisible();
  });

  it('keeps the session when the confirmation is cancelled', async () => {
    mockSessions([current, phone]);
    const user = userEvent.setup();
    renderWithApi(<DevicesSettingsPage />);

    await screen.findByText('Safari 18 · iOS 18');
    await user.click(
      within(rowOf('Safari 18 · iOS 18')).getByRole('button', {
        name: 'Завершить',
      }),
    );
    await user.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: 'Отмена' }),
    );

    expect(screen.getByText('Safari 18 · iOS 18')).toBeVisible();
  });

  it('ends every session but the current one', async () => {
    mockSessions([current, phone, desktop]);
    const user = userEvent.setup();
    renderWithApi(<DevicesSettingsPage />);

    await user.click(await screen.findByRole('button', { name: 'Завершить все, кроме текущего' }));

    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('Завершить все остальные сессии?');
    await user.click(within(dialog).getByRole('button', { name: 'Завершить' }));

    await waitFor(() => {
      expect(screen.queryByText('Safari 18 · iOS 18')).not.toBeInTheDocument();
      expect(screen.queryByText('Firefox 132 · Ubuntu 24.04')).not.toBeInTheDocument();
    });
    expect(screen.getByText('Chrome 130 · Windows 11')).toBeVisible();
    // Nothing left to revoke: the bulk action is gone too.
    expect(
      screen.queryByRole('button', { name: 'Завершить все, кроме текущего' }),
    ).not.toBeInTheDocument();
  });

  it('hides "end all" when the current session is the only one', async () => {
    mockSessions([current]);
    renderWithApi(<DevicesSettingsPage />);

    expect(await screen.findByText('Chrome 130 · Windows 11')).toBeVisible();
    expect(
      screen.queryByRole('button', { name: 'Завершить все, кроме текущего' }),
    ).not.toBeInTheDocument();
  });

  it('offers a retry after a failed load', async () => {
    let calls = 0;
    server.use(
      http.get('*/api/auth/sessions', () => {
        calls += 1;
        return calls === 1
          ? HttpResponse.json({ statusCode: 500 }, { status: 500 })
          : HttpResponse.json([current]);
      }),
    );
    const user = userEvent.setup();
    renderWithApi(<DevicesSettingsPage />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Не удалось загрузить устройства');

    await user.click(screen.getByRole('button', { name: 'Повторить' }));
    expect(await screen.findByText('Chrome 130 · Windows 11')).toBeVisible();
  });

  it('shows a banner when ending a session fails and keeps the row', async () => {
    mockSessions([current, phone]);
    server.use(
      http.delete('*/api/auth/sessions/:sessionId', () =>
        HttpResponse.json({ statusCode: 500 }, { status: 500 }),
      ),
    );
    const user = userEvent.setup();
    renderWithApi(<DevicesSettingsPage />);

    await screen.findByText('Safari 18 · iOS 18');
    await user.click(
      within(rowOf('Safari 18 · iOS 18')).getByRole('button', {
        name: 'Завершить',
      }),
    );
    await user.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: 'Завершить' }),
    );

    expect(await screen.findByRole('alert')).toHaveTextContent('Не удалось завершить сессию');
    expect(screen.getByText('Safari 18 · iOS 18')).toBeVisible();
  });
});
