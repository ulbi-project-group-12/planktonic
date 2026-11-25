import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch, getAuthMeQueryKey, type AuthMe200 } from '@/shared/api';

/**
 * The tz field and PATCH /api/users/me live here until UL-155 lands them in
 * packages/contracts and Orval regenerates the client — then this file collapses
 * to the generated useAuthMe (same story as sessions.ts in UL-223).
 */
export interface ProfileMe extends AuthMe200 {
  /** IANA zone, e.g. 'Europe/Berlin'. */
  tz: string;
}

export interface UpdateMeBody {
  name?: string;
  tz?: string;
}

async function fetchProfileMe(): Promise<ProfileMe> {
  return apiFetch<ProfileMe>('/api/auth/me');
}

/** Same key as useAuthMe: one cache entry serves the header and this screen. */
export function useProfileMe() {
  return useQuery({ queryKey: getAuthMeQueryKey(), queryFn: fetchProfileMe });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: UpdateMeBody) =>
      apiFetch<ProfileMe>('/api/users/me', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      }),
    onSuccess: (updatedUser) => {
      const queryKey = getAuthMeQueryKey();

      queryClient.setQueryData(queryKey, updatedUser);
    },
  });
}
