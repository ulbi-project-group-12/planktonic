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

/**
 * Create-workspace wizard (mockup screen.ws.create1 → screen.ws.create2).
 * Step 1 collects name and address — «Продолжить» only validates and advances; the workspace
 * is created by step 2's «Создать пространство». Field errors that the api sends back land
 * on step 1: a 409 on the slug and field issues of a 400 return the user there.
 * The slug is suggested from the name until the user edits the address field.
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
  const [draft, setDraft] = useState<WorkspaceFormValues>();
  const {
    register,
    handleSubmit,
    setValue,
    setError,
    setFocus,
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
  // user has already left the step, so the answer must not pull them to another page.
  const leftRef = useRef<boolean>(false);
  // A re-entered step 2 starts a new attempt: a late answer of the previous request is stale.
  const attemptRef = useRef(0);

  // A slug error arrives while the user sits on step 2; the address field is back on screen
  // only after step 1 renders — focus it exactly once, when that happens.
  const focusSlugRef = useRef(false);
  useEffect(() => {
    if (!focusSlugRef.current || step !== 1) return;
    focusSlugRef.current = false;
    setFocus('slug');
  }, [step, setFocus]);

  const slugField = register('slug');

  const onSubmit = handleSubmit(
    (values) => {
      // Entering step 2 again is a fresh attempt: the earlier «Назад» no longer counts.
      leftRef.current = false;
      setDraft(values);
      setStep(2);
    },
    () => {
      // Invalid fields: the banner of the previous attempt no longer describes what is wrong.
      setSubmitError(undefined);
    },
  );

  async function createAndOpen() {
    if (!draft) return;
    const attempt = ++attemptRef.current;
    setSubmitError(undefined);
    try {
      const workspace = await createWorkspace.mutateAsync({ data: draft });
      if (attempt === attemptRef.current && !leftRef.current) {
        router.push(routes.workspace(workspace.slug));
      }
    } catch (error) {
      if (attempt !== attemptRef.current || leftRef.current) return;
      if (hasApiStatus(error, 409)) {
        // The fields stay editable between steps: "taken" is about the address that was
        // sent, so it is not shown next to one the user has typed since.
        setStep(1);
        if (getValues('slug') === draft.slug) {
          setError('slug', { message: 'Этот адрес уже занят — придумайте другой' });
          focusSlugRef.current = true;
        }
        return;
      }
      if (isApiError(error)) {
        if (mapIssuesToFields(error, draft, getValues, setError)) {
          if (getApiIssues(error).some((issue) => issue.path === 'slug')) {
            focusSlugRef.current = true;
          }
          setStep(1);
          return;
        }
        // The api answered, so the connection is fine: do not send the user to check it.
        setSubmitError('Сервер ответил ошибкой. Попробуйте ещё раз чуть позже.');
        return;
      }
      setSubmitError('Проверьте подключение к сети и попробуйте ещё раз.');
    }
  }

  return (
    <>
      <div className="flex flex-col gap-3">
        <Typography size="caption" color="text-secondary">
          {step === 1 ? 'Шаг 1 из 2 — название и адрес' : `Шаг 2 из 2 — ${draft?.name ?? ''}`}
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
              leftRef.current = true;
              router.push(routes.workspaces());
            }}
          >
            Отмена
          </Button>
          <Button type="submit">Продолжить</Button>
        </div>
      </form>
      {step === 2 && draft ? (
        <InviteMembersStep
          workspaceSlug={draft.slug}
          creating={createWorkspace.isPending}
          onBack={() => {
            leftRef.current = true;
            setStep(1);
          }}
          onCreate={() => {
            void createAndOpen();
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
