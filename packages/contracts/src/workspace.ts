import { z } from 'zod';

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
