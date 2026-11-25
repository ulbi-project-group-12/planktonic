'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { routes } from '@/shared/config';
import { Alert, Button, Field, Input, Select } from '@/shared/ui';
import { type CreatedInvite, useCreateInvite } from '../api/create-invite';
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
  const [invite, setInvite] = useState<CreatedInvite>();
  const [state, setState] = useState<'pending' | 'ready' | 'error'>('pending');
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);
  const { mutateAsync: createInvite } = useCreateInvite();

  // Requests are out-of-order racy: keep only the answer of the latest one — an earlier
  // resolve must not overwrite a newer role's link, and a new request drops the old link
  // before it starts, so an error never leaves a stale link behind.
  const requestRef = useRef(0);
  // The "Скопировано" reset timer is cleared on unmount and before it is re-armed —
  // no stale setCopied after the panel is gone.
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fetchInvite = useCallback(
    (inviteRole: WorkspaceRole) => {
      const request = ++requestRef.current;
      createInvite({ workspaceSlug, role: inviteRole }).then(
        (created) => {
          if (request !== requestRef.current) return;
          setInvite(created);
          setState('ready');
        },
        () => {
          if (request === requestRef.current) setState('error');
        },
      );
    },
    [workspaceSlug, createInvite],
  );

  // The mount state is already pending/empty; the sync resets live in requestInvite, which
  // only event handlers (role change, retry) call — effects may not set state synchronously.
  function requestInvite(inviteRole: WorkspaceRole) {
    setState('pending');
    setInvite(undefined);
    // A new link replaces the old one: drop its "Скопировано" state and copy error — and
    // the timer too, or a timer armed by the previous copy would flip the button back early.
    setCopied(false);
    setCopyError(null);
    if (copyTimerRef.current !== null) {
      clearTimeout(copyTimerRef.current);
      copyTimerRef.current = null;
    }
    fetchInvite(inviteRole);
  }

  useEffect(() => {
    fetchInvite('MEMBER');
  }, [fetchInvite]);

  function handleRoleChange(values: string[]) {
    const next = values[0] as WorkspaceRole | undefined;
    if (next === undefined) return;
    setRole(next);
    requestInvite(next);
  }

  // invite only ever exists after a client-side mutation, so the window read never runs
  // during SSR — the guard documents that and keeps it safe if the flow ever changes.
  const link =
    invite && typeof window !== 'undefined'
      ? `${window.location.origin}${routes.invite(invite.token)}`
      : null;

  useEffect(
    () => () => {
      if (copyTimerRef.current !== null) clearTimeout(copyTimerRef.current);
    },
    [],
  );

  async function copyLink() {
    if (!link) return;
    // The clipboard write is async: while it is in flight a role change may replace the
    // link — then the late resolve must not mark the NEW link as copied.
    const request = requestRef.current;
    setCopyError(null);
    try {
      await navigator.clipboard.writeText(link);
      if (request !== requestRef.current) return;
      setCopied(true);
      if (copyTimerRef.current !== null) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => {
        setCopied(false);
        copyTimerRef.current = null;
      }, COPY_RESET_MS);
    } catch {
      if (request !== requestRef.current) return;
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
          disabled={state === 'pending' || roles.length <= 1}
        />
      </Field>
      {state === 'error' && (
        <Alert
          palette="danger"
          title="Не удалось создать ссылку."
          action={{
            label: 'Попробовать ещё раз',
            onClick: () => {
              requestInvite(role);
            },
          }}
        />
      )}
      {copyError && <Alert palette="danger" title={copyError} />}
      <Field label="Invite-ссылка" hint={linkHint}>
        <div className="flex items-center gap-2">
          <Input
            readOnly
            value={link ?? ''}
            placeholder={state === 'pending' ? 'Создаём ссылку…' : 'Ссылка не создана'}
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
    </div>
  );
}
