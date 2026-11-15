'use client';

import { useSyncExternalStore } from 'react';
import { Toast, ToastProvider } from './toast';
import { dismissToast, getToasts, subscribeToasts } from './toast-store';

/**
 * Рендерер тостов: один раз в корне приложения.
 * Показывает тосты, созданные императивным вызовом `toast({...})`.
 */
function Toaster() {
  const toasts = useSyncExternalStore(subscribeToasts, getToasts);

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
          duration={record.duration}
        />
      ))}
    </ToastProvider>
  );
}

export { Toaster };
