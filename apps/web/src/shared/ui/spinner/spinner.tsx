import type { ComponentProps } from 'react';
import { LoaderCircle } from 'lucide-react';
import { cn } from '@/shared/lib';

const spinnerSizes = ['s', 'm', 'l', 'xl'] as const;
type SpinnerSize = (typeof spinnerSizes)[number];

const sizeClasses: Record<SpinnerSize, string> = {
  s: 'size-4',
  m: 'size-5',
  l: 'size-6',
  xl: 'size-8',
};

/** Spinner per the "Atoms — loading" mockup: LoaderCircle · spin 0.8 s linear · brand. */
function Spinner({
  size = 'm',
  className,
  ...props
}: ComponentProps<typeof LoaderCircle> & { size?: SpinnerSize }) {
  return (
    <LoaderCircle
      aria-label="Загрузка"
      data-slot="spinner"
      data-size={size}
      className={cn(
        'animate-[spin_0.8s_linear_infinite] text-brand-primary',
        sizeClasses[size],
        className,
      )}
      {...props}
    />
  );
}

export { Spinner, spinnerSizes, type SpinnerSize };
