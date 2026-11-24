import { useMutation } from '@tanstack/react-query';
import { z } from 'zod';
import { apiFetch, isApiError } from '@/shared/api';

/**
 * Requests and responses mirror the MSW mock until UL-158 ships the real contract; then these
 * types go away in favour of the generated client.
 */
export interface VerifyEmailResponse {
  status: 'confirmed';
}

export function confirmEmail(token: string): Promise<VerifyEmailResponse> {
  return apiFetch<VerifyEmailResponse>('/api/auth/verify-email', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ token }),
  });
}

export interface ResendVerificationResponse {
  resendAfterSec: number;
}

export function resendVerification(): Promise<ResendVerificationResponse> {
  return apiFetch<ResendVerificationResponse>('/api/auth/verify-email/resend', {
    method: 'POST',
  });
}

/**
 * Seconds the api asks to wait before the next resend. `apiFetch` throws only the body, so the
 * pause travels in it, not in a Retry-After header the client could not read.
 */
export const DEFAULT_RESEND_AFTER_SEC = 60;

const RetryAfterBody = z.object({ retryAfterSec: z.number().positive() });

/** The wait a 429 answers with, or `undefined` when the error is not a resend limit. */
export function getRetryAfterSec(error: unknown): number | undefined {
  if (!isApiError(error)) return undefined;
  const parsed = RetryAfterBody.safeParse(error.body);
  return parsed.success ? Math.ceil(parsed.data.retryAfterSec) : undefined;
}

export function useConfirmEmail() {
  return useMutation({ mutationFn: confirmEmail });
}

export function useResendVerification() {
  return useMutation({ mutationFn: resendVerification });
}
