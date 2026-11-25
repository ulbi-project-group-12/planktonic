import type { ReactNode } from 'react';
import { SessionGate } from '../app-layout';

/**
 * The invite link is opened from outside the app, usually in a fresh tab with no access token in
 * memory. Only a signed-in user may accept an invite (ADR-0002 §2), so the page sits behind the
 * same gate as the app: it restores the session silently, and a guest goes to the login screen
 * and comes back to the link afterwards. No shell: the visitor is not a member yet.
 */
export function InviteLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <SessionGate>{children}</SessionGate>;
}
