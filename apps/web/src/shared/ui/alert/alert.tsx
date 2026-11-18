'use client';

import { CircleAlert, CircleCheck, CircleX, Info, X } from 'lucide-react';
import { cn } from '@/shared/lib';

const alertPalettes = ['success', 'warning', 'danger', 'info'] as const;
type AlertPalette = (typeof alertPalettes)[number];

/** Banners per the mockup: fill {pal}.subtle, border and title in the palette color.
 *  warning/info titles use the -hover step in the light theme: the raw hues fail AA
 *  on the blended subtle backgrounds (3.3 and 4.49). */
const paletteClasses: Record<AlertPalette, { box: string; title: string }> = {
  success: { box: 'border-success bg-success-subtle', title: 'text-success' },
  warning: {
    box: 'border-warning bg-warning-subtle',
    title: 'text-warning-hover dark:text-warning',
  },
  danger: { box: 'border-danger bg-danger-subtle', title: 'text-danger' },
  info: { box: 'border-info bg-info-subtle', title: 'text-info-hover dark:text-info' },
};

const paletteIcons: Record<AlertPalette, typeof CircleCheck> = {
  success: CircleCheck,
  warning: CircleAlert,
  danger: CircleX,
  info: Info,
};

interface AlertAction {
  /** Action link label. */
  label: string;
  onClick?: () => void;
}

interface AlertProps {
  /** Banner semantics: success / warning / danger / info. */
  palette?: AlertPalette;
  /** One-line title. */
  title: string;
  /** Text under the title. */
  description?: string;
  /** Action link under the text. */
  action?: AlertAction;
  /** Cross icon on the right; closing is via onClose. */
  closable?: boolean;
  onClose?: () => void;
  className?: string;
}

/** Alert per the "Atoms — alerts" mockup: icon + title (+ text, action, cross). */
function Alert({
  palette = 'success',
  title,
  description,
  action,
  closable = false,
  onClose,
  className,
}: AlertProps) {
  const Icon = paletteIcons[palette];
  const { box, title: titleColor } = paletteClasses[palette];

  return (
    <div
      data-slot="alert"
      data-palette={palette}
      role="alert"
      className={cn('flex items-start gap-3 rounded-xl border p-4', box, className)}
    >
      <Icon className={cn('mt-0.5 size-5 shrink-0', titleColor)} />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div data-slot="alert-title" className={cn('text-body-s leading-5 font-bold', titleColor)}>
          {title}
        </div>
        {description ? (
          <div data-slot="alert-description" className="text-body-s leading-5 text-fg-secondary">
            {description}
          </div>
        ) : null}
        {action ? (
          <button
            type="button"
            data-slot="alert-action"
            onClick={action.onClick}
            className={cn(
              'w-fit cursor-pointer text-left text-body-s leading-5 font-bold hover:underline',
              titleColor,
            )}
          >
            {action.label}
          </button>
        ) : null}
      </div>
      {closable ? (
        <button
          type="button"
          data-slot="alert-close"
          aria-label="Закрыть"
          onClick={onClose}
          className="flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-md text-fg-muted transition-colors outline-none hover:bg-surface hover:text-fg-primary focus-visible:ring-3 focus-visible:ring-brand-primary/40"
        >
          <X className="size-3.5" />
        </button>
      ) : null}
    </div>
  );
}

export { Alert, alertPalettes, type AlertAction, type AlertPalette, type AlertProps };
