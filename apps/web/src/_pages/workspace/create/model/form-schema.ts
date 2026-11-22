import { RESERVED_WORKSPACE_SLUGS, WORKSPACE_SLUG_PATTERN } from '@app/contracts';
import { z } from 'zod';

/** Form values of the create-workspace step: slug rules come from the shared contract. */
export const workspaceFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { error: 'Введите название пространства' })
    .max(80, { error: 'Название — не длиннее 80 символов' }),
  slug: z
    .string()
    .regex(WORKSPACE_SLUG_PATTERN, {
      error: 'Только латиница, цифры и дефис, без дефиса в начале и в конце',
    })
    .refine((slug) => !(RESERVED_WORKSPACE_SLUGS as readonly string[]).includes(slug), {
      error: 'Этот адрес зарезервирован',
    }),
});

export type WorkspaceFormValues = z.infer<typeof workspaceFormSchema>;
