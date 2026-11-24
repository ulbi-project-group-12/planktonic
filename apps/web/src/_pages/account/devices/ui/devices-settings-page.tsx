'use client';

import { useState } from 'react';
import { Alert, Skeleton, Typography } from '@/shared/ui';
import { useAuthSessions } from '../api/sessions';
import { useNow } from '../model/use-now';
import { SessionsTable } from './sessions-table';

export function DevicesSettingsPage() {
  const sessions = useAuthSessions();
  const now = useNow();
  const [actionError, setActionError] = useState<string>();

  return (
    <main className="mx-auto flex min-h-[calc(100svh-4rem)] w-full max-w-3xl flex-col gap-6 p-6 desktop-s:p-8">
      <div className="flex flex-col gap-1">
        <Typography as="h1" size="h3">
          Устройства
        </Typography>
        <Typography as="p" size="body-s" color="text-secondary">
          Сеансы, через которые сейчас можно работать в аккаунте
        </Typography>
      </div>

      {sessions.isPending ? (
        <div className="flex flex-col gap-3" aria-label="Загрузка списка сессий">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : sessions.error ? (
        <Alert
          palette="danger"
          title="Не удалось загрузить устройства"
          description="Проверьте подключение и попробуйте ещё раз."
          action={{
            label: 'Повторить',
            onClick: () => {
              void sessions.refetch();
            },
          }}
        />
      ) : (
        <>
          {actionError ? (
            <Alert palette="danger" title="Не удалось завершить сессию" description={actionError} />
          ) : null}
          <SessionsTable sessions={sessions.data} now={now} onError={setActionError} />
        </>
      )}
    </main>
  );
}
