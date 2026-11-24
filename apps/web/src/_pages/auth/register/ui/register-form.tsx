'use client';

import { useState, type SyntheticEvent } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type FieldError } from 'react-hook-form';
import { Eye, EyeOff } from 'lucide-react';
import { PASSWORD_MIN_LENGTH, RegisterRequestSchema, type RegisterRequest } from '@app/contracts';
import { getApiIssues, hasApiStatus, isApiError, useAuthRegister } from '@/shared/api';
import { routes } from '@/shared/config';
import { Alert, Button, Checkbox, Field, Input } from '@/shared/ui';
import { EMAIL_TAKEN_MESSAGE, validationMessage, type RegisterField } from '../model/messages';

const FIELDS: readonly RegisterField[] = ['name', 'email', 'password', 'confirmPassword'];

function PasswordVisibilityButton({
  visible,
  label,
  onToggle,
}: {
  visible: boolean;
  label: string;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      // The name says what a press does; an aria-pressed on top would announce the state twice.
      aria-label={`${visible ? 'Скрыть' : 'Показать'} ${label}`}
      className="flex size-8 cursor-pointer items-center justify-center rounded-lg text-fg-muted transition-colors hover:bg-sunken hover:text-fg-primary focus-visible:ring-2 focus-visible:ring-brand-primary/40 focus-visible:outline-none"
      onMouseDown={(event) => {
        event.preventDefault();
      }}
      onClick={(event) => {
        event.stopPropagation();
        onToggle();
      }}
    >
      {visible ? <EyeOff className="size-5" aria-hidden /> : <Eye className="size-5" aria-hidden />}
    </button>
  );
}

/**
 * Registration form: validated with the contract's `RegisterRequestSchema`, the same schema the
 * api uses. A 409 lands on the email field, field issues of a 400 (e.g. a weak password) land on
 * their fields; a server error or a network failure shows a banner and keeps the entered values.
 * On success the user goes to the login screen.
 *
 * The terms checkbox is client-only: the contract has no such field, so it is kept outside the
 * schema and checked on submit together with it.
 */
export function RegisterForm() {
  const router = useRouter();
  const registerUser = useAuthRegister();
  const [submitError, setSubmitError] = useState<string>();
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [termsError, setTermsError] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);
  const {
    register,
    handleSubmit,
    setError,
    getValues,
    formState: { errors },
  } = useForm<RegisterRequest>({
    resolver: zodResolver(RegisterRequestSchema),
    defaultValues: { name: '', email: '', password: '', confirmPassword: '' },
  });

  // What the schema would send for the field right now: name and email are trimmed by it.
  const currentValue = (field: RegisterField) => {
    const value = getValues(field);
    return field === 'name' || field === 'email' ? value.trim() : value;
  };

  const submitValid = handleSubmit(
    async (values) => {
      setSubmitError(undefined);
      if (!termsAccepted) return;
      try {
        await registerUser.mutateAsync({ data: values });
        router.push(routes.login());
      } catch (error) {
        if (hasApiStatus(error, 409)) {
          // The fields stay editable during the request: "taken" is about the address that was
          // sent, so it is not shown next to one the user has typed since.
          if (currentValue('email') === values.email) {
            setError(
              'email',
              { type: 'server', message: EMAIL_TAKEN_MESSAGE },
              { shouldFocus: true },
            );
          }
          return;
        }
        if (isApiError(error)) {
          let recognised = false;
          let focused = false;
          for (const issue of getApiIssues(error)) {
            const field = FIELDS.find((name) => name === issue.path);
            if (!field) continue;
            recognised = true;
            // Same as the 409: an issue about a value the user has already changed is not shown.
            if (currentValue(field) !== values[field]) continue;
            setError(field, { type: 'server', message: issue.message }, { shouldFocus: !focused });
            focused = true;
          }
          // The api answered, so the connection is fine: do not send the user to check it.
          if (!recognised) setSubmitError('Сервер ответил ошибкой. Попробуйте ещё раз чуть позже.');
          return;
        }
        setSubmitError('Проверьте подключение к сети и попробуйте ещё раз.');
      }
    },
    () => {
      // Invalid fields: the banner of the previous attempt no longer describes what is wrong.
      setSubmitError(undefined);
    },
  );

  const onSubmit = (event: SyntheticEvent<HTMLFormElement>) => {
    // The field errors and the terms error show together, so one submit reveals everything to fix.
    setTermsError(!termsAccepted);
    return submitValid(event);
  };

  const errorText = (field: RegisterField, error: FieldError | undefined) => {
    if (!error) return undefined;
    return error.type === 'server' ? error.message : validationMessage(field, error.type);
  };

  return (
    <form onSubmit={onSubmit} noValidate className="flex w-full flex-col gap-5">
      {submitError ? (
        <Alert palette="danger" title="Не удалось зарегистрироваться" description={submitError} />
      ) : null}
      {/* The mockup shows no required markers: every field is required, aria-required says so. */}
      <Field label="Имя" error={errorText('name', errors.name)}>
        <Input
          autoComplete="name"
          placeholder="Ада Лавлейс"
          aria-required
          autoFocus
          {...register('name')}
        />
      </Field>
      <Field label="Email" error={errorText('email', errors.email)}>
        <Input
          type="email"
          autoComplete="email"
          placeholder="you@company.com"
          aria-required
          {...register('email')}
        />
      </Field>
      <Field
        label="Пароль"
        // The length error says the same thing, so the hint steps aside for an error.
        hint={errors.password ? undefined : `Не короче ${String(PASSWORD_MIN_LENGTH)} символов`}
        error={errorText('password', errors.password)}
      >
        <Input
          type={passwordVisible ? 'text' : 'password'}
          autoComplete="new-password"
          placeholder="••••••••"
          aria-required
          className="pl-3 pr-1.5"
          action={
            <PasswordVisibilityButton
              visible={passwordVisible}
              label="пароль"
              onToggle={() => {
                setPasswordVisible((visible) => !visible);
              }}
            />
          }
          {...register('password')}
        />
      </Field>
      <Field label="Повторите пароль" error={errorText('confirmPassword', errors.confirmPassword)}>
        <Input
          type={confirmPasswordVisible ? 'text' : 'password'}
          autoComplete="new-password"
          placeholder="••••••••"
          aria-required
          className="pl-3 pr-1.5"
          action={
            <PasswordVisibilityButton
              visible={confirmPasswordVisible}
              label="повтор пароля"
              onToggle={() => {
                setConfirmPasswordVisible((visible) => !visible);
              }}
            />
          }
          {...register('confirmPassword')}
        />
      </Field>
      <div className="flex flex-col gap-1.5">
        <Checkbox
          label="Соглашаюсь с условиями использования"
          checked={termsAccepted}
          onCheckedChange={(checked) => {
            setTermsAccepted(checked);
            if (checked) setTermsError(false);
          }}
          aria-invalid={termsError || undefined}
          aria-describedby={termsError ? 'register-terms-error' : undefined}
        />
        {termsError ? (
          <p id="register-terms-error" className="text-caption text-danger">
            Нужно согласие с условиями использования
          </p>
        ) : null}
      </div>
      <Button
        type="submit"
        size="l"
        loading={registerUser.isPending}
        disabled={!termsAccepted}
        className="w-full"
      >
        Создать аккаунт
      </Button>
    </form>
  );
}
