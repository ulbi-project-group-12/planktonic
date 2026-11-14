import { useId, useRef } from 'react';
import type { ComponentProps, ReactNode } from 'react';
import { CircleAlert, CircleCheck } from 'lucide-react';
import { cn } from '@/shared/lib';

const inputStatuses = ['default', 'error', 'success'] as const;
type InputStatus = (typeof inputStatuses)[number];

interface InputProps extends ComponentProps<'input'> {
  /** Label над полем, 13/700; автоматически связывается с полем через htmlFor. */
  label?: string;
  /** Подсказка под полем, 12 px muted; уступает место message. */
  hint?: string;
  /** Состояние поля: error — border $danger + иконка alert, success — border $success + иконка check. */
  status?: InputStatus;
  /** Сообщение под полем в цвете состояния; без status выводится нейтральным цветом. */
  message?: string;
  /** Иконка слева внутри поля (например, поиск). */
  icon?: ReactNode;
  /** Единицы справа внутри поля (например, «дн.»). */
  suffix?: ReactNode;
}

/**
 * Строковый и числовой инпут по макету: белый фон во всех активных состояниях,
 * серый sunken только у disabled; h 40, radius 10, текст 14/400.
 *
 * Состояния: focus — border brand + кольцо 3 px; error — border $danger + сообщение;
 * success — border $success + иконка; disabled — фон sunken + текст muted.
 */
function Input({
  className,
  label,
  hint,
  status = 'default',
  message,
  icon,
  suffix,
  id,
  disabled,
  ...props
}: InputProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const inputRef = useRef<HTMLInputElement>(null);
  const text = message !== undefined && message !== '' ? message : hint;
  const textClass =
    status === 'error' ? 'text-danger' : status === 'success' ? 'text-success' : 'text-fg-muted';

  return (
    <div data-slot="input-group" className="flex w-full min-w-0 flex-col gap-1.5">
      {label ? (
        <label htmlFor={inputId} className="text-md font-bold text-fg-primary">
          {label}
        </label>
      ) : null}
      <div
        data-slot="input"
        data-status={status}
        onClick={(event) => {
          // Клик по любой части обводки (паддинги, иконки) фокусирует поле.
          if (event.target !== inputRef.current) inputRef.current?.focus();
        }}
        className={cn(
          'flex h-10 cursor-text items-center gap-2 rounded-button border border-line bg-surface px-3 transition-colors',
          'has-disabled:cursor-not-allowed',
          'focus-within:ring-3',
          'has-disabled:bg-sunken',
          // Фокус сохраняет цвет статуса: error/success — их кольцо, иначе brand.
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
        <input
          ref={inputRef}
          id={inputId}
          disabled={disabled}
          className="h-full w-full min-w-0 flex-1 bg-transparent text-lg leading-5 text-fg-primary outline-none placeholder:text-fg-muted disabled:cursor-not-allowed disabled:text-fg-muted"
          {...props}
        />
        {status === 'error' ? (
          <CircleAlert className="size-4 shrink-0 text-danger" />
        ) : status === 'success' ? (
          <CircleCheck className="size-4 shrink-0 text-success" />
        ) : suffix ? (
          <span className="shrink-0 text-lg leading-5 text-fg-muted">{suffix}</span>
        ) : null}
      </div>
      {text ? <p className={cn('text-sm', textClass)}>{text}</p> : null}
    </div>
  );
}

export { Input, inputStatuses, type InputProps, type InputStatus };
