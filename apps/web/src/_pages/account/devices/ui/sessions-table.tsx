'use client';

import { useState } from 'react';
import { MonitorSmartphone } from 'lucide-react';
import { isApiError } from '@/shared/api';
import { Button, Chip, Modal, Table, type TableColumn, Typography } from '@/shared/ui';
import { useTerminateOtherSessions, useTerminateSession, type AuthSession } from '../api/sessions';
import { formatLastActiveAt, formatSignedInAt } from '../model/session-time';

type RevokeTarget = AuthSession | 'others';

/** "Chrome 130 · Windows 11"; the server sends null for what it could not read from User-Agent. */
function deviceLabel(session: AuthSession): string {
  const parts = [session.browser, session.os].filter(Boolean);
  return parts.length > 0 ? parts.join(' · ') : 'Неизвестное устройство';
}

interface SessionsTableProps {
  sessions: AuthSession[];
  now: Date;
  /** The message of a failed action; `undefined` when the next attempt starts. */
  onError: (message: string | undefined) => void;
}

export function SessionsTable({ sessions, now, onError }: SessionsTableProps) {
  const terminateSession = useTerminateSession();
  const terminateOthers = useTerminateOtherSessions();
  const [revokeTarget, setRevokeTarget] = useState<RevokeTarget | null>(null);

  const otherCount = sessions.filter((session) => !session.isCurrent).length;
  // One action at a time: every "end" button is locked until the list has been reloaded, so a
  // second click cannot send the same DELETE again or race the first one.
  const isRevoking = terminateSession.isPending || terminateOthers.isPending;
  const isRevokingSession = (session: AuthSession) =>
    terminateSession.isPending && terminateSession.variables === session.id;

  const confirmRevoke = () => {
    if (revokeTarget === null || isRevoking) return;
    onError(undefined);
    const request =
      revokeTarget === 'others'
        ? terminateOthers.mutateAsync()
        : terminateSession.mutateAsync(revokeTarget.id);
    setRevokeTarget(null);
    request.catch((error: unknown) => {
      onError(
        isApiError(error)
          ? 'Сервер ответил ошибкой. Попробуйте ещё раз чуть позже.'
          : 'Проверьте подключение к сети и попробуйте ещё раз.',
      );
    });
  };

  const columns: TableColumn<AuthSession>[] = [
    {
      id: 'device',
      header: 'Устройство',
      // The longest text of the row: takes more of the free width than the two dates.
      width: 'minmax(160px, 1.5fr)',
      accessor: (session) => deviceLabel(session),
      cell: (session) => (
        <span className="flex min-w-0 items-center gap-2">
          <MonitorSmartphone className="size-4 shrink-0 text-fg-muted" aria-hidden />
          <span className="truncate" title={deviceLabel(session)}>
            {deviceLabel(session)}
          </span>
        </span>
      ),
    },
    {
      id: 'signedInAt',
      header: 'Вход',
      accessor: (session) => session.signedInAt,
      sortable: true,
      sortType: 'date',
      cell: (session) => formatSignedInAt(session.signedInAt, now),
    },
    {
      id: 'lastActiveAt',
      header: 'Активность',
      accessor: (session) => session.lastActiveAt,
      sortable: true,
      sortType: 'date',
      cell: (session) => (
        <span title={formatSignedInAt(session.lastActiveAt, now)}>
          {formatLastActiveAt(session.lastActiveAt, now)}
        </span>
      ),
    },
    {
      id: 'revoke',
      header: '',
      width: 132,
      align: 'right',
      cell: (session) =>
        // The mark takes the place of the button: next to the name it left the name three letters.
        session.isCurrent ? (
          <Chip palette="brand" fill="subtle">
            Это устройство
          </Chip>
        ) : (
          <Button
            variant="subtle"
            palette="danger"
            size="s"
            loading={isRevokingSession(session)}
            disabled={isRevoking}
            aria-label={`Завершить сессию: ${deviceLabel(session)}`}
            onClick={() => {
              setRevokeTarget(session);
            }}
          >
            Завершить
          </Button>
        ),
    },
  ];

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <Typography as="p" size="body-s" color="text-secondary">
          Где вы сейчас вошли в аккаунт. Текущую сессию можно завершить только кнопкой «Выйти».
        </Typography>
        {otherCount > 0 ? (
          <Button
            variant="subtle"
            palette="danger"
            loading={terminateOthers.isPending}
            disabled={isRevoking}
            onClick={() => {
              setRevokeTarget('others');
            }}
          >
            Завершить все, кроме текущего
          </Button>
        ) : null}
      </div>

      <Table
        data={sessions}
        columns={columns}
        rowKey={(session) => session.id}
        caption="Активные сессии"
        empty={
          <div className="px-3 py-8 text-center text-body-s text-fg-muted">Нет активных сессий</div>
        }
      />

      <Modal
        isShown={revokeTarget !== null}
        onClose={() => {
          setRevokeTarget(null);
        }}
        title={revokeTarget === 'others' ? 'Завершить все остальные сессии?' : 'Завершить сессию?'}
        size="s"
        secondaryAction={{
          label: 'Отмена',
          onClick: () => {
            setRevokeTarget(null);
          },
        }}
        primaryAction={{
          label: 'Завершить',
          palette: 'danger',
          onClick: confirmRevoke,
        }}
      >
        {revokeTarget === 'others' ? (
          <>
            Со всех устройств, кроме этого, будет выполнен выход из аккаунта. Войти снова можно в
            любой момент.
          </>
        ) : revokeTarget ? (
          <>
            Устройство «{deviceLabel(revokeTarget)}» выйдет из аккаунта. Войти на нём снова можно в
            любой момент.
          </>
        ) : null}
      </Modal>
    </section>
  );
}
