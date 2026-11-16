import type { ComponentProps } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { cn } from '@/shared/lib';

const linkVariants = ['inline', 'external', 'nav'] as const;
type LinkVariant = (typeof linkVariants)[number];

const variantClasses: Record<LinkVariant, string> = {
  // In message text: brand without underline, hover — underline, active — brand.active.
  // Dark theme takes the light brand text step: base #6c5ce7 gives only 3.78 on the dark app bg.
  inline: 'text-brand-primary dark:text-brand-text hover:underline active:text-brand-active',
  // External: like inline, with ↗ icon (the link opens in a new tab).
  external: 'text-brand-primary dark:text-brand-text hover:underline active:text-brand-active',
  // Nav: free-standing, active item — brand.subtle background.
  nav: 'rounded-md px-2 py-1 text-fg-secondary hover:bg-sunken hover:text-fg-primary',
};

interface LinkProps extends ComponentProps<'a'> {
  /** inline — in text, external — with ↗ icon, nav — navigation item. */
  variant?: LinkVariant;
  /** nav only: the current item. */
  active?: boolean;
  disabled?: boolean;
}

/** Link per the "Atoms — links" mockup: hover:underline, external ↗, nav active — brand.subtle. */
function Link({
  variant = 'inline',
  active = false,
  disabled = false,
  className,
  children,
  ...props
}: LinkProps) {
  return (
    <a
      data-slot="link"
      data-variant={variant}
      aria-disabled={disabled || undefined}
      tabIndex={disabled ? -1 : props.tabIndex}
      className={cn(
        'inline-flex cursor-pointer items-center gap-1 text-body-s leading-5 transition-colors outline-none focus-visible:ring-3 focus-visible:ring-brand-primary/40',
        variantClasses[variant],
        variant === 'nav' && active && 'bg-brand-subtle text-brand-text hover:bg-brand-subtle',
        disabled && 'pointer-events-none cursor-not-allowed text-fg-muted',
        className,
      )}
      {...props}
    >
      {children}
      {variant === 'external' ? <ArrowUpRight className="size-3.5 shrink-0" /> : null}
    </a>
  );
}

export { Link, linkVariants, type LinkProps, type LinkVariant };
