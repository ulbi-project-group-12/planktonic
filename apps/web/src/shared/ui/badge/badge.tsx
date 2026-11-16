import { cn } from '@/shared/lib';

const badgeVariants = ['brand', 'success', 'warning', 'danger', 'info', 'muted'] as const;
type BadgeVariant = (typeof badgeVariants)[number];

/** Переполнение сверх лимита — 99+. */
const OVERFLOW_CAP = 99;

const variantClasses: Record<BadgeVariant, string> = {
  brand: 'bg-brand-primary text-on-brand',
  success: 'bg-success text-on-brand',
  warning: 'bg-warning text-on-brand',
  danger: 'bg-danger text-on-brand',
  info: 'bg-info text-on-brand',
  muted: 'bg-sunken text-fg-muted',
};

const dotClasses: Record<BadgeVariant, string> = {
  brand: 'bg-brand-primary',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  info: 'bg-info',
  muted: 'bg-fg-muted',
};

interface BadgeProps {
  /** Число в бейдже; больше 99 показывается как «99+». */
  count?: number;
  /** Упоминание: «@» + число. */
  mention?: boolean;
  /** Точка 8 px без числа. */
  dot?: boolean;
  variant?: BadgeVariant;
  className?: string;
}

/** Бейдж по макету «Атомы — бейджи»: h 20 · radius full, на аватаре — кольцо surface 2 px. */
function Badge({ count, mention = false, dot = false, variant = 'brand', className }: BadgeProps) {
  if (dot) {
    return (
      <span
        data-slot="badge"
        data-variant={variant}
        className={cn('inline-block size-2 shrink-0 rounded-full', dotClasses[variant], className)}
      />
    );
  }

  const value = count !== undefined && count > OVERFLOW_CAP ? `${String(OVERFLOW_CAP)}+` : count;

  return (
    <span
      data-slot="badge"
      data-variant={variant}
      className={cn(
        'inline-flex h-5 min-w-5 items-center justify-center gap-px rounded-full px-1.5 text-micro font-bold',
        variantClasses[variant],
        className,
      )}
    >
      {mention ? '@' : null}
      {value}
    </span>
  );
}

export { Badge, badgeVariants, type BadgeProps, type BadgeVariant };
