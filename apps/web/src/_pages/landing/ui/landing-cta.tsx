'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useStore } from 'zustand';
import { restoreSession, sessionStore } from '@/shared/api';
import { routes } from '@/shared/config';
import { Button, buttonClassName, type ButtonProps } from '@/shared/ui/button';

/** Waits until the silent refresh in flight settles (the token is remembered per tab). */
function waitForRestore(): Promise<void> {
  return new Promise((resolve) => {
    if (sessionStore.getState().restoreStatus !== 'pending') {
      resolve();
      return;
    }
    const unsubscribe = sessionStore.subscribe((state) => {
      if (state.restoreStatus !== 'pending') {
        unsubscribe();
        resolve();
      }
    });
  });
}

interface LandingCtaProps {
  /** Button label; «Зарегистрироваться» almost everywhere. */
  label?: string;
  size?: ButtonProps['size'];
  variant?: ButtonProps['variant'];
  fullWidth?: boolean;
  className?: string;
}

/**
 * The «Зарегистрироваться» button (UL-153). The session lives in the tab's memory plus a refresh
 * cookie neither the server nor a proxy can read, so the choice "the app or the
 * registration" is made here, on the client: a signed-in visitor goes to the workspace
 * list, a guest — to the registration. The restore starts on mount, so by the click
 * the answer is usually already known; otherwise the button waits for it.
 */
export function LandingCta({
  label = 'Зарегистрироваться',
  size = 'l',
  variant = 'solid',
  fullWidth = false,
  className,
}: LandingCtaProps) {
  const router = useRouter();
  const accessToken = useStore(sessionStore, (state) => state.accessToken);
  const [deciding, setDeciding] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    void restoreSession();
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const handleClick = () => {
    setDeciding(true);
    void (async () => {
      try {
        await restoreSession();
        await waitForRestore();
        // The user may have left the landing while the restore was in flight; a late push
        // would yank them away from the page they chose.
        if (!mountedRef.current) return;
        const state = sessionStore.getState();
        // A network error says nothing about the session — stay put; the next click retries.
        if (state.restoreStatus === 'error') return;
        router.push(state.accessToken !== undefined ? routes.workspaces() : routes.register());
      } finally {
        setDeciding(false);
      }
    })();
  };

  return (
    <Button
      type="button"
      size={size}
      variant={variant}
      fullWidth={fullWidth}
      loading={deciding}
      className={className}
      onClick={() => {
        if (accessToken !== undefined) {
          router.push(routes.workspaces());
          return;
        }
        handleClick();
      }}
    >
      {label}
    </Button>
  );
}

/** «Войти» — a link to the login in the button look, for the header and the hero: a real
 *  anchor, so the context menu, «open in a new tab» and screen readers all work natively. */
export function LandingLoginButton({
  size = 'l',
  className,
}: Pick<LandingCtaProps, 'size' | 'className'>) {
  return (
    <Link href={routes.login()} className={buttonClassName({ variant: 'secondary', size, className })}>
      Войти
    </Link>
  );
}
