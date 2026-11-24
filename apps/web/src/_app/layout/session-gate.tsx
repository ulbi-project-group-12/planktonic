'use client';

import { useQueryClient } from '@tanstack/react-query';
import { usePathname, useRouter } from 'next/navigation';
import { type ReactNode, useEffect, useRef } from 'react';
import { useStore } from 'zustand';
import { hasApiStatus, sessionStore, signOut, useAuthMe } from '@/shared/api';
import { routes } from '@/shared/config';
import { Alert, Button, Spinner, Typography } from '@/shared/ui';

/**
 * Guards the pages behind the login (UL-140). The access token lives only in this tab's memory,
 * so the server and a proxy cannot see it: the check has to run in a client component. A guest,
 * or a visitor whose token the api no longer accepts, goes to the login screen with the address
 * to come back to. A page reload loses the token until refresh tokens arrive (UL-141).
 */
export function SessionGate({ children }: Readonly<{ children: ReactNode }>) {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const accessToken = useStore(sessionStore, (state) => state.accessToken);
  const me = useAuthMe({ query: { enabled: accessToken !== undefined } });
  const rejected = hasApiStatus(me.error, 401);
  const guest = accessToken === undefined || rejected;
  // Set by the sign-out button: leaving on purpose needs no address to come back to.
  const leavingRef = useRef(false);

  useEffect(() => {
    if (!guest) return;
    signOut();
    // Cached answers belong to the account that just lost access.
    queryClient.clear();
    router.replace(
      leavingRef.current ? routes.login() : routes.login(`${pathname}${window.location.search}`),
    );
  }, [guest, pathname, queryClient, router]);

  if (guest || me.isPending) {
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

  return (
    <>
      <header className="flex items-center justify-end gap-3 px-6 py-3">
        <Typography as="span" size="body" data-testid="current-user-name">
          {me.data.name}
        </Typography>
        <Button
          type="button"
          variant="secondary"
          size="s"
          onClick={() => {
            leavingRef.current = true;
            signOut();
          }}
        >
          Выйти
        </Button>
      </header>
      {children}
    </>
  );
}
