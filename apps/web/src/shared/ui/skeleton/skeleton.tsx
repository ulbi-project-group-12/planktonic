import type { ComponentProps } from 'react';
import { cn } from '@/shared/lib';

/** Skeleton per the "Atoms — loading" mockup: bg.sunken · radius 4 · pulse. */
function Skeleton({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      aria-hidden
      data-slot="skeleton"
      className={cn('animate-pulse rounded-sm bg-sunken motion-reduce:animate-none', className)}
      {...props}
    />
  );
}

export { Skeleton };
