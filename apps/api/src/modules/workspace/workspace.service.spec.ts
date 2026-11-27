import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
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
  const getWorkspaceRole = vi.fn<AccessService['getWorkspaceRole']>();
  const can = vi.fn<AccessService['can']>();
  const listMembers = vi.fn<WorkspaceRepository['listMembers']>();
  const changeMemberRole = vi.fn<WorkspaceRepository['changeMemberRole']>();
  const service = new WorkspaceService(
    {
      createWithOwner,
      findAllForUser,
      findBySlug,
      listMembers,
      changeMemberRole,
    } as unknown as WorkspaceRepository,
    { can, getWorkspaceRole } as unknown as AccessService,
  );
  return {
    service,
    createWithOwner,
    findAllForUser,
    findBySlug,
    listMembers,
    changeMemberRole,
    can,
    getWorkspaceRole,
  };
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
    const { service, findBySlug, can, getWorkspaceRole } = setup();
    findBySlug.mockResolvedValue(workspace);
    can.mockResolvedValue(true);
    getWorkspaceRole.mockResolvedValue('OWNER');

    await expect(service.getBySlugForUser(input.slug, userId)).resolves.toEqual({
      ...workspace,
      role: 'OWNER',
      canCreateProject: true,
    });
    expect(findBySlug).toHaveBeenCalledExactlyOnceWith(input.slug);
    expect(can).toHaveBeenNthCalledWith(1, { id: userId }, 'workspace.read', {
      workspaceId: workspace.id,
    });
    expect(can).toHaveBeenNthCalledWith(2, { id: userId }, 'project.create', {
      workspaceId: workspace.id,
    });
    expect(getWorkspaceRole).toHaveBeenCalledExactlyOnceWith({ id: userId }, workspace.id);
  });

  it.each([workspace, null])(
    'returns the same 404 for a hidden or absent workspace',
    async (found) => {
      const { service, findBySlug, can, getWorkspaceRole } = setup();
      findBySlug.mockResolvedValue(found);
      can.mockResolvedValue(false);

      await expect(service.getBySlugForUser(input.slug, userId)).rejects.toThrow(
        new NotFoundException('Workspace not found'),
      );
      expect(getWorkspaceRole).not.toHaveBeenCalled();
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

describe('WorkspaceService.listMembers', () => {
  const workspace = { id: '019a8f00-0000-7000-8000-000000000004', ...input };
  const memberId = '019a8f00-0000-7000-8000-000000000005';

  it('checks workspace.member.list and returns only the ID, name and role of each member', async () => {
    const { service, findBySlug, can, listMembers } = setup();
    findBySlug.mockResolvedValue(workspace);
    can.mockResolvedValue(true);
    listMembers.mockResolvedValue([{ userId: memberId, role: 'ADMIN', user: { name: 'Ada' } }]);

    await expect(service.listMembers(input.slug, userId)).resolves.toEqual([
      { userId: memberId, name: 'Ada', role: 'ADMIN' },
    ]);
    expect(can).toHaveBeenCalledExactlyOnceWith({ id: userId }, 'workspace.member.list', {
      workspaceId: workspace.id,
    });
    expect(listMembers).toHaveBeenCalledExactlyOnceWith(workspace.id);
  });

  it.each([workspace, null])(
    'returns the same 404 for a hidden or absent workspace',
    async (found) => {
      const { service, findBySlug, can, listMembers } = setup();
      findBySlug.mockResolvedValue(found);
      can.mockResolvedValue(false);

      await expect(service.listMembers(input.slug, userId)).rejects.toThrow(
        new NotFoundException('Workspace not found'),
      );
      expect(listMembers).not.toHaveBeenCalled();
    },
  );
});

describe('WorkspaceService.changeMemberRole', () => {
  const workspace = { id: '019a8f00-0000-7000-8000-000000000004', ...input };
  const targetId = '019a8f00-0000-7000-8000-000000000005';
  const updated = { userId: targetId, role: 'ADMIN' as const, user: { name: 'Ada' } };

  it('authorizes with the current and requested roles, then updates from the role it checked', async () => {
    const { service, findBySlug, can, getWorkspaceRole, changeMemberRole } = setup();
    findBySlug.mockResolvedValue(workspace);
    can.mockResolvedValue(true);
    getWorkspaceRole.mockResolvedValue('MEMBER');
    changeMemberRole.mockResolvedValue(updated);

    await expect(service.changeMemberRole(input.slug, userId, targetId, 'ADMIN')).resolves.toEqual({
      userId: targetId,
      name: 'Ada',
      role: 'ADMIN',
    });
    expect(getWorkspaceRole).toHaveBeenCalledExactlyOnceWith({ id: targetId }, workspace.id);
    expect(can).toHaveBeenLastCalledWith({ id: userId }, 'workspace.member.role.change', {
      workspaceId: workspace.id,
      targetRole: 'MEMBER',
      newRole: 'ADMIN',
    });
    expect(changeMemberRole).toHaveBeenCalledExactlyOnceWith(
      workspace.id,
      targetId,
      'MEMBER',
      'ADMIN',
    );
  });

  it.each([workspace, null])(
    'returns 404 before looking at the target when the workspace is hidden or absent',
    async (found) => {
      const { service, findBySlug, can, getWorkspaceRole, changeMemberRole } = setup();
      findBySlug.mockResolvedValue(found);
      can.mockResolvedValue(false);

      await expect(service.changeMemberRole(input.slug, userId, targetId, 'ADMIN')).rejects.toThrow(
        new NotFoundException('Workspace not found'),
      );
      expect(getWorkspaceRole).not.toHaveBeenCalled();
      expect(changeMemberRole).not.toHaveBeenCalled();
    },
  );

  it('returns 404 when the target is not an active member of this workspace', async () => {
    const { service, findBySlug, can, getWorkspaceRole, changeMemberRole } = setup();
    findBySlug.mockResolvedValue(workspace);
    can.mockResolvedValue(true);
    getWorkspaceRole.mockResolvedValue(null);

    await expect(service.changeMemberRole(input.slug, userId, targetId, 'ADMIN')).rejects.toThrow(
      new NotFoundException('Workspace member not found'),
    );
    expect(changeMemberRole).not.toHaveBeenCalled();
  });

  it('returns 403 without writing when the access matrix refuses the change', async () => {
    const { service, findBySlug, can, getWorkspaceRole, changeMemberRole } = setup();
    findBySlug.mockResolvedValue(workspace);
    can.mockImplementation((_user, permission) => Promise.resolve(permission === 'workspace.read'));
    getWorkspaceRole.mockResolvedValue('OWNER');

    await expect(service.changeMemberRole(input.slug, userId, targetId, 'ADMIN')).rejects.toThrow(
      new ForbiddenException('Role change forbidden'),
    );
    expect(changeMemberRole).not.toHaveBeenCalled();
  });

  it('returns 409 when the role changed between the check and the update', async () => {
    const { service, findBySlug, can, getWorkspaceRole, changeMemberRole } = setup();
    findBySlug.mockResolvedValue(workspace);
    can.mockResolvedValue(true);
    getWorkspaceRole.mockResolvedValue('MEMBER');
    changeMemberRole.mockResolvedValue(undefined);

    await expect(service.changeMemberRole(input.slug, userId, targetId, 'ADMIN')).rejects.toThrow(
      new ConflictException('Workspace member changed concurrently'),
    );
  });
});
