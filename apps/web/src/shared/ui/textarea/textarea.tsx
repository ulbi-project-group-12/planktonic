import { useId } from 'react';
import type { ComponentProps } from 'react';
import { cn } from '@/shared/lib';
import { Label } from '@/shared/ui/label';

const textareaStatuses = ['default', 'error', 'success'] as const;
type TextareaStatus = (typeof textareaStatuses)[number];

interface TextareaProps extends ComponentProps<'textarea'> {
  /** Label above the field, 13/700; automatically linked to the field via htmlFor. */
  label?: string;
  /** Hint under the field, 12 px muted; yields to message. */
  hint?: string;
  /** Field state: error — border $danger, success — border $success. */
  status?: TextareaStatus;
  /** Message under the field in the state color; without status it renders in a neutral color. */
  message?: string;
}

/**
 * Multiline text field: same geometry and states as Input — white background in active
 * states, sunken gray when disabled, radius 10, text 14/400, focus ring 3 px.
 *
 * States: focus — brand border + ring; error — $danger border + message;
 * success — $success border; disabled — sunken background + muted text.
 */
function Textarea({
  className,
  label,
  hint,
  status = 'default',
  message,
  id,
  disabled,
  'aria-describedby': describedBy,
  ...props
}: TextareaProps) {
  const autoId = useId();
  const textareaId = id ?? autoId;
  const text = message !== undefined && message !== '' ? message : hint;
  // Hint/message are linked to the field for screen readers; an external aria-describedby is kept too.
  const textId = `${textareaId}-text`;
  const describedByIds = [describedBy, text ? textId : undefined].filter(Boolean).join(' ');
  const textClass =
    status === 'error' ? 'text-danger' : status === 'success' ? 'text-success' : 'text-fg-muted';

  return (
    <div data-slot="textarea-group" className="flex w-full min-w-0 flex-col gap-1.5">
      {label ? (
        <Label htmlFor={textareaId} disabled={disabled}>
          {label}
        </Label>
      ) : null}
      <textarea
        data-slot="textarea"
        data-status={status}
        id={textareaId}
        disabled={disabled}
        aria-invalid={status === 'error' || undefined}
        aria-describedby={describedByIds || undefined}
        className={cn(
          'min-h-24 w-full resize-y rounded-button border border-line bg-surface px-3 py-2.5 text-body-s leading-5 text-fg-primary outline-none transition-colors',
          'placeholder:text-fg-muted disabled:cursor-not-allowed disabled:bg-sunken disabled:text-fg-muted',
          // Focus keeps the status color: error/success keep their ring, otherwise brand.
          status === 'error'
            ? 'border-danger focus-visible:border-danger focus-visible:ring-3 focus-visible:ring-danger/40'
            : status === 'success'
              ? 'border-success focus-visible:border-success focus-visible:ring-3 focus-visible:ring-success/40'
              : 'focus-visible:border-brand-primary focus-visible:ring-3 focus-visible:ring-brand-primary/40',
          className,
        )}
        {...props}
      />
      {text ? (
        <p id={textId} className={cn('text-caption', textClass)}>
          {text}
        </p>
      ) : null}
    </div>
  );
}

export { Textarea, textareaStatuses, type TextareaProps, type TextareaStatus };
