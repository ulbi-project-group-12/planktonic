import type { ComponentProps } from 'react';
import { cn } from '@/shared/lib';

interface LabelProps extends ComponentProps<'label'> {
  /** Required marker: a danger asterisk after the text. */
  required?: boolean;
  /** Muted look for labels of disabled controls. */
  disabled?: boolean;
}

/** Field label per the mockup: 13/700, muted when the control is disabled. */
function Label({ required, disabled, className, children, ...props }: LabelProps) {
  return (
    <label
      data-slot="label"
      className={cn(
        'text-body-xs font-bold',
        disabled ? 'text-fg-muted' : 'text-fg-primary',
        className,
      )}
      {...props}
    >
      {children}
      {required ? (
        <span aria-hidden="true" className="ml-0.5 text-danger">
          *
        </span>
      ) : null}
    </label>
  );
}

export { Label, type LabelProps };
