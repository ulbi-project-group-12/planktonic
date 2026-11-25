'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type UseFormGetValues, type UseFormSetError } from 'react-hook-form';
import { PRODUCT_SLUG } from '@app/config/product';
import {
  getApiIssues,
  getWorkspaceListQueryKey,
  hasApiStatus,
  isApiError,
  useWorkspaceCreate,
} from '@/shared/api';
import { routes } from '@/shared/config';
import { Alert, Button, Field, Input, Progress, Typography } from '@/shared/ui';
import { workspaceFormSchema, type WorkspaceFormValues } from '../model/form-schema';
import { slugify } from '../model/slugify';
import { InviteMembersStep } from './invite-members-step';

interface CreatedWorkspace {
  values: WorkspaceFormValues;
  slug: string;
}

/**
 * Create-workspace wizard (mockup screen.ws.create1 → screen.ws.create2).
 * «Продолжить» creates the workspace and advances; step 2 invites members into it by link —
 * an invite must point at a workspace that exists, which is what the real api will require
 * (UL-148). Going «Назад» and resubmitting the same values does not create a second
 * workspace; changed values create a new one (a PATCH for the first is beyond this ticket).
 */
export function CreateWorkspaceForm() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const createWorkspace = useWorkspaceCreate({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getWorkspaceListQueryKey() }),
    },
  });
  const [submitError, setSubmitError] = useState<string>();
  const [step, setStep] = useState<1 | 2>(1);
  const [created, setCreated] = useState<CreatedWorkspace>();
  const {
    register,
    handleSubmit,
    setValue,
    setError,
    getValues,
    watch,
    formState: { errors, isSubmitted },
  } = useForm<WorkspaceFormValues>({
    resolver: zodResolver(workspaceFormSchema),
    defaultValues: { name: '', slug: '' },
  });

  // dirtyFields would do it wrong: a cleared slug equals the default again, so it flips back
  // to "clean" and the suggestion would jump in. Once touched, the field is the user's.
  const slugEditedRef = useRef(false);
  const name = watch('name');
  useEffect(() => {
    if (slugEditedRef.current) return;
    const suggestion = slugify(name);
    // Only a new suggestion is written: the effect also runs when isSubmitted flips, and
    // re-validating the same address then would wipe the "taken" error the server just sent.
    if (getValues('slug') === suggestion) return;
    // After the first submit the suggestion is validated like typed input, so an error that
    // belongs to the previous address ("taken", "reserved") does not stay next to a new one.
    setValue('slug', suggestion, { shouldValidate: isSubmitted });
  }, [name, setValue, getValues, isSubmitted]);

  // "Отмена" or «Назад» during a create request: the workspace may still be created, but the
  // user has already left the step — the answer must not switch the screen. A newer attempt
  // makes an older in-flight request stale the same way.
  const attemptRef = useRef(0);
  const leaveAttempt = () => {
    attemptRef.current += 1;
  };

  const slugField = register('slug');

  const onSubmit = handleSubmit(
    async (values) => {
      // A banner left by a failed attempt with other values is not about this submit.
      setSubmitError(undefined);
      if (created?.values.name === values.name && created.values.slug === values.slug) {
        setStep(2);
        return;
      }
      const attempt = ++attemptRef.current;
      try {
        const workspace = await createWorkspace.mutateAsync({ data: values });
        if (attempt !== attemptRef.current) return;
        setCreated({ values, slug: workspace.slug });
        setStep(2);
      } catch (error) {
        if (attempt !== attemptRef.current) return;
        if (hasApiStatus(error, 409)) {
          // The fields stay editable during the request: "taken" is about the address that
          // was sent, so it is not shown next to one the user has typed since.
          if (getValues('slug') === values.slug) {
            setError(
              'slug',
              { message: 'Этот адрес уже занят — придумайте другой' },
              { shouldFocus: true },
            );
          }
          return;
        }
        if (isApiError(error)) {
          if (mapIssuesToFields(error, values, getValues, setError)) return;
          // The api answered, so the connection is fine: do not send the user to check it.
          setSubmitError('Сервер ответил ошибкой. Попробуйте ещё раз чуть позже.');
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

  return (
    <>
      <div className="flex flex-col gap-3">
        <Typography size="caption" color="text-secondary">
          {step === 1
            ? 'Шаг 1 из 2 — название и адрес'
            : `Шаг 2 из 2 — ${created?.values.name ?? ''}`}
        </Typography>
        <Progress
          value={step === 1 ? 50 : 100}
          aria-label={step === 1 ? 'Шаг 1 из 2' : 'Шаг 2 из 2'}
        />
        <Typography as="h1" size="h3">
          {step === 1 ? 'Создайте пространство' : 'Пригласите участников'}
        </Typography>
      </div>
      {submitError ? (
        <Alert palette="danger" title="Не удалось создать пространство" description={submitError} />
      ) : null}
      {/* The step-1 form stays mounted while hidden, so field values, refs and validation
          state survive stepping back and forth. */}
      <form
        onSubmit={onSubmit}
        noValidate
        hidden={step !== 1}
        className="flex w-full flex-col gap-5"
      >
        <Field label="Название" required error={errors.name?.message}>
          <Input placeholder="Команда маркетинга" autoFocus {...register('name')} />
        </Field>
        <Field
          label="Адрес"
          required
          hint="Адрес пространства — латиница, цифры и дефис"
          error={errors.slug?.message}
        >
          <Input
            prefix={`${PRODUCT_SLUG}.app/`}
            placeholder="my-team"
            {...slugField}
            onChange={(event) => {
              slugEditedRef.current = true;
              void slugField.onChange(event);
            }}
          />
        </Field>
        <div className="flex justify-end gap-3 pt-1">
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              leaveAttempt();
              router.push(routes.workspaces());
            }}
          >
            Отмена
          </Button>
          <Button type="submit" loading={createWorkspace.isPending}>
            Продолжить
          </Button>
        </div>
      </form>
      {step === 2 && created ? (
        <InviteMembersStep
          workspaceSlug={created.slug}
          onBack={() => {
            leaveAttempt();
            setStep(1);
          }}
          onOpen={() => {
            router.push(routes.workspace(created.slug));
          }}
        />
      ) : null}
    </>
  );
}

/**
 * Maps `{ issues: [{ path, message }] }` from a 400 onto the matching fields.
 * An issue is about the value that was sent: when the user has changed the field during the
 * request, it is recognised but not shown. Returns false when the error carries no
 * recognisable field issues — the caller shows the general banner then.
 */
function mapIssuesToFields(
  error: unknown,
  sent: WorkspaceFormValues,
  getValues: UseFormGetValues<WorkspaceFormValues>,
  setError: UseFormSetError<WorkspaceFormValues>,
): boolean {
  let recognised = false;
  for (const issue of getApiIssues(error)) {
    if (issue.path !== 'name' && issue.path !== 'slug') continue;
    recognised = true;
    // `sent.name` is trimmed by the schema, the field is not.
    const current = issue.path === 'name' ? getValues('name').trim() : getValues('slug');
    if (current === sent[issue.path]) setError(issue.path, { message: issue.message });
  }
  return recognised;
}
