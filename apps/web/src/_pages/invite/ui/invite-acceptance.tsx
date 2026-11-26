'use client';

import { InviteGoneResponseSchema } from '@app/contracts';
import { useRouter } from 'next/navigation';
import { isApiError } from '@/shared/api';
import { routes } from '@/shared/config';
import { Alert, Button, Link, Skeleton, Spinner, Typography } from '@/shared/ui';
import { WORKSPACE_ROLE_LABEL } from '@/widgets/invite-member';
import { useAcceptInvite, useInvite } from '../api/invite';

interface InviteAcceptanceProps {
  token: string;
}

const inviteGoneTitles = {
  invite_expired: 'Срок действия ссылки истёк',
  invite_consumed: 'Ссылка уже использована',
  invite_revoked: 'Приглашение отозвано',
} as const;

function unavailableInviteTitle(error: unknown): string | undefined {
  if (!isApiError(error)) return;
  if (error.status === 404) return 'Приглашение не найдено';
  if (error.status === 410) {
    const result = InviteGoneResponseSchema.safeParse(error.body);
    return result.success ? inviteGoneTitles[result.data.code] : 'Ссылка больше не действует';
  }
}

export function InviteAcceptance({ token }: InviteAcceptanceProps) {
  const router = useRouter();
  const invite = useInvite(token);
  const accept = useAcceptInvite(token);

  if (accept.data?.outcome === 'already_member') {
    return (
      <div className="flex flex-col gap-4">
        <Typography as="h1" size="h3">
          Вы уже участник этого пространства
        </Typography>
        <Link href={routes.workspace(accept.data.workspaceSlug)}>Открыть пространство</Link>
      </div>
    );
  }

  // The accept consumed the token: the invite query refetches behind our back (its cache
  // entry was dropped) and now fails — but this screen is already leaving, so neither that
  // error nor a reload skeleton may flash before the navigation lands.
  if (accept.isSuccess) {
    return (
      <div className="flex items-center gap-2" role="status">
        <Spinner size="s" />
        <Typography color="text-secondary">Открываем пространство…</Typography>
      </div>
    );
  }

  const unavailableTitle =
    unavailableInviteTitle(accept.error) ?? unavailableInviteTitle(invite.error);
  if (unavailableTitle) {
    return (
      <Alert
        palette="danger"
        title={unavailableTitle}
        description="Попросите отправить новое приглашение."
      />
    );
  }

  if (invite.isPending) {
    return (
      <div className="flex flex-col gap-4" role="status" aria-label="Загрузка приглашения">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-6 w-64" />
        <Skeleton className="h-10 w-40" />
      </div>
    );
  }

  if (invite.isError) {
    return (
      <Alert
        palette="danger"
        title="Не удалось загрузить приглашение"
        description="Проверьте подключение и попробуйте ещё раз."
        action={{
          label: 'Попробовать ещё раз',
          onClick: () => {
            void invite.refetch();
          },
        }}
      />
    );
  }

  const data = invite.data;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Typography as="h1" size="h3">
          Вас приглашают в пространство
        </Typography>
        <Typography as="p" size="h4">
          {data.workspaceName}
        </Typography>
        <Typography as="p" color="text-secondary">
          Ваша роль: {WORKSPACE_ROLE_LABEL[data.role]}
        </Typography>
      </div>
      {accept.isError && (
        <Alert
          palette="danger"
          title="Не удалось принять приглашение"
          description="Попробуйте ещё раз или запросите новую ссылку."
        />
      )}
      <div className="flex items-center gap-2">
        <Button
          type="button"
          disabled={accept.isPending}
          onClick={() => {
            accept.mutate(undefined, {
              onSuccess: (result) => {
                if (result.outcome === 'joined')
                  router.push(routes.workspace(result.workspaceSlug));
              },
            });
          }}
        >
          {accept.isPending ? 'Присоединяем…' : 'Присоединиться'}
        </Button>
        {accept.isPending && <Spinner size="s" />}
      </div>
    </div>
  );
}
