import { ConflictException, NotFoundException } from '@nestjs/common';
import { CreateWorkspaceRequestSchema, WorkspaceSlugConflictResponseSchema } from '@app/contracts';
import { describe, expect, it, vi } from 'vitest';
import type { AccessService } from '../../core/access/access.service.js';
import type { WorkspaceRepository } from './workspace.repository.js';
import { WorkspaceService } from './workspace.service.js';

const input = CreateWorkspaceRequestSchema.parse({ name: 'My team', slug: 'my-team' });
const userId = 'user-id';

function setup() {
  const createWithOwner = vi.fn<WorkspaceRepository['createWithOwner']>();
  const findAllForUser = vi.fn<WorkspaceRepository['findAllForUser']>();
  const findBySlug = vi.fn<WorkspaceRepository['findBySlug']>();
  const can = vi.fn<AccessService['can']>();
  const service = new WorkspaceService(
    { createWithOwner, findAllForUser, findBySlug } as unknown as WorkspaceRepository,
    { can } as unknown as AccessService,
  );
  return { service, createWithOwner, findAllForUser, findBySlug, can };
}

describe('WorkspaceService.listForUser', () => {
  it('passes the user ID to the repository and returns the workspace list', async () => {
    const { service, findAllForUser } = setup();
    const workspace = { id: '019a8f00-0000-7000-8000-000000000004', ...input };
    findAllForUser.mockResolvedValue([workspace]);

    await expect(service.listForUser(userId)).resolves.toEqual([workspace]);
    expect(findAllForUser).toHaveBeenCalledExactlyOnceWith(userId);
  });

  it('returns an empty list for a user without memberships', async () => {
    const { service, findAllForUser } = setup();
    findAllForUser.mockResolvedValue([]);

    await expect(service.listForUser(userId)).resolves.toEqual([]);
  });
});

describe('WorkspaceService.getBySlugForUser', () => {
  const workspace = { id: '019a8f00-0000-7000-8000-000000000004', ...input };

  it('resolves the slug and delegates access for the workspace ID', async () => {
    const { service, findBySlug, can } = setup();
    findBySlug.mockResolvedValue(workspace);
    can.mockResolvedValue(true);

    await expect(service.getBySlugForUser(input.slug, userId)).resolves.toEqual(workspace);
    expect(findBySlug).toHaveBeenCalledExactlyOnceWith(input.slug);
    expect(can).toHaveBeenCalledExactlyOnceWith({ id: userId }, 'workspace.read', {
      workspaceId: workspace.id,
    });
  });

  it.each([workspace, null])(
    'returns the same 404 for a hidden or absent workspace',
    async (found) => {
      const { service, findBySlug, can } = setup();
      findBySlug.mockResolvedValue(found);
      can.mockResolvedValue(false);

      await expect(service.getBySlugForUser(input.slug, userId)).rejects.toThrow(
        new NotFoundException('Workspace not found'),
      );
    },
  );
});

describe('WorkspaceService.create', () => {
  it('requests a workspace for the current user and returns the workspace response', async () => {
    const { service, createWithOwner } = setup();
    const workspace = { id: '019a8f00-0000-7000-8000-000000000004', ...input };
    createWithOwner.mockResolvedValue(workspace);

    await expect(service.create(input, userId)).resolves.toEqual(workspace);
    expect(createWithOwner).toHaveBeenCalledExactlyOnceWith(input, userId);
  });

  it('throws a 409 with the documented slug field error when the slug is taken', async () => {
    const { service, createWithOwner } = setup();
    createWithOwner.mockResolvedValue(null);

    const error: unknown = await service.create(input, userId).catch((cause: unknown) => cause);

    expect(error).toBeInstanceOf(ConflictException);
    if (!(error instanceof ConflictException)) throw error;
    expect(error.getStatus()).toBe(409);
    expect(WorkspaceSlugConflictResponseSchema.parse(error.getResponse()).issues).toEqual([
      { path: 'slug', message: 'This slug is already taken' },
    ]);
  });

  it('propagates repository failures', async () => {
    const { service, createWithOwner } = setup();
    const failure = new Error('Database unavailable');
    createWithOwner.mockRejectedValue(failure);

    await expect(service.create(input, userId)).rejects.toBe(failure);
  });
});
