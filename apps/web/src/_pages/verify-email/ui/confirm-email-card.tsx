'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from 'zustand';
import { hasApiStatus, isApiError, sessionStore, useAuthMe } from '@/shared/api';
import { routes } from '@/shared/config';
import { Alert, Button, Link, Spinner, Typography } from '@/shared/ui';
import {
  DEFAULT_RESEND_AFTER_SEC,
  getRetryAfterSec,
  useResendVerification,
} from '../api/email-verification';
import {
  NETWORK_ERROR_MESSAGE,
  RESEND_FAILED_TITLE,
  SERVER_ERROR_MESSAGE,
} from '../model/messages';
import { VerifyEmailCard } from './verify-email-card';

/**
 * The "confirm your email" screen: the address from the profile, a resend button that locks for
 * the pause the api reports (success carries `resendAfterSec`, a 429 carries `retryAfterSec`),
 * and a spam hint, so there is little reason to press again. A guest (no access token, or one the
 * api no longer accepts) is asked to sign in and comes back here: resending needs a session.
 */
export function ConfirmEmailCard() {
  const router = useRouter();
  // The profile is asked only with a session, as in the login gate: without an access token the
  // answer is known to be a 401, and the default mock would answer with a profile anyway.
  const accessToken = useStore(sessionStore, (state) => state.accessToken);
  const me = useAuthMe({ query: { enabled: accessToken !== undefined } });
  const resend = useResendVerification();
  const [waitSec, setWaitSec] = useState(0);
  const [submitError, setSubmitError] = useState<string>();
  // The moment the pause ends. The seconds on screen are derived from it, not counted down: a
  // background tab throttles or suspends timers, and a countdown would then outlast the pause.
  const unlockAtRef = useRef(0);
  const waiting = waitSec > 0;

  const startWait = (seconds: number) => {
    unlockAtRef.current = Date.now() + seconds * 1000;
    setWaitSec(seconds);
  };

  useEffect(() => {
    if (!waiting) return;
    const sync = () => {
      setWaitSec(Math.max(0, Math.ceil((unlockAtRef.current - Date.now()) / 1000)));
    };
    const timer = setInterval(sync, 1000);
    // Coming back from the mail tab shows the real remainder at once, not on the next tick.
    document.addEventListener('visibilitychange', sync);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', sync);
    };
  }, [waiting]);

  const onResend = async () => {
    setSubmitError(undefined);
    try {
      const { resendAfterSec } = await resend.mutateAsync();
      startWait(resendAfterSec);
    } catch (error) {
      if (hasApiStatus(error, 429)) {
        // The client timer was bypassed (reload, another tab): take the server's wait.
        startWait(getRetryAfterSec(error) ?? DEFAULT_RESEND_AFTER_SEC);
        return;
      }
      setSubmitError(isApiError(error) ? SERVER_ERROR_MESSAGE : NETWORK_ERROR_MESSAGE);
    }
  };

  const guest = accessToken === undefined || hasApiStatus(me.error, 401);

  return (
    <VerifyEmailCard
      title="Подтвердите email"
      subtitle={
        guest ? (
          'Войдите, чтобы отправить письмо ещё раз'
        ) : me.isSuccess ? (
          <>
            Мы отправили письмо на <span className="font-bold">{me.data.email}</span>
          </>
        ) : undefined
      }
      footer={
        me.isSuccess && !guest ? (
          <>
            Уже подтвердили?{' '}
            <Link href={routes.login()} className="font-bold">
              Войти
            </Link>
          </>
        ) : undefined
      }
    >
      {guest ? (
        <Button
          type="button"
          size="l"
          fullWidth
          onClick={() => {
            // Back to this screen after signing in: the resend button is here.
            router.push(routes.login(routes.verifyEmail()));
          }}
        >
          Войти
        </Button>
      ) : me.isPending ? (
        <div className="flex justify-center py-4">
          <Spinner />
        </div>
      ) : me.isError ? (
        <Alert
          palette="danger"
          title="Не удалось загрузить профиль"
          description="Проверьте подключение к сети и попробуйте ещё раз."
          action={{
            label: 'Повторить',
            onClick: () => {
              void me.refetch();
            },
          }}
        />
      ) : (
        <>
          {submitError ? (
            <Alert palette="danger" title={RESEND_FAILED_TITLE} description={submitError} />
          ) : null}
          <Button
            type="button"
            size="l"
            fullWidth
            loading={resend.isPending}
            disabled={waiting}
            onClick={() => {
              void onResend();
            }}
          >
            Отправить ещё раз
          </Button>
          <Typography as="p" size="body-s" color="text-secondary" className="text-center">
            {waiting
              ? `Можно отправить повторно через ${String(waitSec)} с`
              : 'Не пришло письмо? Проверьте папку «Спам».'}
          </Typography>
        </>
      )}
    </VerifyEmailCard>
  );
}
