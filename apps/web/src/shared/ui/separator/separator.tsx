import type { ReactNode } from 'react';
import { Separator as SeparatorPrimitive } from 'radix-ui';
import { cn } from '@/shared/lib';

const separatorTones = ['default', 'strong', 'thick', 'brand'] as const;
type SeparatorTone = (typeof separatorTones)[number];

interface SeparatorProps {
  /** Line direction: horizontal (default) or vertical — toolbars and menu groups. */
  orientation?: 'horizontal' | 'vertical';
  /** default — border.default · 1px · strong — border.strong · 1px · thick — border.default · 2px · brand — brand.primary · 2px. */
  tone?: SeparatorTone;
  /** Caption between two line halves — horizontal only ("или", "12 ноября"). */
  children?: ReactNode;
  /** Section label style: uppercase with wider tracking ("НОВЫЕ"). */
  section?: boolean;
  /** Decorative rules (default) are hidden from assistive tech; pass false for a meaningful boundary. */
  decorative?: boolean;
  className?: string;
}

/** Separator per the "Atoms — разделитель" mockup: горизонтальный/вертикальный, с подписью, оттенки. */
function Separator({
  orientation = 'horizontal',
  tone = 'default',
  children,
  section = false,
  decorative = true,
  className,
}: SeparatorProps) {
  const thick = tone === 'thick' || tone === 'brand';
  const line = (stretch: boolean) => (
    <SeparatorPrimitive.Root
      decorative={decorative}
      orientation={orientation}
      data-slot="separator"
      className={cn(
        orientation === 'horizontal'
          ? thick
            ? 'h-[2px]'
            : 'h-px'
          : thick
            ? 'w-[2px] self-stretch'
            : 'w-px self-stretch',
        stretch ? 'flex-1' : orientation === 'horizontal' ? 'w-full' : 'h-full',
        tone === 'strong' && 'bg-line-strong',
        tone === 'brand' && 'bg-brand-primary',
        tone !== 'strong' && tone !== 'brand' && 'bg-line',
        className,
      )}
    />
  );

  if (children === undefined || orientation === 'vertical') {
    return line(false);
  }

  return (
    <div data-slot="separator-labeled" className="flex w-full items-center gap-3">
      {line(true)}
      <span
        className={cn(
          'shrink-0 text-fg-muted',
          section ? 'text-micro-s font-bold tracking-wider uppercase' : 'text-caption',
        )}
      >
        {children}
      </span>
      {line(true)}
    </div>
  );
}

export { Separator, separatorTones, type SeparatorProps, type SeparatorTone };
