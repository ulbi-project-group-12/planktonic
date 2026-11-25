/**
 * Workspace roles from ADR-0002 §1. UL-148 lands the real enum in @app/contracts —
 * until then the screens share this type.
 */
export const WORKSPACE_ROLES = ['MEMBER', 'ADMIN', 'OWNER'] as const;
export type WorkspaceRole = (typeof WORKSPACE_ROLES)[number];

export const WORKSPACE_ROLE_LABEL: Record<WorkspaceRole, string> = {
  MEMBER: 'Участник',
  ADMIN: 'Админ',
  OWNER: 'Владелец',
};

/**
 * Roles the inviter may assign (ADR-0002 §2, `workspace.invite.create`):
 * OWNER creates invites for MEMBER or ADMIN, ADMIN only for MEMBER, MEMBER cannot invite.
 */
export function invitableRoles(inviterRole: WorkspaceRole): WorkspaceRole[] {
  if (inviterRole === 'OWNER') return ['MEMBER', 'ADMIN'];
  if (inviterRole === 'ADMIN') return ['MEMBER'];
  return [];
}
