'use client';

import { useQueryClient } from '@tanstack/react-query';
import { usePathname } from 'next/navigation';
import { type ReactNode, useEffect } from 'react';
import { NotFoundPage } from '@/_pages/system/not-found';
import { getWorkspaceGetBySlugQueryKey, hasApiStatus, useWorkspaceGetBySlug } from '@/shared/api';
import { routes } from '@/shared/config';
import { Button, Link } from '@/shared/ui';

export function WorkspaceAccess({ slug, children }: { slug: string; children: ReactNode }) {
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const workspace = useWorkspaceGetBySlug(slug);
  const denied = hasApiStatus(workspace.error, 404) || hasApiStatus(workspace.error, 401);

  // A refusal also drops the answer of the earlier successful check. Otherwise the cached
  // workspace would outlive it, and the next failed refetch (a 500) would count as "access was
  // granted, the network blinked" and open the workspace again.
  useEffect(() => {
    if (!denied) return;
    queryClient
      .getQueryCache()
      .find({ queryKey: getWorkspaceGetBySlugQueryKey(slug) })
      ?.setState({ data: undefined });
  }, [denied, queryClient, slug]);

  if (workspace.isPending) return <p role="status">Загружаем пространство…</p>;

  if (workspace.isError) {
    if (hasApiStatus(workspace.error, 404)) return <NotFoundPage />;

    if (hasApiStatus(workspace.error, 401)) {
      // The session gate normally redirects first; the link keeps the same return address.
      const next = `${pathname}${window.location.search}${window.location.hash}`;
      return <Link href={routes.login(next)}>Войдите, чтобы открыть пространство</Link>;
    }

    // A failed background refetch (a network blip on window focus) must not replace an open
    // workspace with an error: access was granted, and only a 404 or a 401 takes it back (and
    // clears the data, see above).
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
