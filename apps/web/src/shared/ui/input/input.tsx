import { useId, useRef } from 'react';
import type { ComponentProps, ReactNode } from 'react';
import { CircleAlert, CircleCheck } from 'lucide-react';
import { cn } from '@/shared/lib';
import { Label } from '@/shared/ui/label';

const inputStatuses = ['default', 'error', 'success'] as const;
type InputStatus = (typeof inputStatuses)[number];

interface InputProps extends Omit<ComponentProps<'input'>, 'prefix'> {
  /** Label above the field, 13/700; automatically linked to the field via htmlFor. */
  label?: string;
  /** Hint under the field, 12 px muted; yields to message. */
  hint?: string;
  /** Field state: error — border $danger + alert icon, success — border $success + check icon. */
  status?: InputStatus;
  /** Message under the field in the state color; without status it renders in a neutral color. */
  message?: string;
  /** Icon on the left inside the field (e.g. search). */
  icon?: ReactNode;
  /** Static text on the left inside the field (e.g. a domain prefix). */
  prefix?: ReactNode;
  /** Units on the right inside the field (e.g. "days"). */
  suffix?: ReactNode;
}

/**
 * Text and number input per the mockup: white background in all active states,
 * sunken gray only when disabled; h 40, radius 10, text 14/400.
 *
 * States: focus — brand border + 3 px ring; error — $danger border + message;
 * success — $success border + icon; disabled — sunken background + muted text.
 */
function Input({
  className,
  label,
  hint,
  status: statusProp = 'default',
  message,
  icon,
  prefix,
  suffix,
  id,
  disabled,
  'aria-describedby': describedBy,
  ...props
}: InputProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const inputRef = useRef<HTMLInputElement>(null);
  // An aria-invalid from outside (Field sets it on error) shows the error look too, so the
  // screen does not have to pass both Field's error and status="error".
  const invalid = props['aria-invalid'] === true || props['aria-invalid'] === 'true';
  const status = invalid && statusProp === 'default' ? 'error' : statusProp;
  const text = message !== undefined && message !== '' ? message : hint;
  // Hint/message are linked to the field for screen readers; an external aria-describedby is kept too.
  const textId = `${inputId}-text`;
  const describedByIds = [describedBy, text ? textId : undefined].filter(Boolean).join(' ');
  const textClass =
    status === 'error' ? 'text-danger' : status === 'success' ? 'text-success' : 'text-fg-muted';

  return (
    <div data-slot="input-group" className="flex w-full min-w-0 flex-col gap-1.5">
      {label ? (
        <Label htmlFor={inputId} disabled={disabled}>
          {label}
        </Label>
      ) : null}
      <div
        data-slot="input"
        data-status={status}
        onClick={(event) => {
          // Clicking any part of the outline (padding, icons) focuses the field.
          if (event.target !== inputRef.current) inputRef.current?.focus();
        }}
        className={cn(
          'flex h-10 cursor-text items-center gap-2 rounded-button border border-line bg-surface px-3 transition-colors',
          'has-disabled:cursor-not-allowed',
          'focus-within:ring-3',
          'has-disabled:bg-sunken',
          // Focus keeps the status color: error/success keep their ring, otherwise brand.
          status === 'error'
            ? 'border-danger focus-within:border-danger focus-within:ring-danger/40'
            : status === 'success'
              ? 'border-success focus-within:border-success focus-within:ring-success/40'
              : 'focus-within:border-brand-primary focus-within:ring-brand-primary/40',
          className,
        )}
      >
        {icon ? (
          <span className="flex size-3.5 items-center justify-center text-fg-muted [&_svg]:size-3.5">
            {icon}
          </span>
        ) : null}
        {prefix ? (
          <span className="shrink-0 text-body-s leading-5 text-fg-muted select-none">{prefix}</span>
        ) : null}
        <input
          ref={inputRef}
          id={inputId}
          disabled={disabled}
          aria-invalid={status === 'error' || undefined}
          aria-describedby={describedByIds || undefined}
          className="h-full w-full min-w-0 flex-1 bg-transparent text-body-s leading-5 text-fg-primary outline-none placeholder:text-fg-muted disabled:cursor-not-allowed disabled:text-fg-muted"
          {...props}
        />
        {status === 'error' ? (
          <CircleAlert className="size-4 shrink-0 text-danger" />
        ) : status === 'success' ? (
          <CircleCheck className="size-4 shrink-0 text-success" />
        ) : suffix ? (
          <span className="shrink-0 text-body-s leading-5 text-fg-muted">{suffix}</span>
        ) : null}
      </div>
      {text ? (
        <p id={textId} className={cn('text-caption', textClass)}>
          {text}
        </p>
      ) : null}
    </div>
  );
}

export { Input, inputStatuses, type InputProps, type InputStatus };
