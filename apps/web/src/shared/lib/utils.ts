import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/** Имена размеров текста из tokens/text-sizes.css (роли макета). */
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

/** Имена цветов палитры из tokens/colors.css (группа/роль дизайн-токена). */
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

/**
 * twMerge с нашей темой: без этого кастомные `text-caption` / `text-fg-muted`
 * выглядят для слияния одинаково и вытесняют друг друга.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [{ text: textSizes }],
      'text-color': [{ text: palette }],
      'bg-color': [{ bg: palette }],
      'border-color': [{ border: palette }],
      'ring-color': [{ ring: palette }],
    },
  },
});

/** Склеивает имена классов и разрешает конфликты Tailwind (последний класс побеждает). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
