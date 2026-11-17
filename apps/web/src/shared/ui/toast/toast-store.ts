import type { ToastAction, ToastPalette } from './toast';

/** Toast input for the imperative `toast()` call. */
interface ToastInput {
  palette?: ToastPalette;
  title: string;
  description?: string;
  action?: ToastAction;
  /** Auto-dismiss, ms — defaults to 15000 (DEFAULT_TOAST_DURATION_MS). */
  duration?: number;
}

interface ToastRecord extends ToastInput {
  id: string;
  /** false — the toast closes (plays the hide animation), then is removed from the store. */
  open: boolean;
}

let toasts: ToastRecord[] = [];
let counter = 0;
const listeners = new Set<() => void>();

/** Hide animation duration — after it the toast is removed from the store. */
const TOAST_EXIT_MS = 180;

/** Default auto-dismiss: the toast goes away on its own unless explicitly closed. */
const DEFAULT_TOAST_DURATION_MS = 15000;

function emit() {
  listeners.forEach((listener) => {
    listener();
  });
}

/** Shows a toast via the nearest <Toaster />; returns id for dismissToast. */
function toast(input: ToastInput): string {
  counter += 1;
  const id = String(counter);
  toasts = [...toasts, { ...input, id, open: true }];
  emit();
  // own auto-dismiss timer: the Radix timer is unreliable in controlled mode,
  // so it is disabled in Toaster (duration={Infinity}) and only the store closes the toast
  window.setTimeout(() => {
    dismissToast(id);
  }, input.duration ?? DEFAULT_TOAST_DURATION_MS);
  return id;
}

/** Hides a toast by id: close animation first, then removal from the store. */
function dismissToast(id: string): void {
  toasts = toasts.map((record) => (record.id === id ? { ...record, open: false } : record));
  emit();
  window.setTimeout(() => {
    toasts = toasts.filter((record) => record.id !== id);
    emit();
  }, TOAST_EXIT_MS);
}

/** Subscription for useSyncExternalStore. */
function subscribeToasts(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Snapshot of the toast list. */
function getToasts(): ToastRecord[] {
  return toasts;
}

/** Server snapshot for useSyncExternalStore: no toasts on the server.
 *  Must be stable by reference — otherwise React complains about "should be cached". */
const SERVER_TOASTS: ToastRecord[] = [];

function getServerToasts(): ToastRecord[] {
  return SERVER_TOASTS;
}

export {
  DEFAULT_TOAST_DURATION_MS,
  dismissToast,
  getServerToasts,
  getToasts,
  subscribeToasts,
  toast,
  type ToastInput,
  type ToastRecord,
};
