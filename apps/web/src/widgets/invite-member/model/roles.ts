import type { InviteRole, WorkspaceRole } from '@app/contracts';

export type { WorkspaceRole } from '@app/contracts';

export const WORKSPACE_ROLE_LABEL: Record<WorkspaceRole, string> = {
  MEMBER: 'Участник',
  ADMIN: 'Админ',
  OWNER: 'Владелец',
};

/**
 * Roles the inviter may assign (ADR-0002 §2, `workspace.invite.create`):
 * OWNER creates invites for MEMBER or ADMIN, ADMIN only for MEMBER, MEMBER cannot invite.
 */
export function invitableRoles(inviterRole: WorkspaceRole): InviteRole[] {
  if (inviterRole === 'OWNER') return ['MEMBER', 'ADMIN'];
  if (inviterRole === 'ADMIN') return ['MEMBER'];
  return [];
}
