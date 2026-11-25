import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WsRole } from '../../generated/prisma/enums.js';
import type { AccessRepository } from './access.repository.js';
import { AccessService, type Permission } from './access.service.js';

const { OWNER, ADMIN, MEMBER } = WsRole;
const user = { id: 'actor' };
const workspaceId = 'workspace';
const scope = { workspaceId };

describe('AccessService', () => {
  const repository = {
    findWorkspaceRole: vi.fn<AccessRepository['findWorkspaceRole']>(),
    isActiveUser: vi.fn<AccessRepository['isActiveUser']>(),
  };
  const service = new AccessService(repository as unknown as AccessRepository);

  beforeEach(() => {
    repository.findWorkspaceRole.mockReset().mockResolvedValue(null);
    repository.isActiveUser.mockReset().mockResolvedValue(true);
  });

  it('looks up the role for the given user and workspace', async () => {
    repository.findWorkspaceRole.mockResolvedValue(ADMIN);
    await expect(service.getWorkspaceRole(user, workspaceId)).resolves.toBe(ADMIN);
    expect(repository.findWorkspaceRole).toHaveBeenCalledWith(user.id, workspaceId);
  });

  const matrix = [
    ['workspace.read', {}, true, true, true],
    ['workspace.update', {}, true, true, false],
    ['workspace.member.list', {}, true, true, true],
    ['workspace.member.remove', { targetRole: MEMBER }, true, true, false],
    ['workspace.member.role.change', { targetRole: MEMBER, newRole: ADMIN }, true, false, false],
    ['workspace.ownership.transfer', { targetUserId: 'target' }, true, false, false],
    ['workspace.leave', {}, false, true, true],
    ['workspace.invite.create', { targetRole: MEMBER }, true, true, false],
    ['workspace.invite.list', { targetRole: MEMBER }, true, true, false],
    ['workspace.invite.revoke', { targetRole: MEMBER }, true, true, false],
    ['project.create', {}, true, true, false],
  ] as const satisfies readonly (readonly [Permission, object, boolean, boolean, boolean])[];

  it.each(matrix)(
    '%s follows the role matrix',
    async (permission, context, owner, admin, member) => {
      const cases = [
        [OWNER, owner],
        [ADMIN, admin],
        [MEMBER, member],
      ] as const;
      for (const [role, allowed] of cases) {
        repository.findWorkspaceRole.mockImplementation((id) =>
          Promise.resolve(id === user.id ? role : MEMBER),
        );
        await expect(service.can(user, permission, { ...scope, ...context })).resolves.toBe(
          allowed,
        );
      }
    },
  );

  it.each([
    [OWNER, ADMIN, true],
    [OWNER, OWNER, false],
    [ADMIN, ADMIN, false],
    [ADMIN, OWNER, false],
  ] as const)('allows %s to remove %s: %s', async (role, targetRole, expected) => {
    repository.findWorkspaceRole.mockResolvedValue(role);
    await expect(
      service.can(user, 'workspace.member.remove', { ...scope, targetRole }),
    ).resolves.toBe(expected);
  });

  it.each([
    [ADMIN, MEMBER, true],
    [MEMBER, OWNER, false],
    [OWNER, ADMIN, false],
  ] as const)('allows OWNER to change %s to %s: %s', async (targetRole, newRole, expected) => {
    repository.findWorkspaceRole.mockResolvedValue(OWNER);
    await expect(
      service.can(user, 'workspace.member.role.change', { ...scope, targetRole, newRole }),
    ).resolves.toBe(expected);
  });

  it.each(['workspace.invite.create', 'workspace.invite.list', 'workspace.invite.revoke'])(
    '%s limits invitations by target role',
    async (permission) => {
      repository.findWorkspaceRole.mockResolvedValue(ADMIN);
      await expect(service.can(user, permission, { ...scope, targetRole: ADMIN })).resolves.toBe(
        false,
      );
      repository.findWorkspaceRole.mockResolvedValue(OWNER);
      await expect(service.can(user, permission, { ...scope, targetRole: ADMIN })).resolves.toBe(
        true,
      );
    },
  );

  it('requires an active target membership in the same workspace for ownership transfer', async () => {
    repository.findWorkspaceRole.mockResolvedValueOnce(OWNER).mockResolvedValueOnce(null);
    await expect(
      service.can(user, 'workspace.ownership.transfer', { ...scope, targetUserId: 'target' }),
    ).resolves.toBe(false);
    expect(repository.findWorkspaceRole).toHaveBeenLastCalledWith('target', workspaceId);
  });

  it('denies absent membership, missing context and unknown permissions', async () => {
    await expect(service.can(user, 'workspace.read', scope)).resolves.toBe(false);
    repository.findWorkspaceRole.mockResolvedValue(OWNER);
    await expect(service.can(user, 'workspace.update')).resolves.toBe(false);
    await expect(service.can(user, 'workspace.member.remove', scope)).resolves.toBe(false);
    await expect(service.can(user, 'toString', scope)).resolves.toBe(false);
  });

  it('allows active users to create a workspace before joining one', async () => {
    await expect(service.can(user, 'workspace.create')).resolves.toBe(true);
    repository.isActiveUser.mockResolvedValue(false);
    await expect(service.can(user, 'workspace.create')).resolves.toBe(false);
  });

  it.each([
    [true, null, undefined, true, true],
    [true, 'member@example.com', 'Member@example.com', true, true],
    [true, 'member@example.com', 'other@example.com', true, false],
    [true, 'member@example.com', undefined, true, false],
    [false, null, undefined, true, false],
    [true, null, undefined, false, false],
  ] as const)(
    'checks invitation validity, verified email and active user (%#)',
    async (valid, email, verifiedEmail, active, expected) => {
      repository.isActiveUser.mockResolvedValue(active);
      const invitation = { valid, email };
      const context = verifiedEmail === undefined ? { invitation } : { invitation, verifiedEmail };
      await expect(service.can(user, 'workspace.invite.accept', context)).resolves.toBe(expected);
    },
  );
});
