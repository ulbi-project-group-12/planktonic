import type { ComponentProps } from 'react';
import { LoaderCircle } from 'lucide-react';
import { cn } from '@/shared/lib';

const buttonVariants = ['solid', 'secondary', 'subtle'] as const;
type ButtonVariant = (typeof buttonVariants)[number];

const buttonPalettes = ['primary', 'success', 'warning', 'danger', 'info'] as const;
type ButtonPalette = (typeof buttonPalettes)[number];

const buttonSizes = ['s', 'm', 'l', 'icon'] as const;
type ButtonSize = (typeof buttonSizes)[number];

/** Solid — primary action on the screen, one per form (fill: {pal}).
 *  Status solids sit on the constant --*-fill scale: white on-fill text is 5.35-7.44:1
 *  in BOTH themes, so every solid keeps text-on-brand (white) unlike the theme-bound
 *  foreground hues, which are light in .dark and would give only 2.9-3.4:1. */
const solidClasses: Record<ButtonPalette, string> = {
  primary:
    'border-transparent bg-brand-primary text-on-brand hover:bg-brand-hover active:bg-brand-active focus-visible:ring-brand-primary/40',
  success:
    'border-transparent bg-success-fill text-on-brand hover:bg-success-fill-hover active:bg-success-fill-active focus-visible:ring-success-fill/40',
  warning:
    'border-transparent bg-warning-fill text-on-brand hover:bg-warning-fill-hover active:bg-warning-fill-active focus-visible:ring-warning-fill/40',
  danger:
    'border-transparent bg-danger-fill text-on-brand hover:bg-danger-fill-hover active:bg-danger-fill-active focus-visible:ring-danger-fill/40',
  info: 'border-transparent bg-info-fill text-on-brand hover:bg-info-fill-hover active:bg-info-fill-active focus-visible:ring-info-fill/40',
};

/** Secondary — neutral actions (cancel, filters): bg.sunken + border. */
const secondaryClasses =
  'border-line bg-sunken text-fg-primary hover:border-line hover:bg-line active:border-line-strong active:bg-line-strong focus-visible:ring-brand-primary/40';

/** Subtle — quiet actions in cards and lists (fill: {pal}.subtle).
 *  Base text uses the -hover/-text steps: the raw status hues fail AA on the blended
 *  subtle backgrounds (3.3-4.49), and the brand hue fails in both themes (3.91 / 3.24). */
const subtleClasses: Record<ButtonPalette, string> = {
  primary:
    'border-transparent bg-brand-subtle text-brand-text hover:border-brand-primary hover:text-brand-active dark:hover:text-brand-text active:border-brand-active active:text-brand-active dark:active:text-brand-text focus-visible:ring-brand-primary/40',
  success:
    'border-transparent bg-success-subtle text-success hover:border-success hover:text-success-hover active:border-success-active active:text-success-active focus-visible:ring-success/40',
  warning:
    'border-transparent bg-warning-subtle text-warning-hover dark:text-warning hover:border-warning hover:text-warning-active dark:hover:text-warning-hover active:border-warning-active active:text-warning-active dark:active:text-warning-hover focus-visible:ring-warning/40',
  danger:
    'border-transparent bg-danger-subtle text-danger hover:border-danger hover:text-danger-hover active:border-danger-active active:text-danger-active focus-visible:ring-danger/40',
  info: 'border-transparent bg-info-subtle text-info-hover dark:text-info hover:border-info hover:text-info-active dark:hover:text-info-hover active:border-info-active active:text-info-active dark:active:text-info-hover focus-visible:ring-info/40',
};

const variantClasses: Record<ButtonVariant, Record<ButtonPalette, string>> = {
  solid: solidClasses,
  secondary: {
    primary: secondaryClasses,
    success: secondaryClasses,
    warning: secondaryClasses,
    danger: secondaryClasses,
    info: secondaryClasses,
  },
  subtle: subtleClasses,
};

/** Mobile-first sizes: S 32→36, M 36→40, L 40→44, icon 36→40 (mockup geometry). Desktop — from desktop-s (1024). */
const sizeClasses: Record<ButtonSize, string> = {
  s: 'h-8 gap-2 px-4 text-caption leading-5 desktop-s:h-9 desktop-s:text-body-xs [&_svg:not([class*=size-])]:size-3.5',
  m: 'h-9 gap-2 px-4 text-body-s leading-5 desktop-s:h-10',
  l: 'h-10 gap-2 px-4 text-body-s leading-5 desktop-s:h-11',
  icon: 'size-9 desktop-s:size-10',
};

interface ButtonProps extends ComponentProps<'button'> {
  /** Button variant: solid — primary action, secondary — neutral, subtle — quiet. */
  variant?: ButtonVariant;
  /** Fill and text palette; unused for secondary. */
  palette?: ButtonPalette;
  /** Size: heights mobile → desktop, icon — square icon-only button. */
  size?: ButtonSize;
  /** Shows a spinner and blocks clicks; the label comes from children or "Loading…". */
  loading?: boolean;
  /** Stretches the button to the full container width (typical for mobile). */
  fullWidth?: boolean;
}

/** The button look as a class string, for the rare case the element is a link rather than a
 *  button (navigation keeps the native anchor semantics), e.g. `<Link className={buttonClassName(...)}>`. */
function buttonClassName({
  variant = 'solid',
  palette = 'primary',
  size = 'm',
  fullWidth = false,
  className,
}: Pick<ButtonProps, 'variant' | 'palette' | 'size' | 'fullWidth' | 'className'>) {
  return cn(
    "inline-flex shrink-0 cursor-pointer select-none items-center justify-center gap-2 whitespace-nowrap rounded-button border font-bold outline-none transition-colors focus-visible:ring-3 disabled:pointer-events-none [&:disabled:not([data-loading])]:opacity-45 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
    variantClasses[variant][palette],
    sizeClasses[size],
    fullWidth && 'w-full',
    className,
  );
}

function Button({
  className,
  variant = 'solid',
  palette = 'primary',
  size = 'm',
  loading = false,
  fullWidth = false,
  disabled = false,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      data-slot="button"
      data-variant={variant}
      data-palette={palette}
      data-size={size}
      data-loading={loading || undefined}
      className={buttonClassName({ variant, palette, size, fullWidth, className })}
      // loading blocks activation natively (mouse, keyboard, form submit);
      // per the mockup loading does not dim the button — opacity 0.45 is only for disabled (rule above)
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? (
        <>
          <LoaderCircle className="animate-spin" />
          {children ?? 'Загрузка…'}
        </>
      ) : (
        children
      )}
    </button>
  );
}

export {
  Button,
  buttonClassName,
  buttonPalettes,
  buttonSizes,
  buttonVariants,
  type ButtonPalette,
  type ButtonProps,
  type ButtonSize,
  type ButtonVariant,
};
