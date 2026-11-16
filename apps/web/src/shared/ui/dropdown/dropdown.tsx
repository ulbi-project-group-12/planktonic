import type { ReactElement, ReactNode } from 'react';
import { DropdownMenu as DropdownPrimitive } from 'radix-ui';
import { Check, ChevronRight } from 'lucide-react';
import { cn } from '@/shared/lib';

interface DropdownProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: ReactNode;
}

/** Контролируемый корень дропдауна. */
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
  'z-50 min-w-44 overflow-hidden rounded-[10px] border border-line bg-surface p-1 shadow-[0_4px_16px_rgba(15,18,28,0.12)]',
);

/** Контент меню: radius 10 · shadow 0/4/16 · z/menu 50. */
function DropdownContent({
  className,
  sideOffset = 4,
  portalContainer,
  children,
  ...props
}: DropdownPrimitive.DropdownMenuContentProps & {
  /** Контейнер для портала (например, тёмная тема сторис); по умолчанию — body. */
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
  /** Опасное действие — текст danger, подложка danger.subtle. */
  danger?: boolean;
}

/** Пункт меню: h 28 · hover bg.sunken. */
function DropdownItem({ className, danger = false, ...props }: DropdownItemProps) {
  return (
    <DropdownPrimitive.Item
      className={cn(itemClass, danger && dangerItemClass, className)}
      {...props}
    />
  );
}

type DropdownCheckboxItemProps = DropdownPrimitive.DropdownMenuCheckboxItemProps;

/** Пункт с выбором: галочка слева (сортировка «Сначала новые»). */
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

/** Заголовок секции («Сортировка», «Перенести в»). */
function DropdownLabel({ className, ...props }: DropdownPrimitive.DropdownMenuLabelProps) {
  return (
    <DropdownPrimitive.Label
      className={cn(
        'px-2 pt-1.5 pb-1 text-[10px] font-bold tracking-wider text-fg-muted uppercase',
        className,
      )}
      {...props}
    />
  );
}

function DropdownSeparator({ className, ...props }: DropdownPrimitive.DropdownMenuSeparatorProps) {
  return <DropdownPrimitive.Separator className={cn('my-1 h-px bg-line', className)} {...props} />;
}

/** Вложенное меню («Перенести в →» открывается справа). */
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
