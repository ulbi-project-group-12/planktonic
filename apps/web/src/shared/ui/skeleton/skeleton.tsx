import type { ComponentProps } from 'react';
import { cn } from '@/shared/lib';

/** Скелетон по макету «Атомы — загрузка»: bg.sunken · radius 4 · импульс. */
function Skeleton({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      aria-hidden
      data-slot="skeleton"
      className={cn('animate-pulse rounded-sm bg-sunken', className)}
      {...props}
    />
  );
}

export { Skeleton };
