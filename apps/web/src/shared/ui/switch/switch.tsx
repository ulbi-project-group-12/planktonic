'use client';

import { useId } from 'react';
import type { ComponentPropsWithoutRef } from 'react';
import { Switch as SwitchPrimitive } from 'radix-ui';
import { cn } from '@/shared/lib';

interface SwitchProps extends Omit<
  ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>,
  'checked' | 'onCheckedChange'
> {
  /** Контролируемое состояние; вместе с onCheckedChange. */
  checked?: boolean;
  /** Неконтролируемое начальное состояние. */
  defaultChecked?: boolean;
  /** Срабатывает при переключении; состояние снаружи не меняет (controlled). */
  onCheckedChange?: (checked: boolean) => void;
  /** Подпись слева от переключателя; клик по ней переключает свитч. */
  label?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
}

/** Переключатель по макету модалки «Настройки»: трек 40×24, brand во включённом. */
function Switch({
  checked,
  defaultChecked,
  onCheckedChange,
  label,
  disabled = false,
  id,
  className,
  ...rest
}: SwitchProps) {
  const autoId = useId();
  const switchId = id ?? autoId;

  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <SwitchPrimitive.Root
        data-slot="switch"
        id={switchId}
        checked={checked}
        defaultChecked={defaultChecked}
        disabled={disabled}
        onCheckedChange={onCheckedChange}
        // нативные пропсы кнопки (aria-label, aria-labelledby и т.д.) — на корень
        {...rest}
        className={cn(
          'inline-flex h-6 w-10 shrink-0 cursor-pointer items-center rounded-full border p-0.5 transition-colors outline-none',
          'focus-visible:ring-3 focus-visible:ring-brand-primary/40',
          'border-line data-[state=unchecked]:bg-sunken',
          'data-[state=checked]:border-transparent data-[state=checked]:bg-brand-primary',
          'disabled:cursor-not-allowed disabled:opacity-45',
        )}
      >
        <SwitchPrimitive.Thumb
          className={cn(
            'block size-5 rounded-full bg-surface shadow-sm transition-transform',
            'data-[state=unchecked]:translate-x-0 data-[state=checked]:translate-x-3.5',
          )}
        />
      </SwitchPrimitive.Root>
      {label ? (
        <label
          htmlFor={switchId}
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

export { Switch, type SwitchProps };
