import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/** Text size names from tokens/text-sizes.css (mockup roles). */
const textSizes = [
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
];

/** Palette color names from tokens/colors.css (design token group/role). */
const palette = [
  'brand-primary',
  'brand-hover',
  'brand-active',
  'brand-subtle',
  'fg-primary',
  'fg-secondary',
  'fg-muted',
  'line',
  'line-strong',
  'app',
  'surface',
  'sunken',
  'overlay',
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
];

/** Elevation shadow names from tokens/shadows.css (shadow-elevation-1 … 6). */
const shadows = [
  'elevation-1',
  'elevation-2',
  'elevation-3',
  'elevation-4',
  'elevation-5',
  'elevation-6',
];

/**
 * twMerge with our theme: without this, custom `text-caption` / `text-fg-muted`
 * look identical to the merge and evict each other.
 */
const twMerge = extendTailwindMerge({
  extend: {
    // without it `shadow-elevation-1` reads as a shadow color and evicts `shadow-<color>`
    theme: { shadow: shadows },
    classGroups: {
      'font-size': [{ text: textSizes }],
      'text-color': [{ text: palette }],
      'bg-color': [{ bg: palette }],
      'border-color': [{ border: palette }],
      'ring-color': [{ ring: palette }],
    },
  },
});

/** Joins class names and resolves Tailwind conflicts (the last utility wins). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
