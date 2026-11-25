'use client';

import { Button } from '@/shared/ui';
import { InviteLinkPanel } from '@/widgets/invite-member';

interface InviteMembersStepProps {
  workspaceSlug: string;
  onBack: () => void;
  onOpen: () => void;
}

/**
 * Create-workspace wizard, step 2 (mockup screen.ws.create2): invite members by link into
 * the workspace step 1 already created — an invite for a missing workspace would 404 on
 * the real api (UL-148). The email block of the mockup is out of scope.
 * The creator is always the OWNER, so the role select offers MEMBER and ADMIN (ADR-0002).
 */
export function InviteMembersStep({ workspaceSlug, onBack, onOpen }: InviteMembersStepProps) {
  return (
    <div className="flex w-full flex-col gap-5">
      <InviteLinkPanel
        workspaceSlug={workspaceSlug}
        inviterRole="OWNER"
        linkHint="Ссылку можно использовать только один раз. Можно пропустить — пригласить людей получится и позже."
      />
      <div className="flex justify-between gap-3 pt-1">
        <Button type="button" variant="secondary" onClick={onBack}>
          Назад
        </Button>
        <Button type="button" onClick={onOpen}>
          Открыть пространство
        </Button>
      </div>
    </div>
  );
}
