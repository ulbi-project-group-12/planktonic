import { z } from 'zod';

/** Project key: an uppercase letter, then 1–9 uppercase letters or digits (e.g. `WEB`). */
export const PROJECT_KEY_PATTERN = /^[A-Z][A-Z0-9]{1,9}$/;

export const ProjectKey = z
  .string()
  .regex(PROJECT_KEY_PATTERN, { error: 'Expected a project key like WEB' })
  .brand<'ProjectKey'>();

export type ProjectKey = z.infer<typeof ProjectKey>;
