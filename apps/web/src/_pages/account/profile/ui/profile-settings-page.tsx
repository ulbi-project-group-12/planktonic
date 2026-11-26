'use client';

import { useAuthMe } from '@/shared/api';
import { Alert, Skeleton, Typography } from '@/shared/ui';
import { ProfileForm } from './profile-form';

export function ProfileSettingsPage() {
  const profile = useAuthMe();

  return (
    <main className="mx-auto flex min-h-[calc(100svh-4rem)] w-full max-w-2xl flex-col gap-6 p-6 desktop-s:p-8">
      <div className="flex flex-col gap-1">
        <Typography as="h1" size="h3">
          Настройки профиля
        </Typography>
        <Typography as="p" size="body-s" color="text-secondary">
          Имя и часовой пояс — имя видят коллеги, пояс используется для дат и уведомлений
        </Typography>
      </div>

      {profile.isPending ? (
        <div className="flex flex-col gap-3" aria-label="Загрузка профиля">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : profile.data ? (
        // A background refetch error must not unmount the form and drop unsaved edits.
        <>
          {profile.error ? (
            <Alert
              palette="warning"
              title="Не удалось обновить данные профиля"
              description="Показаны данные последней загрузки. Проверьте подключение и попробуйте ещё раз."
              action={{
                label: 'Повторить',
                onClick: () => {
                  void profile.refetch();
                },
              }}
            />
          ) : null}
          <ProfileForm initial={profile.data} />
        </>
      ) : (
        <Alert
          palette="danger"
          title="Не удалось загрузить профиль"
          description="Проверьте подключение и попробуйте ещё раз."
          action={{
            label: 'Повторить',
            onClick: () => {
              void profile.refetch();
            },
          }}
        />
      )}
    </main>
  );
}
