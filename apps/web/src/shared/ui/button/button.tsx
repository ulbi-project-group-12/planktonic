import type { ComponentProps } from 'react';
import { LoaderCircle } from 'lucide-react';
import { cn } from '@/shared/lib';

const buttonVariants = ['solid', 'secondary', 'subtle'] as const;
type ButtonVariant = (typeof buttonVariants)[number];

const buttonPalettes = ['primary', 'success', 'warning', 'danger', 'info'] as const;
type ButtonPalette = (typeof buttonPalettes)[number];

const buttonSizes = ['s', 'm', 'l', 'icon'] as const;
type ButtonSize = (typeof buttonSizes)[number];

/** Solid — основное действие на экране, одна на форму (fill: {pal}). */
const solidClasses: Record<ButtonPalette, string> = {
  primary:
    'border-transparent bg-brand-primary text-on-brand hover:bg-brand-hover active:bg-brand-active focus-visible:ring-brand-primary/40',
  success:
    'border-transparent bg-success text-on-brand hover:bg-success-hover active:bg-success-active focus-visible:ring-success/40',
  warning:
    'border-transparent bg-warning text-on-brand hover:bg-warning-hover active:bg-warning-active focus-visible:ring-warning/40',
  danger:
    'border-transparent bg-danger text-on-brand hover:bg-danger-hover active:bg-danger-active focus-visible:ring-danger/40',
  info: 'border-transparent bg-info text-on-brand hover:bg-info-hover active:bg-info-active focus-visible:ring-info/40',
};

/** Secondary — нейтральные действия (отмена, фильтры): bg.sunken + border. */
const secondaryClasses =
  'border-line bg-sunken text-fg-primary hover:border-line hover:bg-line active:border-line-strong active:bg-line-strong focus-visible:ring-brand-primary/40';

/** Subtle — тихие действия в карточках и списках (fill: {pal}.subtle). */
const subtleClasses: Record<ButtonPalette, string> = {
  primary:
    'border-transparent bg-brand-subtle text-brand-primary hover:border-brand-primary hover:text-brand-hover active:border-brand-active active:text-brand-active focus-visible:ring-brand-primary/40',
  success:
    'border-transparent bg-success-subtle text-success hover:border-success hover:text-success-hover active:border-success-active active:text-success-active focus-visible:ring-success/40',
  warning:
    'border-transparent bg-warning-subtle text-warning hover:border-warning hover:text-warning-hover active:border-warning-active active:text-warning-active focus-visible:ring-warning/40',
  danger:
    'border-transparent bg-danger-subtle text-danger hover:border-danger hover:text-danger-hover active:border-danger-active active:text-danger-active focus-visible:ring-danger/40',
  info: 'border-transparent bg-info-subtle text-info hover:border-info hover:text-info-hover active:border-info-active active:text-info-active focus-visible:ring-info/40',
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

/** Mobile-first sizes: S 32→36, M 36→40, L 40→44, icon 36→40 (mockup geometry). */
const sizeClasses: Record<ButtonSize, string> = {
  s: 'h-8 gap-2 px-4 text-sm leading-5 md:h-9 md:text-md [&_svg:not([class*=size-])]:size-3.5',
  m: 'h-9 gap-2 px-4 text-lg leading-5 md:h-10',
  l: 'h-10 gap-2 px-4 text-lg leading-5 md:h-11',
  icon: 'size-9 md:size-10',
};

interface ButtonProps extends ComponentProps<'button'> {
  /** Вид кнопки: solid — основное действие, secondary — нейтральная, subtle — тихая. */
  variant?: ButtonVariant;
  /** Палитра заливки и текста; для secondary не используется. */
  palette?: ButtonPalette;
  /** Размер: высоты mobile → desktop, icon — квадратная кнопка только с иконкой. */
  size?: ButtonSize;
  /** Показывает спиннер и блокирует клики; подпись берётся из children или «Загрузка…». */
  loading?: boolean;
  /** Растягивает кнопку на всю ширину контейнера (типично для мобильных). */
  fullWidth?: boolean;
}

function Button({
  className,
  variant = 'solid',
  palette = 'primary',
  size = 'm',
  loading = false,
  fullWidth = false,
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
      className={cn(
        "inline-flex shrink-0 cursor-pointer select-none items-center justify-center gap-2 whitespace-nowrap rounded-button border font-bold outline-none transition-colors focus-visible:ring-3 disabled:pointer-events-none disabled:opacity-45 data-[loading]:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        variantClasses[variant][palette],
        sizeClasses[size],
        fullWidth && 'w-full',
        className,
      )}
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
  buttonPalettes,
  buttonSizes,
  buttonVariants,
  type ButtonPalette,
  type ButtonProps,
  type ButtonSize,
  type ButtonVariant,
};
