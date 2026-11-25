import type { InviteRole } from '@app/contracts';
import { useMutation } from '@tanstack/react-query';
import { inviteCreate } from '@/shared/api';

export function useCreateInvite() {
  return useMutation({
    mutationFn: ({ workspaceSlug, role }: { workspaceSlug: string; role: InviteRole }) =>
      inviteCreate(workspaceSlug, { role }),
  });
}
