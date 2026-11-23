import { useMutation } from '@tanstack/react-query';
import { signIn } from '@/shared/api';

export function useSignIn() {
  return useMutation({ mutationFn: signIn });
}
