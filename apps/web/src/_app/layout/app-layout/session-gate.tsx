'use client';

import { useQueryClient } from '@tanstack/react-query';
import { usePathname, useRouter } from 'next/navigation';
import { type ReactNode, useEffect, useState } from 'react';
import { useStore } from 'zustand';
import { hasApiStatus, restoreSession, sessionStore, useAuthMe } from '@/shared/api';
import { routes } from '@/shared/config';
import { Alert, Spinner } from '@/shared/ui';

/**
 * Guards the pages behind the login (UL-140). The access token lives only in this tab's memory,
 * so the server and a proxy cannot see it: the check has to run in a client component. A guest,
 * or a visitor whose token the api no longer accepts, goes to the login screen with the address
 * to come back to. The shell inside shows who is signed in (the header's user menu). On a page
 * reload the gate first asks the refresh endpoint for a new token (UL-217), so a returning
 * visitor does not see the login screen.
 */
export function SessionGate({ children }: Readonly<{ children: ReactNode }>) {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const accessToken = useStore(sessionStore, (state) => state.accessToken);
  const me = useAuthMe({ query: { enabled: accessToken !== undefined } });
  const rejected = hasApiStatus(me.error, 401);
  const guest = accessToken === undefined || rejected;
  const [restoring, setRestoring] = useState(() => accessToken === undefined);

  useEffect(() => {
    // Only a mount without a token restores: a mid-session loss already went through refresh
    // inside apiFetch, and an explicit sign-out is declined by restoreSession itself.
    if (!restoring || accessToken !== undefined) return;
    // No cancellation: a token set by the resolve rerenders this effect away, and the settle
    // still has to end `restoring`, so the finally stays attached either way.
    void restoreSession().finally(() => {
      setRestoring(false);
    });
  }, [accessToken, restoring]);

  useEffect(() => {
    if (!guest || restoring) return;
    // Leaving with the sign-out button needs no address to come back to.
    const { signedOut } = sessionStore.getState();
    sessionStore.setState({ accessToken: undefined, signedOut: false });
    // Cached answers belong to the account that just lost access.
    queryClient.clear();
    router.replace(
      signedOut
        ? routes.login()
        : routes.login(`${pathname}${window.location.search}${window.location.hash}`),
    );
  }, [guest, restoring, pathname, queryClient, router]);

  if (restoring || guest || me.isPending) {
    return (
      <main className="flex min-h-svh items-center justify-center">
        <Spinner size="l" />
      </main>
    );
  }

  if (me.isError) {
    return (
      <main className="mx-auto flex min-h-svh max-w-2xl flex-col justify-center p-8">
        <Alert
          palette="danger"
          title="Не удалось загрузить профиль"
          description="Проверьте подключение к сети и попробуйте ещё раз."
          action={{ label: 'Повторить', onClick: () => void me.refetch() }}
        />
      </main>
    );
  }

  return children;
}
