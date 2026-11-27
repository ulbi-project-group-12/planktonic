import { z } from 'zod';
import { HttpErrorResponse } from './errors.js';
import { WorkspaceSlugParamsSchema } from './workspace.js';

export const PROJECT_KEY_PATTERN = /^[A-Z][A-Z0-9]{1,9}$/;

export const ProjectKey = z
  .string()
  .regex(PROJECT_KEY_PATTERN, { error: 'Expected a project key like WEB' })
  .brand<'ProjectKey'>();

export type ProjectKey = z.infer<typeof ProjectKey>;

export const PROJECT_NAME_MAX_LENGTH = 80;
export const PROJECT_DESCRIPTION_MAX_LENGTH = 1_000;

export const CreateProjectRequestSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1)
    .max(PROJECT_NAME_MAX_LENGTH)
    .refine((name) => !name.includes('\u0000'), 'Name must not contain a null character'),
  key: ProjectKey,
  description: z
    .string()
    .trim()
    .max(PROJECT_DESCRIPTION_MAX_LENGTH)
    .refine(
      (description) => !description.includes('\u0000'),
      'Description must not contain a null character',
    )
    .default(''),
});

export type CreateProjectRequest = z.infer<typeof CreateProjectRequestSchema>;

export const ProjectResponseSchema = z.object({
  id: z.uuidv7(),
  name: z.string(),
  key: ProjectKey,
  description: z.string(),
});

export type ProjectResponse = z.infer<typeof ProjectResponseSchema>;

export const ListProjectsResponseSchema = z.array(ProjectResponseSchema);

export type ListProjectsResponse = z.infer<typeof ListProjectsResponseSchema>;

export const ProjectKeyParamsSchema = WorkspaceSlugParamsSchema.extend({ key: ProjectKey });

export type ProjectKeyParams = z.infer<typeof ProjectKeyParamsSchema>;

export const ProjectKeyConflictResponseSchema = HttpErrorResponse.extend({
  statusCode: z.literal(409),
  issues: z.array(z.object({ path: z.literal('key'), message: z.string() })).min(1),
});

export type ProjectKeyConflictResponse = z.infer<typeof ProjectKeyConflictResponseSchema>;
