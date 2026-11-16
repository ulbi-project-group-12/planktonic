import { Progress as ProgressPrimitive } from 'radix-ui';
import { cn } from '@/shared/lib';

interface ProgressProps extends ProgressPrimitive.ProgressProps {
  /** Value 0–100. */
  value: number;
}

/** Progress bar per the "Atoms — loading" mockup: sunken track · brand fill · radius full. */
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
