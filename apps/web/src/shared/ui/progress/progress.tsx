import { Progress as ProgressPrimitive } from 'radix-ui';
import { cn } from '@/shared/lib';

interface ProgressProps extends ProgressPrimitive.ProgressProps {
  /** Значение 0–100. */
  value: number;
}

/** Прогресс-бар по макету «Атомы — загрузка»: трек sunken · заливка brand · radius full. */
function Progress({ value, className, ...props }: ProgressProps) {
  const percent = Math.min(100, Math.max(0, value));
  return (
    <ProgressPrimitive.Root
      value={percent}
      data-slot="progress"
      className={cn('h-1.5 w-full overflow-hidden rounded-full bg-sunken', className)}
      {...props}
    >
      <ProgressPrimitive.Indicator
        className="h-full rounded-full bg-brand-primary transition-all"
        style={{ width: `${String(percent)}%` }}
      />
    </ProgressPrimitive.Root>
  );
}

export { Progress, type ProgressProps };
