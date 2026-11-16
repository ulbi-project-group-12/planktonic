import type { ElementType, HTMLAttributes } from 'react';
import { cn } from '@/shared/lib';

const typographySizes = [
  'micro-s',
  'micro',
  'caption',
  'body-xs',
  'body-s',
  'body',
  'body-l',
  'body-xl',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
] as const;
type TypographySize = (typeof typographySizes)[number];

const typographyColors = [
  'brand-primary',
  'brand-hover',
  'brand-active',
  'brand-subtle',
  'bg-app',
  'bg-surface',
  'bg-sunken',
  'bg-overlay',
  'text-primary',
  'text-secondary',
  'text-muted',
  'border-default',
  'border-strong',
  'on-brand',
  'success',
  'success-hover',
  'success-active',
  'success-subtle',
  'warning',
  'warning-hover',
  'warning-active',
  'warning-subtle',
  'danger',
  'danger-hover',
  'danger-active',
  'danger-subtle',
  'info',
  'info-hover',
  'info-active',
  'info-subtle',
] as const;
type TypographyColor = (typeof typographyColors)[number];

const typographyWeights = ['200', '400', '700'] as const;
type TypographyWeight = (typeof typographyWeights)[number];

type TypographyElement = 'span' | 'p' | 'div' | 'h1' | 'h2' | 'h3' | 'h4' | 'label' | 'li';

interface TypographyProps extends HTMLAttributes<HTMLElement> {
  /** HTML tag to render the text with: span, p, div, h1–h4, label, li. */
  as?: TypographyElement;
  /** Scale token from the mockup: micro-s–body-xl or semantic h1–h6 (always weight 700). */
  size?: TypographySize;
  /** Color by design token name (see Design Tokens/Colors); defaults to text-primary. */
  color?: TypographyColor;
  /** Onest weight: 200 (extralight), 400 (regular), 700 (bold). */
  weight?: TypographyWeight;
}

/** Size tokens from the mockup type scale (see shared/Atoms/Typography):
 *  h1–h6 — semantic headings, always paired with weight 700. */
const sizeClasses: Record<TypographySize, string> = {
  'micro-s': 'text-micro-s',
  micro: 'text-micro',
  caption: 'text-caption',
  'body-xs': 'text-body-xs',
  'body-s': 'text-body-s',
  body: 'text-body',
  'body-l': 'text-body-l',
  'body-xl': 'text-body-xl',
  h1: 'text-h1',
  h2: 'text-h2',
  h3: 'text-h3',
  h4: 'text-h4',
  h5: 'text-h5',
  h6: 'text-h6',
};

/** Palette colors by design token names (see Design Tokens/Colors). */
const colorClasses: Record<TypographyColor, string> = {
  'brand-primary': 'text-brand-primary',
  'brand-hover': 'text-brand-hover',
  'brand-active': 'text-brand-active',
  'brand-subtle': 'text-brand-subtle',
  'bg-app': 'text-app',
  'bg-surface': 'text-surface',
  'bg-sunken': 'text-sunken',
  'bg-overlay': 'text-overlay',
  'text-primary': 'text-fg-primary',
  'text-secondary': 'text-fg-secondary',
  'text-muted': 'text-fg-muted',
  'border-default': 'text-line',
  'border-strong': 'text-line-strong',
  'on-brand': 'text-on-brand',
  success: 'text-success',
  'success-hover': 'text-success-hover',
  'success-active': 'text-success-active',
  'success-subtle': 'text-success-subtle',
  warning: 'text-warning',
  'warning-hover': 'text-warning-hover',
  'warning-active': 'text-warning-active',
  'warning-subtle': 'text-warning-subtle',
  danger: 'text-danger',
  'danger-hover': 'text-danger-hover',
  'danger-active': 'text-danger-active',
  'danger-subtle': 'text-danger-subtle',
  info: 'text-info',
  'info-hover': 'text-info-hover',
  'info-active': 'text-info-active',
  'info-subtle': 'text-info-subtle',
};

/** Onest weights loaded by the design system (see tokens/fonts.css). */
const weightClasses: Record<TypographyWeight, string> = {
  '200': 'font-extralight',
  '400': 'font-normal',
  '700': 'font-bold',
};

/**
 * Text per the mockup: size from the scale tokens, color from the palette tokens,
 * weight from the loaded Onest weights (200/400/700).
 */
function Typography({
  as = 'span',
  size = 'caption',
  color = 'text-primary',
  weight = '400',
  className,
  ...props
}: TypographyProps) {
  const Comp: ElementType = as;

  return (
    <Comp
      data-slot="typography"
      data-size={size}
      data-color={color}
      data-weight={weight}
      className={cn(sizeClasses[size], colorClasses[color], weightClasses[weight], className)}
      {...props}
    />
  );
}

export {
  Typography,
  typographyColors,
  typographySizes,
  typographyWeights,
  type TypographyColor,
  type TypographyElement,
  type TypographyProps,
  type TypographySize,
  type TypographyWeight,
};
