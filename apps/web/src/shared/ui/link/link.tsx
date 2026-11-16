import type { ComponentProps } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { cn } from '@/shared/lib';

const linkVariants = ['inline', 'external', 'nav'] as const;
type LinkVariant = (typeof linkVariants)[number];

const variantClasses: Record<LinkVariant, string> = {
  // В тексте сообщения: brand без подчёркивания, hover — underline, active — brand.active.
  inline: 'text-brand-primary hover:underline active:text-brand-active',
  // Внешняя: как inline, с иконкой ↗ (ссылка открывается в новой вкладке).
  external: 'text-brand-primary hover:underline active:text-brand-active',
  // Навигационная: свободная, активный пункт — подложка brand.subtle.
  nav: 'rounded-md px-2 py-1 text-fg-secondary hover:bg-sunken hover:text-fg-primary',
};

interface LinkProps extends ComponentProps<'a'> {
  /** Inline — в тексте, external — с иконкой ↗, nav — пункт навигации. */
  variant?: LinkVariant;
  /** Только для nav: текущий пункт. */
  active?: boolean;
  disabled?: boolean;
}

/** Ссылка по макету «Атомы — ссылки»: hover:underline, внешние ↗, nav active — brand.subtle. */
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
        variant === 'nav' && active && 'bg-brand-subtle text-brand-primary hover:bg-brand-subtle',
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
