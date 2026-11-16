import type { ReactElement, ReactNode } from 'react';
import { DropdownMenu as DropdownPrimitive } from 'radix-ui';
import { Check, ChevronRight } from 'lucide-react';
import { cn } from '@/shared/lib';

interface DropdownProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: ReactNode;
}

/** Controlled dropdown root. */
function Dropdown({ open, onOpenChange, children }: DropdownProps) {
  return (
    <DropdownPrimitive.Root open={open} onOpenChange={onOpenChange}>
      {children}
    </DropdownPrimitive.Root>
  );
}

function DropdownTrigger({ children }: { children: ReactElement }) {
  return <DropdownPrimitive.Trigger asChild>{children}</DropdownPrimitive.Trigger>;
}

const contentClass = cn(
  'z-50 min-w-44 overflow-hidden rounded-button border border-line bg-surface p-1 shadow-sm',
);

/** Menu content: radius 10 · shadow-sm (elevation token) · z/menu 50. */
function DropdownContent({
  className,
  sideOffset = 4,
  portalContainer,
  children,
  ...props
}: DropdownPrimitive.DropdownMenuContentProps & {
  /** Portal container (e.g. a dark-themed story block); defaults to body. */
  portalContainer?: HTMLElement | null;
}) {
  return (
    <DropdownPrimitive.Portal container={portalContainer ?? undefined}>
      <DropdownPrimitive.Content
        sideOffset={sideOffset}
        className={cn(contentClass, className)}
        {...props}
      >
        {children}
      </DropdownPrimitive.Content>
    </DropdownPrimitive.Portal>
  );
}

const itemClass = cn(
  'flex h-7 cursor-pointer items-center gap-2 rounded-md px-2 text-caption text-fg-primary outline-none select-none',
  'data-[highlighted]:bg-sunken data-[disabled]:pointer-events-none data-[disabled]:text-fg-muted',
);

const dangerItemClass =
  'text-danger data-[highlighted]:bg-danger-subtle data-[highlighted]:text-danger';

interface DropdownItemProps extends DropdownPrimitive.DropdownMenuItemProps {
  /** Dangerous action — danger text, danger.subtle background. */
  danger?: boolean;
}

/** Menu item: h 28 · hover bg.sunken. */
function DropdownItem({ className, danger = false, ...props }: DropdownItemProps) {
  return (
    <DropdownPrimitive.Item
      className={cn(itemClass, danger && dangerItemClass, className)}
      {...props}
    />
  );
}

type DropdownCheckboxItemProps = DropdownPrimitive.DropdownMenuCheckboxItemProps;

/** Item with choice: checkmark on the left (sorting "Newest first"). */
function DropdownCheckboxItem({
  className,
  children,
  checked,
  ...props
}: DropdownCheckboxItemProps) {
  return (
    <DropdownPrimitive.CheckboxItem
      className={cn(itemClass, className)}
      checked={checked}
      {...props}
    >
      <span className="flex size-3.5 items-center justify-center">
        {checked ? <Check className="size-3.5" /> : null}
      </span>
      {children}
    </DropdownPrimitive.CheckboxItem>
  );
}

/** Section header ("Sorting", "Move to"). */
function DropdownLabel({ className, ...props }: DropdownPrimitive.DropdownMenuLabelProps) {
  return (
    <DropdownPrimitive.Label
      className={cn(
        'px-2 pt-1.5 pb-1 text-micro-s font-bold tracking-wider text-fg-muted uppercase',
        className,
      )}
      {...props}
    />
  );
}

function DropdownSeparator({ className, ...props }: DropdownPrimitive.DropdownMenuSeparatorProps) {
  return <DropdownPrimitive.Separator className={cn('my-1 h-px bg-line', className)} {...props} />;
}

/** Nested menu ("Move to →" opens on the right). */
function DropdownSub(props: DropdownPrimitive.DropdownMenuSubProps) {
  return <DropdownPrimitive.Sub {...props} />;
}

function DropdownSubTrigger({
  className,
  children,
  ...props
}: DropdownPrimitive.DropdownMenuSubTriggerProps) {
  return (
    <DropdownPrimitive.SubTrigger className={cn(itemClass, className)} {...props}>
      {children}
      <ChevronRight className="ml-auto size-3.5" />
    </DropdownPrimitive.SubTrigger>
  );
}

function DropdownSubContent({
  className,
  sideOffset = 2,
  portalContainer,
  children,
  ...props
}: DropdownPrimitive.DropdownMenuSubContentProps & {
  portalContainer?: HTMLElement | null;
}) {
  return (
    <DropdownPrimitive.Portal container={portalContainer ?? undefined}>
      <DropdownPrimitive.SubContent
        sideOffset={sideOffset}
        className={cn(contentClass, className)}
        {...props}
      >
        {children}
      </DropdownPrimitive.SubContent>
    </DropdownPrimitive.Portal>
  );
}

export {
  Dropdown,
  DropdownCheckboxItem,
  DropdownContent,
  DropdownItem,
  DropdownLabel,
  DropdownSeparator,
  DropdownSub,
  DropdownSubContent,
  DropdownSubTrigger,
  DropdownTrigger,
  type DropdownCheckboxItemProps,
  type DropdownItemProps,
  type DropdownProps,
};
