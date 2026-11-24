'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { useWorkspaces } from '@/entities/workspace';
import { routes } from '@/shared/config';
import { Alert, Avatar, Button, Skeleton, Typography } from '@/shared/ui';

export function WorkspacesPage() {
  const router = useRouter();
  const { data, isPending, error, refetch } = useWorkspaces();
  const workspaces = data ?? [];

  if (isPending) {
    return (
      <main className="mx-auto max-w-2xl p-6">
        <div className="mb-4 flex items-center justify-between">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="flex flex-col gap-3">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="mx-auto max-w-2xl p-6">
        <Alert
          palette="danger"
          title="Не удалось загрузить пространства"
          description="Проверьте подключение и попробуйте ещё раз."
          action={{
            label: 'Повторить',
            onClick: () => {
              void refetch();
            },
          }}
        />
      </main>
    );
  }

  if (workspaces.length === 0) {
    return (
      <main className="mx-auto flex min-h-[calc(100svh-4rem)] max-w-2xl flex-col items-center justify-center gap-4 p-8 text-center">
        <Typography as="h1" size="h3">
          У вас пока нет пространств
        </Typography>
        <Typography as="p" color="text-secondary">
          Создайте первое пространство, чтобы начать работу.
        </Typography>
        <Button
          onClick={() => {
            router.push(routes.workspaceCreate());
          }}
        >
          <Plus className="size-4" />
          Создать пространство
        </Button>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <Typography as="h1" size="h3">
          Ваши пространства
        </Typography>
        <Button
          onClick={() => {
            router.push(routes.workspaceCreate());
          }}
        >
          <Plus className="size-4" />
          Создать
        </Button>
      </div>

      <ul className="flex flex-col gap-2">
        {workspaces.map((workspace) => (
          <li key={workspace.slug}>
            <Link
              href={routes.workspace(workspace.slug)}
              className="flex items-center gap-3 rounded-button border border-line bg-surface p-3 outline-none transition-colors hover:bg-sunken focus-visible:ring-3 focus-visible:ring-brand-primary/40"
            >
              <Avatar name={workspace.name} size="l" />
              <div className="flex min-w-0 flex-col">
                <span className="truncate font-bold text-fg-primary">{workspace.name}</span>
                <span className="truncate text-caption text-fg-secondary">{workspace.slug}</span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
