import type { ReactNode } from 'react';
import { SessionGate } from './session-gate';

/** Everything in the `(app)` group is behind the login: see `SessionGate`. */
export function AppLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <SessionGate>{children}</SessionGate>;
}
