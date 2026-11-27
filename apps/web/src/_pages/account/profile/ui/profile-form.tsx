'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { getApiIssues, isApiError } from '@/shared/api';
import { Alert, Avatar, Button, Field, Input, Select } from '@/shared/ui';
import { toast } from '@/shared/ui/toast';
import { useUpdateProfile, type ProfileMe } from '../api/profile';
import { TIMEZONE_OPTIONS, getBrowserTimeZone } from '../model/timezones';

// Client-side validation only, with Russian messages; the API re-checks against the contract.
// The name limits repeat RegisterRequestSchema (2–15 after trimming): a name the registration
// form refuses must not be reachable through the profile.
const ProfileFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Введите имя')
    .min(2, 'Имя — от 2 до 15 символов')
    .max(15, 'Имя — не длиннее 15 символов'),
  tz: z.string().min(1, 'Выберите часовой пояс'),
});
type ProfileFormValues = z.infer<typeof ProfileFormSchema>;

const FIELDS: readonly (keyof ProfileFormValues)[] = ['name', 'tz'];

export function ProfileForm({ initial }: { initial: ProfileMe }) {
  const updateProfile = useUpdateProfile();
  const [submitError, setSubmitError] = useState<string>();
  const {
    register,
    control,
    handleSubmit,
    setError,
    watch,
    reset,
    formState: { errors, isDirty },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(ProfileFormSchema),
    // Mounted only once the profile is loaded (the page gates on isPending), so these are real
    // server values. `values` (not `defaultValues`) keeps the form in step with the me cache: a
    // refetch that brings a name changed elsewhere updates the untouched fields, so a later save
    // does not send the stale one back. Fields the user has edited keep their input.
    values: { name: initial.name, tz: initial.tz ?? getBrowserTimeZone() },
    resetOptions: { keepDirtyValues: true },
  });

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(undefined);
    try {
      // The saved answer becomes the new baseline: the submit goes disabled again. A plain
      // reset() inherits resetOptions and would leave the saved fields marked as edited, so
      // the next refetch could no longer update them.
      const saved = await updateProfile.mutateAsync({ data: values });
      reset({ name: saved.name, tz: saved.tz }, { keepDirtyValues: false });
      toast({ title: 'Профиль обновлён' });
    } catch (error) {
      if (isApiError(error)) {
        let recognised = false;
        for (const issue of getApiIssues(error)) {
          const field = FIELDS.find((name) => name === issue.path);
          if (!field) continue;
          setError(field, { type: 'server', message: issue.message }, { shouldFocus: !recognised });
          recognised = true;
        }
        if (!recognised) {
          setSubmitError('Сервер ответил ошибкой. Попробуйте ещё раз чуть позже.');
        }
        return;
      }
      setSubmitError('Проверьте подключение к сети и попробуйте ещё раз.');
    }
  });

  return (
    <form method="post" onSubmit={onSubmit} noValidate className="flex w-full flex-col gap-5">
      {submitError ? (
        <Alert palette="danger" title="Не удалось сохранить профиль" description={submitError} />
      ) : null}

      {/* Live preview: empty input would render blank initials, so fall back to the name. */}
      <Avatar name={watch('name') || initial.name} size="l" />

      {/* Fields lock while saving so the post-submit reset cannot clobber in-flight edits. */}
      <Field label={<span className="text-fg-secondary">Имя</span>} error={errors.name?.message}>
        <Input
          type="text"
          autoComplete="name"
          aria-required
          autoFocus
          className="px-3.5"
          disabled={updateProfile.isPending}
          {...register('name')}
        />
      </Field>

      <Controller
        name="tz"
        control={control}
        render={({ field }) => (
          <Field
            label={<span className="text-fg-secondary">Часовой пояс</span>}
            error={errors.tz?.message}
          >
            <Select
              searchable
              options={TIMEZONE_OPTIONS}
              aria-label="Часовой пояс"
              disabled={updateProfile.isPending}
              value={field.value ? [field.value] : []}
              onValueChange={(values) => {
                field.onChange(values[0]);
              }}
            />
          </Field>
        )}
      />

      <Button
        type="submit"
        size="l"
        loading={updateProfile.isPending}
        disabled={!isDirty}
        fullWidth
      >
        Сохранить
      </Button>
    </form>
  );
}
