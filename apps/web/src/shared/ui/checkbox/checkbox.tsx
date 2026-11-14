'use client';

import { useId } from 'react';
import { Checkbox as CheckboxPrimitive } from 'radix-ui';
import { Check } from 'lucide-react';
import { cn } from '@/shared/lib';

interface CheckboxProps {
  /** Контролируемое состояние; вместе с onCheckedChange. */
  checked?: boolean;
  /** Неконтролируемое начальное состояние. */
  defaultChecked?: boolean;
  /** Срабатывает при переключении; состояние снаружи не меняет (controlled). */
  onCheckedChange?: (checked: boolean) => void;
  /** Подпись справа от бокса; клик по ней переключает чекбокс. */
  label?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
}

/** Чекбокс по токенам дизайн-системы: бокс 20, radius/s 4, brand при отметке. */
function Checkbox({
  checked,
  defaultChecked,
  onCheckedChange,
  label,
  disabled = false,
  id,
  className,
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
            'text-lg leading-5 select-none',
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
