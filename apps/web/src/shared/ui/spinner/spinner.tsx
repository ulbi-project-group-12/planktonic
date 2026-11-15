import type { ComponentProps } from 'react';
import { LoaderCircle } from 'lucide-react';
import { cn } from '@/shared/lib';

const spinnerSizes = ['sm', 'md', 'lg', 'xl'] as const;
type SpinnerSize = (typeof spinnerSizes)[number];

const sizeClasses: Record<SpinnerSize, string> = {
  sm: 'size-4',
  md: 'size-5',
  lg: 'size-6',
  xl: 'size-8',
};

/** Спиннер по макету «Атомы — загрузка»: LoaderCircle · spin 0.8 s linear · brand. */
function Spinner({
  size = 'md',
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
