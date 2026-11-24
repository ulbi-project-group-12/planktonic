'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { NotFoundPage } from '@/_pages/system/not-found';
import { hasApiStatus, useWorkspaceGetBySlug } from '@/shared/api';
import { routes } from '@/shared/config';
import { Button, Link } from '@/shared/ui';

export function WorkspaceAccess({ slug, children }: { slug: string; children: ReactNode }) {
  const pathname = usePathname();
  const workspace = useWorkspaceGetBySlug(slug);

  if (workspace.isPending) return <p role="status">Загружаем пространство…</p>;

  if (workspace.isError) {
    if (hasApiStatus(workspace.error, 404)) return <NotFoundPage />;

    if (hasApiStatus(workspace.error, 401)) {
      // The session gate normally redirects first; the link keeps the same return address.
      const next = `${pathname}${window.location.search}${window.location.hash}`;
      return <Link href={routes.login(next)}>Войдите, чтобы открыть пространство</Link>;
    }

    // A failed background refetch (a network blip on window focus) must not replace an open
    // workspace with an error: access was granted, and only a 404 or a 401 takes it back.
    if (workspace.data === undefined) {
      return (
        <div>
          <p role="alert">Не удалось загрузить пространство.</p>
          <Button type="button" onClick={() => void workspace.refetch()}>
            Попробовать ещё раз
          </Button>
        </div>
      );
    }
  }

  return children;
}
