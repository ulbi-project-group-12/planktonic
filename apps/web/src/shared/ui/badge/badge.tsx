import { cn } from '@/shared/lib';

const badgeVariants = ['brand', 'success', 'warning', 'danger', 'info', 'muted'] as const;
type BadgeVariant = (typeof badgeVariants)[number];

/** Overflow above the limit — 99+. */
const OVERFLOW_CAP = 99;

const variantClasses: Record<BadgeVariant, string> = {
  // Status solids take dark text where white fails AA (warning 3.86 in light;
  // 2.9-3.4 on the light status fills of the dark theme); muted uses fg-secondary
  // (fg-muted gives 4.43 on sunken).
  brand: 'bg-brand-primary text-on-brand',
  success: 'bg-success text-on-brand dark:text-on-status',
  warning: 'bg-warning text-on-status',
  danger: 'bg-danger text-on-brand dark:text-on-status',
  info: 'bg-info text-on-brand dark:text-on-status',
  muted: 'bg-sunken text-fg-secondary',
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
  /** Badge number; above 99 shown as "99+". */
  count?: number;
  /** Mention: "@" + number. */
  mention?: boolean;
  /** 8 px dot without a number. */
  dot?: boolean;
  variant?: BadgeVariant;
  className?: string;
}

/** Badge per the "Atoms — badges" mockup: h 20 · radius full, on an avatar — surface ring 2 px. */
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
