'use client';

import { useRouter } from 'next/navigation';
import { routes } from '@/shared/config';
import { Alert, Button, Skeleton, Spinner, Typography } from '@/shared/ui';
import { WORKSPACE_ROLE_LABEL } from '@/widgets/invite-member';
import { useAcceptInvite, useInvite } from '../api/invite';

interface InviteAcceptanceProps {
  token: string;
}

/**
 * «Присоединиться» screen (UL-220): shows who invites the signed-in user — workspace
 * name and the role — and drops them into the workspace on accept. Invalid or used
 * links render a dead-link notice instead.
 */
export function InviteAcceptance({ token }: InviteAcceptanceProps) {
  const router = useRouter();
  const invite = useInvite(token);
  const accept = useAcceptInvite(token);

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
        title="Ссылка недействительна или уже использована"
        description="Попросите отправить новое приглашение."
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
