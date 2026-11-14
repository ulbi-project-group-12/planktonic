import * as React from 'react';
import { cn } from '@/shared/lib';

const typographySizes = [
  '2xs',
  'xs',
  'sm',
  'md',
  'lg',
  'xl',
  '2xl',
  '3xl',
  '4xl',
  '5xl',
  '6xl',
  '7xl',
  '8xl',
  '9xl',
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
  'app',
  'surface',
  'sunken',
  'overlay',
  'fg-primary',
  'fg-secondary',
  'fg-muted',
  'line',
  'line-strong',
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

/** Size tokens from the mockup type scale (see shared/Atoms/Typography).
   h1–h6 are semantic aliases of the heading steps, always paired with weight 700. */
const sizeClasses: Record<TypographySize, string> = {
  '2xs': 'text-2xs',
  xs: 'text-xs',
  sm: 'text-sm',
  md: 'text-md',
  lg: 'text-lg',
  xl: 'text-xl',
  '2xl': 'text-2xl',
  '3xl': 'text-3xl',
  '4xl': 'text-4xl',
  '5xl': 'text-5xl',
  '6xl': 'text-6xl',
  '7xl': 'text-7xl',
  '8xl': 'text-8xl',
  '9xl': 'text-9xl',
  h1: 'text-8xl',
  h2: 'text-7xl',
  h3: 'text-6xl',
  h4: 'text-5xl',
  h5: 'text-4xl',
  h6: 'text-2xl',
};

/** Palette colors from the mockup tokens (see Design Tokens/Colors). */
const colorClasses: Record<TypographyColor, string> = {
  'brand-primary': 'text-brand-primary',
  'brand-hover': 'text-brand-hover',
  'brand-active': 'text-brand-active',
  'brand-subtle': 'text-brand-subtle',
  app: 'text-app',
  surface: 'text-surface',
  sunken: 'text-sunken',
  overlay: 'text-overlay',
  'fg-primary': 'text-fg-primary',
  'fg-secondary': 'text-fg-secondary',
  'fg-muted': 'text-fg-muted',
  line: 'text-line',
  'line-strong': 'text-line-strong',
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

type TypographyElement = 'span' | 'p' | 'div' | 'h1' | 'h2' | 'h3' | 'h4' | 'label' | 'li';

function Typography({
  as = 'span',
  size = 'sm',
  color = 'fg-primary',
  weight = '400',
  className,
  ...props
}: React.HTMLAttributes<HTMLElement> & {
  as?: TypographyElement;
  size?: TypographySize;
  color?: TypographyColor;
  weight?: TypographyWeight;
}) {
  const Comp: React.ElementType = as;

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
  type TypographySize,
  type TypographyWeight,
};
