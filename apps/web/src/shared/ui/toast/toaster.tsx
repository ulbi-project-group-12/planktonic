'use client';

import { useSyncExternalStore } from 'react';
import { Toast, ToastProvider } from './toast';
import { dismissToast, getServerToasts, getToasts, subscribeToasts } from './toast-store';

/**
 * Toast renderer: once at the app root.
 * Shows toasts created by the imperative `toast({...})` call.
 */
function Toaster() {
  // Server snapshot is empty: no toasts on the server, hydration picks up the store on the client
  const toasts = useSyncExternalStore(subscribeToasts, getToasts, getServerToasts);

  return (
    <ToastProvider>
      {toasts.map((record) => (
        <Toast
          key={record.id}
          open={record.open}
          onOpenChange={(open) => {
            if (!open) dismissToast(record.id);
          }}
          palette={record.palette}
          title={record.title}
          description={record.description}
          action={record.action}
          // auto-dismiss owns the store; the Radix timer is disabled in controlled mode
          duration={Infinity}
        />
      ))}
    </ToastProvider>
  );
}

export { Toaster };
