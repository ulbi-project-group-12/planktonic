import type { ReactNode } from 'react';
import { Toast as ToastPrimitive } from 'radix-ui';
import { CircleAlert, CircleCheck, CircleX, Info, X } from 'lucide-react';
import { cn } from '@/shared/lib';

const toastPalettes = ['success', 'danger', 'info', 'warning'] as const;
type ToastPalette = (typeof toastPalettes)[number];

const iconClasses: Record<ToastPalette, string> = {
  success: 'text-success',
  danger: 'text-danger',
  info: 'text-info',
  warning: 'text-warning',
};

const icons: Record<ToastPalette, ReactNode> = {
  success: <CircleCheck />,
  danger: <CircleX />,
  info: <Info />,
  warning: <CircleAlert />,
};

interface ToastAction {
  label: string;
  onClick: () => void;
}

interface ToastProps {
  /** Without open — uncontrolled (radix keeps the state); with open — controlled. */
  open?: boolean;
  /** Uncontrolled initial state. */
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  palette?: ToastPalette;
  title: string;
  description?: string;
  /** Action link on the right (e.g. "Retry"). */
  action?: ToastAction;
  /** Auto-dismiss, ms — defaults to 5000. */
  duration?: number;
  className?: string;
}

/** Toast per the "Atoms — toasts" mockup: surface + border, palette icon, action, close. */
function Toast({
  open,
  defaultOpen,
  onOpenChange,
  palette = 'success',
  title,
  description,
  action,
  duration = 5000,
  className,
}: ToastProps) {
  return (
    <ToastPrimitive.Root
      open={open}
      defaultOpen={defaultOpen}
      onOpenChange={onOpenChange}
      duration={duration}
      data-slot="toast"
      data-palette={palette}
      className={cn(
        'flex items-start gap-3 rounded-xl border border-line bg-surface px-4 py-3 shadow-lg',
        'data-[state=open]:animate-[toast-in_0.2s_ease-out] data-[state=closed]:animate-[toast-out_0.18s_ease-in]',
        className,
      )}
    >
      <span className={cn('mt-px shrink-0 [&>svg]:size-5', iconClasses[palette])}>
        {icons[palette]}
      </span>
      <div className="min-w-0 flex-1">
        <ToastPrimitive.Title className="text-caption font-bold text-fg-primary">
          {title}
        </ToastPrimitive.Title>
        {description ? (
          <ToastPrimitive.Description className="mt-0.5 text-micro text-fg-secondary">
            {description}
          </ToastPrimitive.Description>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {action ? (
          <ToastPrimitive.Action
            altText={action.label}
            onClick={action.onClick}
            className="cursor-pointer rounded-md px-1 text-caption font-bold text-brand-primary transition-colors hover:underline"
          >
            {action.label}
          </ToastPrimitive.Action>
        ) : null}
        <ToastPrimitive.Close
          aria-label="Закрыть"
          className="cursor-pointer rounded-md p-1 text-fg-muted transition-colors hover:bg-sunken hover:text-fg-secondary"
        >
          <X className="size-4" />
        </ToastPrimitive.Close>
      </div>
    </ToastPrimitive.Root>
  );
}

/** Toast provider: viewport fixed bottom-right (z 60), stacked in a column. */
function ToastProvider({
  viewportClassName,
  children,
  ...props
}: ToastPrimitive.ToastProviderProps & {
  /** Overrides the viewport positioning (e.g. static display in stories). */
  viewportClassName?: string;
}) {
  return (
    <ToastPrimitive.Provider {...props}>
      {children}
      <ToastPrimitive.Viewport
        className={cn(
          'fixed right-0 bottom-0 z-60 flex w-96 max-w-full flex-col gap-2 p-4 outline-none',
          viewportClassName,
        )}
      />
    </ToastPrimitive.Provider>
  );
}

export {
  Toast,
  toastPalettes,
  ToastProvider,
  type ToastAction,
  type ToastPalette,
  type ToastProps,
};
