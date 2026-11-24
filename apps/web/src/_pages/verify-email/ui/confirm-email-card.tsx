'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { hasApiStatus, isApiError, useAuthMe } from '@/shared/api';
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
 * and a spam hint, so there is little reason to press again. A guest gets a link to sign in:
 * resending needs a session anyway.
 */
export function ConfirmEmailCard() {
  const router = useRouter();
  const me = useAuthMe();
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

  const guest = hasApiStatus(me.error, 401);

  return (
    <VerifyEmailCard
      title="Подтвердите email"
      subtitle={
        me.isSuccess ? (
          <>
            Мы отправили письмо на <span className="font-bold">{me.data.email}</span>
          </>
        ) : guest ? (
          'Мы отправили письмо на ваш адрес'
        ) : undefined
      }
      footer={
        me.isSuccess || guest ? (
          <>
            Уже подтвердили?{' '}
            <Link href={routes.login()} className="font-bold">
              Войти
            </Link>
          </>
        ) : undefined
      }
    >
      {me.isPending ? (
        <div className="flex justify-center py-4">
          <Spinner />
        </div>
      ) : me.isError && !guest ? (
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
      ) : guest ? (
        <Button
          type="button"
          size="l"
          fullWidth
          onClick={() => {
            router.push(routes.login());
          }}
        >
          Войти
        </Button>
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
