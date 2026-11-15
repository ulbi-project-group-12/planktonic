import type { ToastAction, ToastPalette } from './toast';

/** Входные данные тоста для императивного вызова `toast()`. */
interface ToastInput {
  palette?: ToastPalette;
  title: string;
  description?: string;
  action?: ToastAction;
  /** Автозакрытие, мс — по умолчанию 5000. */
  duration?: number;
}

interface ToastRecord extends ToastInput {
  id: string;
  /** false — тост закрывается (играет анимация скрытия), затем удаляется из стора. */
  open: boolean;
}

let toasts: ToastRecord[] = [];
let counter = 0;
const listeners = new Set<() => void>();

/** Длительность анимации скрытия — после неё тост удаляется из стора. */
const TOAST_EXIT_MS = 180;

function emit() {
  listeners.forEach((listener) => {
    listener();
  });
}

/** Показывает тост через ближайший <Toaster />; возвращает id для dismissToast. */
function toast(input: ToastInput): string {
  counter += 1;
  const id = String(counter);
  toasts = [...toasts, { ...input, id, open: true }];
  emit();
  return id;
}

/** Скрывает тост по id: сначала анимация закрытия, потом удаление из стора. */
function dismissToast(id: string): void {
  toasts = toasts.map((record) => (record.id === id ? { ...record, open: false } : record));
  emit();
  window.setTimeout(() => {
    toasts = toasts.filter((record) => record.id !== id);
    emit();
  }, TOAST_EXIT_MS);
}

/** Подписка для useSyncExternalStore. */
function subscribeToasts(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Снимок списка тостов. */
function getToasts(): ToastRecord[] {
  return toasts;
}

/** Серверный снимок для useSyncExternalStore: на сервере тостов нет.
 *  Должен быть стабилен по ссылке — иначе React ругается на «should be cached». */
const SERVER_TOASTS: ToastRecord[] = [];

function getServerToasts(): ToastRecord[] {
  return SERVER_TOASTS;
}

export {
  dismissToast,
  getServerToasts,
  getToasts,
  subscribeToasts,
  toast,
  type ToastInput,
  type ToastRecord,
};
