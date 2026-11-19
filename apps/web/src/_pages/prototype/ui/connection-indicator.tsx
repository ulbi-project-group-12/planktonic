'use client';

import { useConnectionStore, type ConnectionState } from '@/shared/api';
import { Badge, Typography, type BadgeVariant } from '@/shared/ui';

const DOT: Record<ConnectionState, BadgeVariant> = {
  connecting: 'warning',
  connected: 'success',
  syncing: 'info',
  offline: 'danger',
};

/**
 * The tab's connection state as text (UL-129). It only reads `useConnectionStore`; the socket
 * lifecycle listeners in `@/shared/api` are the store's only writers.
 */
export function ConnectionIndicator() {
  const state = useConnectionStore((store) => store.state);
  return (
    <div role="status" className="flex items-center gap-2" data-state={state}>
      <Badge dot variant={DOT[state]} />
      <Typography size="body-s" color="text-secondary">{`Connection: ${state}`}</Typography>
    </div>
  );
}
