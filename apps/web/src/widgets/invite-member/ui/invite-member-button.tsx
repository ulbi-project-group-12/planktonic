'use client';

import { useState } from 'react';
import { Button } from '@/shared/ui';
import { invitableRoles, type WorkspaceRole } from '../model/roles';
import { InviteMemberDialog } from './invite-member-dialog';

interface InviteMemberButtonProps {
  workspaceSlug: string;
  /** Role of the current user in this workspace; members see no button (ADR-0002 §2). */
  inviterRole: WorkspaceRole;
}

/** «Пригласить» trigger: hidden for MEMBER, opens the invite dialog for OWNER/ADMIN. */
export function InviteMemberButton({ workspaceSlug, inviterRole }: InviteMemberButtonProps) {
  const [open, setOpen] = useState(false);
  if (invitableRoles(inviterRole).length === 0) return null;
  return (
    <>
      <Button
        type="button"
        onClick={() => {
          setOpen(true);
        }}
      >
        Пригласить
      </Button>
      <InviteMemberDialog
        isShown={open}
        onClose={() => {
          setOpen(false);
        }}
        workspaceSlug={workspaceSlug}
        inviterRole={inviterRole}
      />
    </>
  );
}
