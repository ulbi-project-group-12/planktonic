import type { ComponentProps } from 'react';

// RED stub: replaced by the shadcn registry source in the GREEN step.
export function Input({ 'aria-label': ariaLabel }: ComponentProps<'input'>) {
  return <input aria-label={ariaLabel} />;
}
