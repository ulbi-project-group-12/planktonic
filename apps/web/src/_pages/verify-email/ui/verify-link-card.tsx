'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { CircleCheck, Link2Off, MailCheck } from 'lucide-react';
import { hasApiStatus, isApiError } from '@/shared/api';
import { routes } from '@/shared/config';
import { Alert, Button, Spinner } from '@/shared/ui';
import { useConfirmEmail } from '../api/email-verification';
import {
  NETWORK_ERROR_MESSAGE,
  SERVER_ERROR_MESSAGE,
  VERIFY_FAILED_TITLE,
} from '../model/messages';
import { VerifyEmailCard } from './verify-email-card';

/**
 * The page an email link opens. It sends the token once on mount — the ref guards the StrictMode
 * double effect, so the second run of dev does not turn a fresh link into "already used" — then
 * shows one outcome: confirmed → sign in, already used → sign in, expired or unknown → ask for a
 * new letter. Any other failure offers a retry.
 */
export function VerifyLinkCard({ token }: Readonly<{ token: string }>) {
  const router = useRouter();
  const { mutate, status, error } = useConfirmEmail();
  const sentRef = useRef(false);

  useEffect(() => {
    if (sentRef.current) return;
    sentRef.current = true;
    mutate(token);
  }, [mutate, token]);

  const goTo = (path: string) => () => {
    router.push(path);
  };

  if (status === 'success') {
    return (
      <VerifyEmailCard title="Email подтверждён" subtitle="Теперь можно войти в аккаунт.">
        <CircleCheck className="mx-auto size-10 text-success" aria-hidden />
        <Button type="button" size="l" fullWidth onClick={goTo(routes.login())}>
          Войти
        </Button>
      </VerifyEmailCard>
    );
  }

  if (hasApiStatus(error, 409)) {
    return (
      <VerifyEmailCard
        title="Ссылка уже использована"
        subtitle="Адрес уже подтверждён — войдите в аккаунт."
      >
        <MailCheck className="mx-auto size-10 text-info-hover dark:text-info" aria-hidden />
        <Button type="button" size="l" fullWidth onClick={goTo(routes.login())}>
          Войти
        </Button>
      </VerifyEmailCard>
    );
  }

  if (hasApiStatus(error, 410)) {
    return (
      <VerifyEmailCard
        title="Ссылка недействительна"
        subtitle="Срок действия ссылки истёк — запросите новое письмо."
      >
        <Link2Off className="mx-auto size-10 text-warning-hover dark:text-warning" aria-hidden />
        <Button type="button" size="l" fullWidth onClick={goTo(routes.verifyEmail())}>
          Запросить новую ссылку
        </Button>
      </VerifyEmailCard>
    );
  }

  if (status === 'error') {
    return (
      <VerifyEmailCard title="Подтверждение email">
        <Alert
          palette="danger"
          title={VERIFY_FAILED_TITLE}
          description={isApiError(error) ? SERVER_ERROR_MESSAGE : NETWORK_ERROR_MESSAGE}
          action={{
            label: 'Повторить',
            onClick: () => {
              mutate(token);
            },
          }}
        />
      </VerifyEmailCard>
    );
  }

  return (
    <VerifyEmailCard title="Подтверждаем email…">
      <div className="flex justify-center py-4">
        <Spinner />
      </div>
    </VerifyEmailCard>
  );
}
