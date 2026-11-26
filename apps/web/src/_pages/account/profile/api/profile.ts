import { useQueryClient } from '@tanstack/react-query';
import { type AuthMe200, getAuthMeQueryKey, useUsersUpdateMe } from '@/shared/api';

/**
 * The profile shown in the settings form. `AuthMe200.tz` is required by the contract, but the
 * form keeps the browser-zone fallback for a cache entry written before UL-155 landed.
 */
export type ProfileMe = Omit<AuthMe200, 'tz'> & { tz?: AuthMe200['tz'] };

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useUsersUpdateMe({
    mutation: {
      onSuccess: async (updatedUser) => {
        const queryKey = getAuthMeQueryKey();

        // A GET /api/auth/me in flight would land after this and overwrite the patch.
        await queryClient.cancelQueries({ queryKey });
        queryClient.setQueryData(queryKey, updatedUser);
      },
    },
  });
}
