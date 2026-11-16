import type { ReactNode } from 'react';
import { Tabs as TabsPrimitive } from 'radix-ui';
import { cn } from '@/shared/lib';

const tabVariants = ['underline', 'pill'] as const;
type TabVariant = (typeof tabVariants)[number];

interface TabItem {
  value: string;
  label: string;
  /** Counter to the right of the label — 10/700, brand in the active tab. */
  count?: number;
  icon?: ReactNode;
  disabled?: boolean;
}

interface TabsProps {
  tabs: TabItem[];
  value: string;
  onValueChange: (value: string) => void;
  /** underline — main style (2px brand.primary bar) · pill — segment filter (surface on sunken). */
  variant?: TabVariant;
  className?: string;
}

/** Tabs per the "Atoms — tabs" mockup: underline with 2px bar · pill segment filter · counters. */
function Tabs({ tabs, value, onValueChange, variant = 'underline', className }: TabsProps) {
  const isPill = variant === 'pill';

  return (
    <TabsPrimitive.Root
      value={value}
      onValueChange={onValueChange}
      data-slot="tabs"
      data-variant={variant}
      className={className}
    >
      <TabsPrimitive.List
        className={cn(
          'flex items-center',
          isPill ? 'w-fit gap-1 rounded-lg bg-sunken p-1' : 'border-b border-line',
        )}
      >
        {tabs.map((tab) => (
          <TabsPrimitive.Trigger
            key={tab.value}
            value={tab.value}
            disabled={tab.disabled}
            className={cn(
              'inline-flex cursor-pointer items-center gap-2 font-bold outline-none transition-all select-none',
              'focus-visible:ring-3 focus-visible:ring-brand-primary/40',
              isPill
                ? 'rounded-md px-4 py-2 text-base text-fg-secondary hover:bg-surface/60 hover:text-fg-primary active:bg-surface data-[state=active]:bg-surface data-[state=active]:text-fg-primary data-[state=active]:shadow-sm'
                : 'relative rounded-t-lg px-4 py-2.5 text-base text-fg-secondary hover:bg-sunken/70 hover:text-fg-primary active:bg-sunken data-[state=active]:text-brand-primary',
              tab.disabled && 'pointer-events-none text-fg-muted',
            )}
          >
            {tab.icon}
            {tab.label}
            {tab.count !== undefined ? (
              <span className="text-micro font-bold text-fg-muted [[data-state=active]_&]:text-brand-primary">
                {tab.count}
              </span>
            ) : null}
            {isPill ? null : (
              <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-brand-primary opacity-0 transition-opacity [[data-state=active]_&]:opacity-100" />
            )}
          </TabsPrimitive.Trigger>
        ))}
      </TabsPrimitive.List>
    </TabsPrimitive.Root>
  );
}

export { Tabs, tabVariants, type TabItem, type TabsProps, type TabVariant };
