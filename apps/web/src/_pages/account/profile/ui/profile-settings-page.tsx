'use client';

import { Alert, Skeleton, Typography } from '@/shared/ui';
import { useProfileMe } from '../api/profile';
import { ProfileForm } from './profile-form';

export function ProfileSettingsPage() {
  const profile = useProfileMe();

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
      ) : profile.error ? (
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
      ) : (
        <ProfileForm initial={profile.data} />
      )}
    </main>
  );
}
