import type { ReactElement, ReactNode } from 'react';
import { Tooltip as TooltipPrimitive } from 'radix-ui';
import { cn } from '@/shared/lib';

const tooltipSides = ['top', 'right', 'bottom', 'left'] as const;
type TooltipSide = (typeof tooltipSides)[number];

interface TooltipProps {
  /** Tooltip content: text, title + description, kbd. */
  content: ReactNode;
  side?: TooltipSide;
  /** Open delay, ms — defaults to 0 (instant). */
  delayDuration?: number;
  /** Maximum width — defaults to 280 (wrap). */
  maxWidth?: number;
  /** Portal container (e.g. a dark-themed story block); defaults to body. */
  portalContainer?: HTMLElement | null;
  /** Controlled from outside; without it — on hover. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: ReactElement;
  className?: string;
}

/** Tooltip per the "Atoms — tooltips" mockup: surface · radius 8 · pad 6/10 · instant. */
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

/** Tooltip provider: shared delay for all app tooltips. */
function TooltipProvider({ children, ...props }: TooltipPrimitive.TooltipProviderProps) {
  return (
    <TooltipPrimitive.Provider delayDuration={0} {...props}>
      {children}
    </TooltipPrimitive.Provider>
  );
}

export { Tooltip, tooltipSides, TooltipProvider, type TooltipProps, type TooltipSide };
