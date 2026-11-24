'use client';

import { useSearchParams } from 'next/navigation';
import { ConfirmEmailCard } from './confirm-email-card';
import { VerifyLinkCard } from './verify-link-card';

/** Without `token` the address is the "confirm your email" screen; with it — the link page. */
export function VerifyEmailContent() {
  const token = useSearchParams().get('token');
  return token ? <VerifyLinkCard token={token} /> : <ConfirmEmailCard />;
}
