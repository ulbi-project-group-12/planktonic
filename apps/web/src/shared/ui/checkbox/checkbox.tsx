'use client';

import { useId } from 'react';
import type { ComponentPropsWithoutRef } from 'react';
import { Checkbox as CheckboxPrimitive } from 'radix-ui';
import { Check } from 'lucide-react';
import { cn } from '@/shared/lib';

interface CheckboxProps extends Omit<
  ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>,
  'checked' | 'onCheckedChange'
> {
  /** Controlled state; together with onCheckedChange. */
  checked?: boolean;
  /** Uncontrolled initial state. */
  defaultChecked?: boolean;
  /** Fires on toggle; does not change the state itself (controlled). */
  onCheckedChange?: (checked: boolean) => void;
  /** Caption to the right of the box; clicking it toggles the checkbox. */
  label?: string;
}

/** Checkbox per the design system tokens: 20 box, radius/s 4, brand when checked. */
function Checkbox({
  checked,
  defaultChecked,
  onCheckedChange,
  label,
  disabled = false,
  id,
  className,
  ...rest
}: CheckboxProps) {
  const autoId = useId();
  const checkboxId = id ?? autoId;

  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <CheckboxPrimitive.Root
        data-slot="checkbox"
        id={checkboxId}
        checked={checked}
        defaultChecked={defaultChecked}
        disabled={disabled}
        onCheckedChange={(state) => {
          onCheckedChange?.(state === true);
        }}
        // native button props (aria-label, aria-labelledby, etc.) go to the root
        {...rest}
        className={cn(
          'flex size-5 shrink-0 cursor-pointer items-center justify-center rounded-sm border border-line-strong bg-surface transition-colors outline-none',
          'focus-visible:ring-3 focus-visible:ring-brand-primary/40',
          'data-[state=checked]:border-transparent data-[state=checked]:bg-brand-primary',
          'disabled:cursor-not-allowed disabled:opacity-45',
        )}
      >
        <CheckboxPrimitive.Indicator>
          <Check className="size-3.5 text-on-brand" strokeWidth={3} />
        </CheckboxPrimitive.Indicator>
      </CheckboxPrimitive.Root>
      {label ? (
        <label
          htmlFor={checkboxId}
          className={cn(
            'text-body-s leading-5 select-none',
            disabled ? 'cursor-not-allowed text-fg-muted' : 'cursor-pointer text-fg-primary',
          )}
        >
          {label}
        </label>
      ) : null}
    </div>
  );
}

export { Checkbox, type CheckboxProps };
