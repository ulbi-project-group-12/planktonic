'use client';

import { Modal } from '@/shared/ui';
import type { WorkspaceRole } from '../model/roles';
import { InviteLinkPanel } from './invite-link-panel';

interface InviteMemberDialogProps {
  isShown: boolean;
  onClose: () => void;
  workspaceSlug: string;
  /** Role of the user who opened the dialog — it bounds the select (ADR-0002 §2). */
  inviterRole: WorkspaceRole;
}

/**
 * «Пригласить» window: pick a role, get a single-use invite link, copy it in one click
 * (UL-220). The panel lives inside the modal content — Radix unmounts it on close, so
 * every open starts with a fresh link and clean state.
 */
export function InviteMemberDialog({
  isShown,
  onClose,
  workspaceSlug,
  inviterRole,
}: InviteMemberDialogProps) {
  return (
    <Modal isShown={isShown} onClose={onClose} title="Пригласить в пространство" size="s">
      <InviteLinkPanel workspaceSlug={workspaceSlug} inviterRole={inviterRole} />
    </Modal>
  );
}
