'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type UseFormSetError } from 'react-hook-form';
import { PRODUCT_SLUG } from '@app/config/product';
import { getApiIssues, hasApiStatus, isApiError } from '@/shared/api';
import { routes } from '@/shared/config';
import { Alert, Button, Field, Input } from '@/shared/ui';
import { useCreateWorkspace } from '../api/create-workspace';
import { workspaceFormSchema, type WorkspaceFormValues } from '../model/form-schema';
import { slugify } from '../model/slugify';

/**
 * Create-workspace form, step 1 of the flow (mockup screen.ws.create1): name and address.
 * The slug is suggested from the name until the user edits the address field.
 * A 409 lands on the slug field; anything else shows a banner and keeps the entered values.
 */
export function CreateWorkspaceForm() {
  const router = useRouter();
  const createWorkspace = useCreateWorkspace();
  const [submitError, setSubmitError] = useState<string>();
  const {
    register,
    handleSubmit,
    setValue,
    setError,
    watch,
    formState: { errors, dirtyFields },
  } = useForm<WorkspaceFormValues>({
    resolver: zodResolver(workspaceFormSchema),
    defaultValues: { name: '', slug: '' },
  });

  const name = watch('name');
  const slugDirty = Boolean(dirtyFields.slug);
  useEffect(() => {
    if (!slugDirty) setValue('slug', slugify(name));
  }, [name, slugDirty, setValue]);

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(undefined);
    try {
      const workspace = await createWorkspace.mutateAsync(values);
      router.push(routes.workspace(workspace.slug));
    } catch (error) {
      if (hasApiStatus(error, 409)) {
        setError('slug', { message: 'Этот адрес уже занят — придумайте другой' });
        return;
      }
      if (isApiError(error) && mapIssuesToFields(error, setError)) return;
      setSubmitError('Проверьте подключение к сети и попробуйте ещё раз.');
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex w-full flex-col gap-5">
      {submitError ? (
        <Alert palette="danger" title="Не удалось создать пространство" description={submitError} />
      ) : null}
      <Field label="Название" required error={errors.name?.message}>
        <Input placeholder="Команда маркетинга" autoFocus {...register('name')} />
      </Field>
      <Field
        label="Адрес"
        required
        hint="Адрес пространства — латиница, цифры и дефис"
        error={errors.slug?.message}
      >
        <Input prefix={`${PRODUCT_SLUG}.app/`} placeholder="my-team" {...register('slug')} />
      </Field>
      <div className="flex justify-end gap-3 pt-1">
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
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
  );
}

/**
 * Maps `{ issues: [{ path, message }] }` from a 400 onto the matching fields.
 * Returns false when the error carries no recognisable field issues — the caller
 * shows the general banner then.
 */
function mapIssuesToFields(
  error: unknown,
  setError: UseFormSetError<WorkspaceFormValues>,
): boolean {
  let mapped = false;
  for (const issue of getApiIssues(error)) {
    if (issue.path === 'name' || issue.path === 'slug') {
      setError(issue.path, { message: issue.message });
      mapped = true;
    }
  }
  return mapped;
}
