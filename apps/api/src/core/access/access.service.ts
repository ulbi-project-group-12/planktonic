import { Injectable } from '@nestjs/common';
import type { WsRole } from '../../generated/prisma/enums.js';
import { AccessRepository } from './access.repository.js';

const OWNER = 'OWNER' satisfies WsRole;
const ADMIN = 'ADMIN' satisfies WsRole;
const MEMBER = 'MEMBER' satisfies WsRole;

const workspaceRoles = {
  'workspace.read': [OWNER, ADMIN, MEMBER],
  'workspace.update': [OWNER, ADMIN],
  'workspace.member.list': [OWNER, ADMIN, MEMBER],
  'workspace.member.remove': [OWNER, ADMIN],
  'workspace.member.role.change': [OWNER],
  'workspace.ownership.transfer': [OWNER],
  'workspace.leave': [ADMIN, MEMBER],
  'workspace.invite.create': [OWNER, ADMIN],
  'workspace.invite.list': [OWNER, ADMIN],
  'workspace.invite.revoke': [OWNER, ADMIN],
  'project.create': [OWNER, ADMIN],
} satisfies Record<string, readonly WsRole[]>;

type WorkspacePermission = keyof typeof workspaceRoles;

export type Permission = WorkspacePermission | 'workspace.create' | 'workspace.invite.accept';

export interface AccessScope {
  workspaceId?: string;
  targetRole?: WsRole;
  newRole?: WsRole;
  targetUserId?: string;
  invitation?: { valid: boolean; email: string | null };
  verifiedEmail?: string;
}

function isWorkspacePermission(permission: string): permission is WorkspacePermission {
  return Object.hasOwn(workspaceRoles, permission);
}

@Injectable()
export class AccessService {
  constructor(private readonly repository: AccessRepository) {}

  getWorkspaceRole(user: { id: string }, workspaceId: string): Promise<WsRole | null> {
    return this.repository.findWorkspaceRole(user.id, workspaceId);
  }

  async can(user: { id: string }, permission: string, scope: AccessScope = {}): Promise<boolean> {
    if (permission === 'workspace.create') {
      return this.repository.isActiveUser(user.id);
    }

    if (permission === 'workspace.invite.accept') {
      const { invitation, verifiedEmail } = scope;
      return (
        invitation?.valid === true &&
        (invitation.email === null ||
          invitation.email.toLowerCase() === verifiedEmail?.toLowerCase()) &&
        (await this.repository.isActiveUser(user.id))
      );
    }

    const { workspaceId, targetRole, targetUserId, newRole } = scope;
    if (!isWorkspacePermission(permission) || !workspaceId) return false;

    const role = await this.getWorkspaceRole(user, workspaceId);
    const allowedRoles: readonly WsRole[] = workspaceRoles[permission];
    if (!role || !allowedRoles.includes(role)) return false;

    switch (permission) {
      case 'workspace.member.remove':
        return targetRole === MEMBER || (role === OWNER && targetRole === ADMIN);
      case 'workspace.member.role.change':
        return (
          (targetRole === ADMIN && newRole === MEMBER) ||
          (targetRole === MEMBER && newRole === ADMIN)
        );
      case 'workspace.ownership.transfer': {
        if (!targetUserId || targetUserId === user.id) return false;
        const target = await this.getWorkspaceRole({ id: targetUserId }, workspaceId);
        return target === ADMIN || target === MEMBER;
      }
      case 'workspace.invite.create':
      case 'workspace.invite.list':
      case 'workspace.invite.revoke':
        return targetRole === MEMBER || (role === OWNER && targetRole === ADMIN);
      default:
        return true;
    }
  }
}
