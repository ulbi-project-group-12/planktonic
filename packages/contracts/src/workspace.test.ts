import { describe, expect, it } from 'vitest';
import {
  CreateWorkspaceRequestSchema,
  ListWorkspacesResponseSchema,
  WORKSPACE_NAME_MAX_LENGTH,
  WorkspaceResponseSchema,
  WorkspaceSlug,
  WorkspaceSlugConflictResponseSchema,
  WorkspaceSlugParamsSchema,
} from './workspace.js';

describe('WorkspaceSlug', () => {
  it.each(['my-team', 'a', 'ulbi-group-12', 'x1'])('accepts %s', (slug) => {
    expect(WorkspaceSlug.safeParse(slug).success).toBe(true);
  });

  it.each([
    ['uppercase', 'My-Team'],
    ['leading hyphen', '-team'],
    ['trailing hyphen', 'team-'],
    ['underscore', 'my_team'],
    ['empty', ''],
    ['too long', 'a'.repeat(41)],
    ['reserved create', 'create'],
  ])('rejects %s', (_, slug) => {
    expect(WorkspaceSlug.safeParse(slug).success).toBe(false);
  });

  it('accepts a 40-character slug', () => {
    expect(WorkspaceSlug.safeParse('a'.repeat(40)).success).toBe(true);
  });
});

const workspace = {
  id: '019a8f00-0000-7000-8000-000000000004',
  name: 'My team',
  slug: 'my-team',
};

describe('CreateWorkspaceRequestSchema', () => {
  it('trims the name before validating it', () => {
    expect(
      CreateWorkspaceRequestSchema.parse({ name: '  My team  ', slug: workspace.slug }),
    ).toEqual({ name: workspace.name, slug: workspace.slug });
  });

  it('accepts a name at the maximum length', () => {
    const name = 'a'.repeat(WORKSPACE_NAME_MAX_LENGTH);
    expect(CreateWorkspaceRequestSchema.parse({ name, slug: workspace.slug }).name).toBe(name);
  });

  it.each(['   ', 'a'.repeat(WORKSPACE_NAME_MAX_LENGTH + 1), 'My\u0000team'])(
    'reports invalid name %j on the name field',
    (name) => {
      const result = CreateWorkspaceRequestSchema.safeParse({ name, slug: workspace.slug });
      expect(result.error?.issues).toEqual([expect.objectContaining({ path: ['name'] })]);
    },
  );

  it('rejects a reserved slug', () => {
    expect(
      CreateWorkspaceRequestSchema.safeParse({ name: workspace.name, slug: 'create' }).success,
    ).toBe(false);
  });
});

describe('workspace responses', () => {
  it('accepts a workspace with a UUIDv7 and rejects a UUIDv4', () => {
    expect(WorkspaceResponseSchema.parse(workspace)).toEqual(workspace);
    const id = '550e8400-e29b-41d4-a716-446655440000';
    expect(WorkspaceResponseSchema.safeParse({ ...workspace, id }).success).toBe(false);
  });

  it('accepts empty and populated workspace lists', () => {
    expect(ListWorkspacesResponseSchema.parse([])).toEqual([]);
    expect(ListWorkspacesResponseSchema.parse([workspace])).toEqual([workspace]);
  });
});

describe('WorkspaceSlugParamsSchema', () => {
  it('accepts a workspace slug and rejects a reserved route', () => {
    expect(WorkspaceSlugParamsSchema.parse({ slug: workspace.slug })).toEqual({
      slug: workspace.slug,
    });
    expect(WorkspaceSlugParamsSchema.safeParse({ slug: 'create' }).success).toBe(false);
  });
});

describe('WorkspaceSlugConflictResponseSchema', () => {
  const conflict = {
    statusCode: 409,
    message: 'Workspace slug is already taken',
    error: 'Conflict',
    issues: [{ path: 'slug', message: 'This slug is already taken' }],
  };

  it('accepts a 409 response with a slug field error', () => {
    expect(WorkspaceSlugConflictResponseSchema.parse(conflict)).toEqual(conflict);
  });

  it('rejects a conflict without a slug field error', () => {
    expect(WorkspaceSlugConflictResponseSchema.safeParse({ ...conflict, issues: [] }).success).toBe(
      false,
    );
    const issues = [{ path: 'name', message: 'This name is already taken' }];
    expect(WorkspaceSlugConflictResponseSchema.safeParse({ ...conflict, issues }).success).toBe(
      false,
    );
  });
});
