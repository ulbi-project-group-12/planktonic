'use client';

import { useState } from 'react';
import { MonitorSmartphone } from 'lucide-react';
import { isApiError } from '@/shared/api';
import { Button, Chip, Modal, Table, type TableColumn, Typography } from '@/shared/ui';
import { useTerminateOtherSessions, useTerminateSession, type AuthSession } from '../api/sessions';
import { formatLastActiveAt, formatSignedInAt } from '../model/session-time';

type RevokeTarget = AuthSession | 'others';

function deviceLabel(session: AuthSession): string {
  return `${session.browser} · ${session.os}`;
}

interface SessionsTableProps {
  sessions: AuthSession[];
  now: Date;
  onError: (message: string) => void;
}

export function SessionsTable({ sessions, now, onError }: SessionsTableProps) {
  const terminateSession = useTerminateSession();
  const terminateOthers = useTerminateOtherSessions();
  const [revokeTarget, setRevokeTarget] = useState<RevokeTarget | null>(null);

  const otherCount = sessions.filter((session) => !session.isCurrent).length;

  const confirmRevoke = () => {
    if (revokeTarget === null) return;
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
      accessor: (session) => deviceLabel(session),
      cell: (session) => (
        <span className="flex min-w-0 items-center gap-2">
          <MonitorSmartphone className="size-4 shrink-0 text-fg-muted" aria-hidden />
          <span className="truncate" title={deviceLabel(session)}>
            {deviceLabel(session)}
          </span>
          {session.isCurrent ? (
            <Chip palette="brand" fill="subtle" className="shrink-0">
              Это устройство
            </Chip>
          ) : null}
        </span>
      ),
    },
    {
      id: 'signedInAt',
      header: 'Вход',
      accessor: (session) => session.signedInAt,
      sortable: true,
      sortType: 'date',
      cell: (session) => (
        <span title={formatSignedInAt(session.signedInAt, now)}>
          {formatSignedInAt(session.signedInAt, now)}
        </span>
      ),
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
        session.isCurrent ? null : (
          <Button
            variant="subtle"
            palette="danger"
            size="s"
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
