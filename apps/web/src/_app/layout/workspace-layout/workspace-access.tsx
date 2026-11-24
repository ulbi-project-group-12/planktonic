'use client';

import type { ReactNode } from 'react';
import { NotFoundPage } from '@/_pages/system/not-found';
import { hasApiStatus, useWorkspaceGetBySlug } from '@/shared/api';
import { routes } from '@/shared/config';
import { Button, Link } from '@/shared/ui';

export function WorkspaceAccess({ slug, children }: { slug: string; children: ReactNode }) {
  const workspace = useWorkspaceGetBySlug(slug);

  if (workspace.isPending) return <p role="status">Загружаем пространство…</p>;

  if (workspace.isError) {
    if (hasApiStatus(workspace.error, 404)) return <NotFoundPage />;

    if (hasApiStatus(workspace.error, 401)) {
      return <Link href={routes.login()}>Войдите, чтобы открыть пространство</Link>;
    }

    return (
      <div>
        <p role="alert">Не удалось загрузить пространство.</p>
        <Button type="button" onClick={() => void workspace.refetch()}>
          Попробовать ещё раз
        </Button>
      </div>
    );
  }

  return children;
}
