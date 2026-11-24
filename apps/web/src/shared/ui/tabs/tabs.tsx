'use client';

import { useEffect, useState } from 'react';
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
  /** Id of the tab's panel rendered by the page; sets aria-controls on the trigger.
   *  The atom draws only the tab bar, so panel wiring is explicit — a tab without
   *  a rendered panel must NOT get a dangling aria-controls (axe broken IDREF). */
  panelId?: string;
}

interface TabsProps {
  tabs: TabItem[];
  value: string;
  onValueChange: (value: string) => void;
  /** underline — main style (2px brand.primary bar) · pill — segment filter (surface on sunken). */
  variant?: TabVariant;
  className?: string;
}

/** True while the last user input was the keyboard. Radix focuses a clicked tab
 *  programmatically and Chrome counts that as :focus-visible once the keyboard
 *  was ever used — gating the ring on the input mode keeps a mouse click clean
 *  while keyboard users (Tab in, arrows) still get the focus indicator. */
function useKeyboardInput(): boolean {
  const [keyboard, setKeyboard] = useState(false);
  useEffect(() => {
    const markKeyboard = () => {
      setKeyboard(true);
    };
    const markPointer = () => {
      setKeyboard(false);
    };
    window.addEventListener('keydown', markKeyboard);
    window.addEventListener('pointerdown', markPointer);
    return () => {
      window.removeEventListener('keydown', markKeyboard);
      window.removeEventListener('pointerdown', markPointer);
    };
  }, []);
  return keyboard;
}

/** Tabs per the "Atoms — tabs" mockup: underline with 2px bar · pill segment filter · counters. */
function Tabs({ tabs, value, onValueChange, variant = 'underline', className }: TabsProps) {
  const isPill = variant === 'pill';
  const keyboardInput = useKeyboardInput();

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
            // Radix points aria-controls at a content id that does not exist while the
            // atom renders only the tab bar — axe flags that as a broken IDREF. Override
            // it: a trigger gets aria-controls only when the page really renders a panel
            // with that id (tab.panelId), otherwise the attribute is dropped entirely.
            aria-controls={tab.panelId}
            // drives the gated focus ring (see useKeyboardInput)
            data-keyboard-input={keyboardInput || undefined}
            className={cn(
              'inline-flex cursor-pointer items-center gap-2 font-bold outline-none transition-all select-none',
              'data-[keyboard-input=true]:focus-visible:ring-3 data-[keyboard-input=true]:focus-visible:ring-brand-primary/40',
              isPill
                ? 'rounded-md px-4 py-2 text-base text-fg-secondary hover:bg-surface/60 hover:text-fg-primary active:bg-surface data-[state=active]:bg-surface data-[state=active]:text-fg-primary data-[state=active]:shadow-sm'
                : 'relative rounded-t-lg px-4 py-2.5 text-base text-fg-secondary hover:bg-sunken/70 hover:text-fg-primary active:bg-sunken data-[state=active]:text-brand-text',
              tab.disabled && 'pointer-events-none text-fg-muted',
            )}
          >
            {tab.icon}
            {tab.label}
            {tab.count !== undefined ? (
              <span className="text-micro font-bold text-fg-muted [[data-state=active]_&]:text-brand-text">
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
