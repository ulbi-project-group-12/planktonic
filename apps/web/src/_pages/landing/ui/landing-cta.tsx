'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useStore } from 'zustand';
import { restoreSession, sessionStore } from '@/shared/api';
import { routes } from '@/shared/config';
import { Button, type ButtonProps } from '@/shared/ui/button';

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

  useEffect(() => {
    void restoreSession();
  }, []);

  const handleClick = () => {
    setDeciding(true);
    void (async () => {
      try {
        await restoreSession();
        await waitForRestore();
        const signedIn = sessionStore.getState().accessToken !== undefined;
        router.push(signedIn ? routes.workspaces() : routes.register());
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

/** «Войти» — a plain link to the login, as a button for the header and the hero. */
export function LandingLoginButton({
  size = 'l',
  className,
}: Pick<LandingCtaProps, 'size' | 'className'>) {
  const router = useRouter();
  return (
    <Button
      type="button"
      variant="secondary"
      size={size}
      className={className}
      onClick={() => {
        router.push(routes.login());
      }}
    >
      Войти
    </Button>
  );
}
