'use client';

import { cloneElement, useId } from 'react';
import type { HTMLAttributes, ReactElement, ReactNode } from 'react';
import { cn } from '@/shared/lib';
import { Label } from '@/shared/ui/label';

/** The form control Field can wire: accepts id / aria-* props (Input, Textarea, Select, Checkbox, …). */
type FieldControl = ReactElement<{
  id?: string;
  'aria-invalid'?: boolean;
  'aria-describedby'?: string;
}>;

interface FieldProps extends HTMLAttributes<HTMLDivElement> {
  /** Label above the control; linked to the control id via htmlFor. */
  label?: ReactNode;
  /** Hint under the control, 12 px muted; linked via aria-describedby. */
  hint?: ReactNode;
  /** Error under the control, 12 px danger; sets aria-invalid on the control
   *  and links the text via aria-describedby. */
  error?: ReactNode;
  /** Required marker on the label. */
  required?: boolean;
  /** Mutes the label (for disabled controls). */
  disabled?: boolean;
  /** The form control: Input, Textarea, Select, Checkbox, … Must accept id / aria-* props. */
  children: FieldControl;
}

/**
 * Form field: label + control + hint/error, wired for screen readers.
 *
 * The control is cloned with an id (auto-generated when absent) so the label's htmlFor
 * works out of the box; hint and error ids are merged into the control's aria-describedby
 * and an error sets aria-invalid. The atoms stay form-library-agnostic — a form passes
 * error and the control's props down.
 */
function Field({
  label,
  hint,
  error,
  required,
  disabled,
  children,
  className,
  ...props
}: FieldProps) {
  const autoId = useId();
  const hasError = error !== undefined && error !== null && error !== false;
  const controlId = children.props.id ?? autoId;
  const hintId = hint !== undefined ? `${controlId}-hint` : undefined;
  const errorId = hasError ? `${controlId}-error` : undefined;
  const describedByIds = [children.props['aria-describedby'], hintId, errorId]
    .filter(Boolean)
    .join(' ');

  // Cloning is the point of Field: any control (Input, Textarea, Select, Checkbox, a native
  // element) receives the label/error wiring without knowing about Field, so the atoms stay
  // form-library-agnostic. Context would require every atom to opt in — cloneElement does not.
  // eslint-disable-next-line @eslint-react/no-clone-element -- wiring arbitrary control children
  const control = cloneElement(children, {
    id: controlId,
    ...(hasError ? { 'aria-invalid': true } : null),
    ...(describedByIds ? { 'aria-describedby': describedByIds } : null),
  });

  return (
    <div
      data-slot="field"
      className={cn('flex w-full min-w-0 flex-col gap-1.5', className)}
      {...props}
    >
      {label !== undefined ? (
        <Label htmlFor={controlId} required={required} disabled={disabled}>
          {label}
        </Label>
      ) : null}
      {control}
      {hint !== undefined ? (
        <p id={hintId} className="text-caption text-fg-muted">
          {hint}
        </p>
      ) : null}
      {hasError ? (
        <p id={errorId} className="text-caption text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export { Field, type FieldProps };
