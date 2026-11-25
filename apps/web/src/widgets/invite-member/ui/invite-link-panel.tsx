'use client';

import { useEffect, useRef, useState } from 'react';
import { routes } from '@/shared/config';
import { Alert, Button, Field, Input, Select, Spinner } from '@/shared/ui';
import { useCreateInvite } from '../api/create-invite';
import { invitableRoles, WORKSPACE_ROLE_LABEL, type WorkspaceRole } from '../model/roles';

const COPY_RESET_MS = 2000;

interface InviteLinkPanelProps {
  workspaceSlug: string;
  /** Role of the inviting user — it bounds the select (ADR-0002 §2). */
  inviterRole: WorkspaceRole;
  /** Hint under the link field; the wizard adds a skip note to the default. */
  linkHint?: string;
}

/**
 * Role select + single-use invite link + copy button (UL-220). A fresh mount issues a new
 * link — the dialog remounts it on every open, the create-workspace wizard on entering
 * step 2, so no reset bookkeeping is needed here.
 */
export function InviteLinkPanel({
  workspaceSlug,
  inviterRole,
  linkHint = 'Ссылку можно использовать только один раз',
}: InviteLinkPanelProps) {
  const roles = invitableRoles(inviterRole);
  const [role, setRole] = useState<WorkspaceRole>('MEMBER');
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);
  const { mutate: createInvite, data: invite, isPending, isError } = useCreateInvite();

  useEffect(() => {
    createInvite({ workspaceSlug, role: 'MEMBER' });
  }, [workspaceSlug, createInvite]);

  function handleRoleChange(values: string[]) {
    const next = values[0] as WorkspaceRole;
    setRole(next);
    setCopied(false);
    createInvite({ workspaceSlug, role: next });
  }

  // invite only ever exists after a client-side mutation, so the window read never runs
  // during SSR — the guard documents that and keeps it safe if the flow ever changes.
  const link =
    invite && typeof window !== 'undefined'
      ? `${window.location.origin}${routes.invite(invite.token)}`
      : null;

  // The "Скопировано" reset timer is cleared on unmount and before it is re-armed —
  // no stale setCopied after the panel is gone.
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (copyTimerRef.current !== null) clearTimeout(copyTimerRef.current);
    },
    [],
  );

  async function copyLink() {
    if (!link) return;
    setCopyError(null);
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      if (copyTimerRef.current !== null) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => {
        setCopied(false);
        copyTimerRef.current = null;
      }, COPY_RESET_MS);
    } catch {
      setCopyError('Не удалось скопировать — выделите ссылку и скопируйте вручную.');
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Field label="Роль участника" hint="Роль, с которой человек войдёт в пространство">
        <Select
          options={roles.map((r) => ({ value: r, label: WORKSPACE_ROLE_LABEL[r] }))}
          value={[role]}
          onValueChange={handleRoleChange}
          disabled={isPending}
        />
      </Field>
      {isError && <Alert palette="danger" title="Не удалось создать ссылку. Попробуйте ещё раз." />}
      {copyError && <Alert palette="danger" title={copyError} />}
      <Field label="Invite-ссылка" hint={linkHint}>
        <div className="flex items-center gap-2">
          <Input
            readOnly
            value={link ?? ''}
            placeholder={isPending ? 'Создаём ссылку…' : 'Ссылка не создана'}
            aria-label="Invite-ссылка"
            onFocus={(event) => {
              event.currentTarget.select();
            }}
          />
          <Button
            type="button"
            disabled={!link}
            onClick={() => {
              void copyLink();
            }}
          >
            {copied ? 'Скопировано' : 'Копировать'}
          </Button>
        </div>
      </Field>
      {isPending && (
        <p role="status" className="flex items-center gap-2">
          <Spinner size="s" />
        </p>
      )}
    </div>
  );
}
