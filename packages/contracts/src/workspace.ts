import { z } from 'zod';
import { HttpErrorResponse } from './errors.js';

/** Workspace slug: lowercase Latin letters, digits and inner hyphens, 1–40 characters. */
export const WORKSPACE_SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/;

/** Slugs that shadow routes under `/workspaces`. */
export const RESERVED_WORKSPACE_SLUGS = ['create'] as const;

export const WorkspaceSlug = z
  .string()
  .regex(WORKSPACE_SLUG_PATTERN, { error: 'Expected a workspace slug like my-team' })
  .refine((slug) => !(RESERVED_WORKSPACE_SLUGS as readonly string[]).includes(slug), {
    error: 'This slug is reserved',
  })
  .brand<'WorkspaceSlug'>();

export type WorkspaceSlug = z.infer<typeof WorkspaceSlug>;

/** Longest workspace name, in characters (after trimming). */
export const WORKSPACE_NAME_MAX_LENGTH = 80;

export const CreateWorkspaceRequestSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1)
    .max(WORKSPACE_NAME_MAX_LENGTH)
    // PostgreSQL text cannot store U+0000: without this check the insert fails with a 500.
    .refine((name) => !name.includes('\u0000'), 'Name must not contain a null character'),
  slug: WorkspaceSlug,
});

export type CreateWorkspaceRequest = z.infer<typeof CreateWorkspaceRequestSchema>;

export const WorkspaceResponseSchema = z.object({
  id: z.uuidv7(),
  name: z.string(),
  slug: WorkspaceSlug,
});

export type WorkspaceResponse = z.infer<typeof WorkspaceResponseSchema>;

export const ListWorkspacesResponseSchema = z.array(WorkspaceResponseSchema);

export type ListWorkspacesResponse = z.infer<typeof ListWorkspacesResponseSchema>;

export const WorkspaceSlugParamsSchema = z.object({ slug: WorkspaceSlug });

export type WorkspaceSlugParams = z.infer<typeof WorkspaceSlugParamsSchema>;

export const WorkspaceSlugConflictResponseSchema = HttpErrorResponse.extend({
  statusCode: z.literal(409),
  issues: z.array(z.object({ path: z.literal('slug'), message: z.string() })).min(1),
});

export type WorkspaceSlugConflictResponse = z.infer<typeof WorkspaceSlugConflictResponseSchema>;
