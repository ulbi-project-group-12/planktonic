import * as React from 'react';
import { cn } from '@/shared/lib';

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'h-8 w-full min-w-0 rounded-lg border border-line bg-transparent px-2.5 py-1 text-lg text-fg-primary transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-fg-muted focus-visible:border-brand-primary focus-visible:ring-3 focus-visible:ring-brand-primary/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-sunken disabled:opacity-50 aria-invalid:border-danger aria-invalid:ring-3 aria-invalid:ring-danger/20',
        className,
      )}
      {...props}
    />
  );
}

export { Input };
