'use client';

import { useWorkspaceGetBySlug } from '@/shared/api';
import { InviteMemberButton } from '@/widgets/invite-member';

export function WorkspaceInviteAction({ workspaceSlug }: { workspaceSlug: string }) {
  const { data } = useWorkspaceGetBySlug(workspaceSlug);
  const role = data?.role;
  if (role !== 'OWNER' && role !== 'ADMIN') return null;

  return (
    <div className="self-center">
      <InviteMemberButton workspaceSlug={workspaceSlug} inviterRole={role} />
    </div>
  );
}
