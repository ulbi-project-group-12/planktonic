import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/shared/api';
import type { CurrentUser } from '../model/types';

export function getCurrentUserQueryKey() {
  return ['user', 'me'] as const;
}

async function fetchCurrentUser(): Promise<CurrentUser> {
  return apiFetch<CurrentUser>('/api/users/me');
}

export function useCurrentUser() {
  return useQuery({
    queryKey: getCurrentUserQueryKey(),
    queryFn: fetchCurrentUser,
  });
}
