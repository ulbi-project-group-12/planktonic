'use client';

import { useSearchParams } from 'next/navigation';
import { ConfirmEmailCard } from './confirm-email-card';
import { VerifyLinkCard } from './verify-link-card';

/**
 * Without `token` the address is the "confirm your email" screen; with it — the link page. The
 * key ties the link page to its token: another token in the same address is another attempt, with
 * its own request and its own outcome.
 */
export function VerifyEmailContent() {
  const token = useSearchParams().get('token');
  return token ? <VerifyLinkCard key={token} token={token} /> : <ConfirmEmailCard />;
}
