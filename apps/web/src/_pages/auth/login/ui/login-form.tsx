'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type FieldError } from 'react-hook-form';
import { Eye, EyeOff } from 'lucide-react';
import { LoginRequestSchema, type LoginRequest } from '@app/contracts';
import { getApiIssues, getWorkspaceListQueryOptions, hasApiStatus, isApiError } from '@/shared/api';
import { routes } from '@/shared/config';
import { Alert, Button, Field, Input, Link } from '@/shared/ui';
import { useSignIn } from '../api/sign-in';
import { INVALID_CREDENTIALS_MESSAGE, validationMessage, type LoginField } from '../model/messages';

const FIELDS: readonly LoginField[] = ['email', 'password'];

export function LoginForm() {
  const router = useRouter();
  const queryClient = useQueryClient();
  // The session gate sends a guest here with the address to come back to.
  const next = useSearchParams().get('next');
  const signIn = useSignIn();
  const [submitError, setSubmitError] = useState<string>();
  const [passwordVisible, setPasswordVisible] = useState(false);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginRequest>({
    resolver: zodResolver(LoginRequestSchema),
    defaultValues: { email: '', password: '' },
  });

  // Counts edits of the credentials: the fields stay editable during the request, and "invalid
  // email or password" is about the values that were sent, not about ones typed since.
  const editsRef = useRef(0);

  const onSubmit = handleSubmit(
    async (values) => {
      setSubmitError(undefined);
      const editsAtSubmit = editsRef.current;
      try {
        await signIn.mutateAsync(values);
        // Answers cached for whoever used this tab before belong to another account: without
        // this, a workspace list younger than the client's staleTime would be shown as ours.
        queryClient.removeQueries();
        const destination = routes.afterLogin(next);
        if (destination !== routes.workspaces()) {
          router.push(destination);
          return;
        }
        const workspaces = await queryClient
          .query(getWorkspaceListQueryOptions())
          .catch(() => undefined);
        router.push(workspaces?.length === 0 ? routes.workspaceCreate() : destination);
      } catch (error) {
        if (hasApiStatus(error, 401)) {
          if (editsRef.current === editsAtSubmit) setSubmitError(INVALID_CREDENTIALS_MESSAGE);
          return;
        }
        if (isApiError(error)) {
          let recognised = false;
          for (const issue of getApiIssues(error)) {
            const field = FIELDS.find((name) => name === issue.path);
            if (!field) continue;
            setError(
              field,
              { type: 'server', message: issue.message },
              { shouldFocus: !recognised },
            );
            recognised = true;
          }
          if (!recognised) setSubmitError('Сервер ответил ошибкой. Попробуйте ещё раз чуть позже.');
          return;
        }
        setSubmitError('Проверьте подключение к сети и попробуйте ещё раз.');
      }
    },
    () => {
      setSubmitError(undefined);
    },
  );

  // The banner describes the values that were sent: once they change, it is out of date.
  const clearSubmitError = () => {
    editsRef.current += 1;
    setSubmitError(undefined);
  };

  const errorText = (field: LoginField, error: FieldError | undefined) => {
    if (!error) return undefined;
    return error.type === 'server' ? error.message : validationMessage(field, error.type);
  };

  return (
    // method="post": a submit before hydration (or with scripts off) is a native one, and the
    // default GET would put the email and the password into the address bar and server logs.
    <form method="post" onSubmit={onSubmit} noValidate className="flex w-full flex-col gap-5">
      {submitError ? (
        <Alert palette="danger" title="Не удалось войти" description={submitError} />
      ) : null}
      <Field
        label={<span className="text-fg-secondary">Email</span>}
        error={errorText('email', errors.email)}
      >
        <Input
          type="email"
          autoComplete="email"
          placeholder="you@company.com"
          aria-required
          autoFocus
          className="px-3.5"
          {...register('email', { onChange: clearSubmitError })}
        />
      </Field>
      <div className="relative">
        <Field
          label={<span className="text-fg-secondary">Пароль</span>}
          error={errorText('password', errors.password)}
        >
          <Input
            type={passwordVisible ? 'text' : 'password'}
            autoComplete="current-password"
            placeholder="••••••••"
            aria-required
            className="pl-3.5 pr-1.5"
            action={
              <button
                type="button"
                aria-label={passwordVisible ? 'Скрыть пароль' : 'Показать пароль'}
                aria-pressed={passwordVisible}
                className="flex size-8 cursor-pointer items-center justify-center rounded-lg text-fg-muted transition-colors hover:bg-sunken hover:text-fg-primary focus-visible:ring-2 focus-visible:ring-brand-primary/40 focus-visible:outline-none"
                onMouseDown={(event) => {
                  event.preventDefault();
                }}
                onClick={(event) => {
                  event.stopPropagation();
                  setPasswordVisible((visible) => !visible);
                }}
              >
                {passwordVisible ? (
                  <EyeOff className="size-5" aria-hidden />
                ) : (
                  <Eye className="size-5" aria-hidden />
                )}
              </button>
            }
            {...register('password', { onChange: clearSubmitError })}
          />
        </Field>
        <Link href={routes.forgotPassword()} className="absolute top-0 right-0 font-bold leading-6">
          Забыли пароль?
        </Link>
      </div>
      <Button
        type="submit"
        size="l"
        loading={isSubmitting}
        fullWidth
        className="text-[15px] leading-6"
      >
        Войти
      </Button>
    </form>
  );
}
