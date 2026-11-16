import type { ReactElement, ReactNode } from 'react';
import { Tooltip as TooltipPrimitive } from 'radix-ui';
import { cn } from '@/shared/lib';

const tooltipSides = ['top', 'right', 'bottom', 'left'] as const;
type TooltipSide = (typeof tooltipSides)[number];

interface TooltipProps {
  /** Содержимое подсказки: текст, title + описание, kbd. */
  content: ReactNode;
  side?: TooltipSide;
  /** Задержка появления, мс — по умолчанию 0 (мгновенно). */
  delayDuration?: number;
  /** Максимальная ширина — по умолчанию 280 (wrap). */
  maxWidth?: number;
  /** Контейнер для портала (например, тёмная тема сторис); по умолчанию — body. */
  portalContainer?: HTMLElement | null;
  /** Управление извне; без него — по наведению. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: ReactElement;
  className?: string;
}

/** Тултип по макету «Атомы — тултипы»: surface · radius 8 · pad 6/10 · мгновенно. */
function Tooltip({
  content,
  side = 'top',
  delayDuration = 0,
  maxWidth = 280,
  portalContainer,
  open,
  onOpenChange,
  children,
  className,
}: TooltipProps) {
  return (
    <TooltipPrimitive.Root open={open} onOpenChange={onOpenChange} delayDuration={delayDuration}>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal container={portalContainer ?? undefined}>
        <TooltipPrimitive.Content
          side={side}
          sideOffset={6}
          style={{ maxWidth }}
          data-slot="tooltip"
          className={cn(
            'z-50 rounded-lg border border-line bg-surface px-3 py-2 text-caption text-fg-primary shadow-lg',
            className,
          )}
        >
          {content}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}

/** Провайдер тултипов: общая задержка для всех подсказок приложения. */
function TooltipProvider({ children, ...props }: TooltipPrimitive.TooltipProviderProps) {
  return (
    <TooltipPrimitive.Provider delayDuration={0} {...props}>
      {children}
    </TooltipPrimitive.Provider>
  );
}

export { Tooltip, tooltipSides, TooltipProvider, type TooltipProps, type TooltipSide };
