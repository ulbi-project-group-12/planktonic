import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getInviteGetQueryKey,
  getWorkspaceListQueryKey,
  inviteAccept,
  useInviteGet,
} from '@/shared/api';

export function useInvite(token: string) {
  return useInviteGet(token, { query: { retry: false } });
}

export function useAcceptInvite(token: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => inviteAccept(token),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: getInviteGetQueryKey(token) });
      return queryClient.invalidateQueries({ queryKey: getWorkspaceListQueryKey() });
    },
  });
}
