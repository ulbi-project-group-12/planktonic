'use client';

import { useSyncExternalStore } from 'react';
import { Toast, ToastProvider } from './toast';
import { dismissToast, getServerToasts, getToasts, subscribeToasts } from './toast-store';

/**
 * Рендерер тостов: один раз в корне приложения.
 * Показывает тосты, созданные императивным вызовом `toast({...})`.
 */
function Toaster() {
  // Серверный снимок пустой: на сервере тостов нет, гидрация подхватит стор на клиенте
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
          // автозакрытие держит стор; таймер Radix в контролируемом режиме отключён
          duration={Infinity}
        />
      ))}
    </ToastProvider>
  );
}

export { Toaster };
