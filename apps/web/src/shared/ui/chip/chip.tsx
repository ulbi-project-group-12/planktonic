import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/shared/lib';

const chipPalettes = ['brand', 'success', 'warning', 'danger', 'info'] as const;
type ChipPalette = (typeof chipPalettes)[number];

/** neutral — bg.sunken · subtle — *.subtle + palette text · solid — palette fill, white text. */
const chipFills = ['neutral', 'subtle', 'solid'] as const;
type ChipFill = (typeof chipFills)[number];

const neutralClasses = 'bg-sunken text-fg-secondary';

const subtleClasses: Record<ChipPalette, string> = {
  brand: 'bg-brand-subtle text-brand-primary',
  success: 'bg-success-subtle text-success',
  warning: 'bg-warning-subtle text-warning',
  danger: 'bg-danger-subtle text-danger',
  info: 'bg-info-subtle text-info',
};

const solidClasses: Record<ChipPalette, string> = {
  brand: 'bg-brand-primary text-on-brand',
  success: 'bg-success text-on-brand',
  warning: 'bg-warning text-on-brand',
  danger: 'bg-danger text-on-brand',
  info: 'bg-info text-on-brand',
};

const dotClasses: Record<ChipPalette, string> = {
  brand: 'bg-brand-primary',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  info: 'bg-info',
};

interface ChipProps {
  /** Palette — for the "subtle" and "solid" fills. */
  palette?: ChipPalette;
  /** Neutral — no accents · subtle — soft background · solid — fill. */
  fill?: ChipFill;
  /** Dot before the text (relevant for the "subtle" fill). */
  dot?: boolean;
  /** Cross icon on the right — a removable multi-select value. */
  onRemove?: () => void;
  children: ReactNode;
  className?: string;
}

/** Chip per the "Atoms — chips" mockup: h 24 · radius full · 12 bold · cross on the right for removal. */
function Chip({
  palette = 'brand',
  fill = 'subtle',
  dot = false,
  onRemove,
  children,
  className,
}: ChipProps) {
  const fillClass =
    fill === 'neutral'
      ? neutralClasses
      : fill === 'subtle'
        ? subtleClasses[palette]
        : solidClasses[palette];

  return (
    <span
      data-slot="chip"
      data-fill={fill}
      className={cn(
        'inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-micro font-bold',
        fillClass,
        className,
      )}
    >
      {dot ? (
        <span data-slot="chip-dot" className={cn('size-1.5 rounded-full', dotClasses[palette])} />
      ) : null}
      {children}
      {onRemove ? (
        <button
          type="button"
          aria-label="Убрать"
          onClick={onRemove}
          className="-mr-1 inline-flex cursor-pointer items-center justify-center rounded-full p-px opacity-60 transition-opacity hover:opacity-100 focus-visible:ring-2 focus-visible:ring-brand-primary/40 focus-visible:outline-none"
        >
          <X className="size-3" />
        </button>
      ) : null}
    </span>
  );
}

export { Chip, chipFills, chipPalettes, type ChipFill, type ChipPalette, type ChipProps };
