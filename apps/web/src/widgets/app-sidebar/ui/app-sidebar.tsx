'use client';

import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';
import { FolderKanban, Inbox, Layers, Mail, MessageSquare } from 'lucide-react';
import { WorkspaceSlug } from '@app/contracts';
import { WorkspaceSwitcher } from './workspace-switcher';
import { routes } from '@/shared/config';
import { cn } from '@/shared/lib';
import { Badge, Separator } from '@/shared/ui';

const MIN_WIDTH = 200;
const MAX_WIDTH = 400;

const navItemClass = cn(
  'flex items-center gap-2 rounded-button px-3 py-2 text-caption font-bold text-fg-secondary outline-none',
  'cursor-pointer',
  'hover:bg-sunken hover:text-fg-primary',
  'focus-visible:ring-3 focus-visible:ring-brand-primary/40',
  'aria-[current=page]:bg-brand-subtle aria-[current=page]:text-brand-text',
  'disabled:pointer-events-none disabled:opacity-50',
);

interface NavItemProps {
  href?: string;
  active?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  badge?: React.ReactNode;
}

function NavItem({ href, active, disabled, children, badge }: NavItemProps) {
  const className = cn(navItemClass, active && 'bg-brand-subtle text-brand-text');
  const content = (
    <>
      <span className="flex flex-1 items-center gap-2">{children}</span>
      {badge}
    </>
  );

  if (disabled || !href) {
    return (
      <span aria-current={active ? 'page' : undefined} aria-disabled className={className}>
        {content}
      </span>
    );
  }

  return (
    <Link href={href} aria-current={active ? 'page' : undefined} className={className}>
      {content}
    </Link>
  );
}

function isWorkspaceSlug(value: unknown): value is string {
  return typeof value === 'string' && WorkspaceSlug.safeParse(value).success;
}

interface AppSidebarProps {
  width?: number;
  onWidthChange?: (width: number) => void;
  className?: string;
  onWorkspaceSelect?: () => void;
}

export function AppSidebar({
  width = 264,
  onWidthChange,
  className,
  onWorkspaceSelect,
}: AppSidebarProps) {
  const pathname = usePathname();
  const params = useParams();
  const workspaceSlug = isWorkspaceSlug(params.workspaceSlug) ? params.workspaceSlug : undefined;

  function handleResizeKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (!onWidthChange) return;
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      onWidthChange(Math.max(MIN_WIDTH, width - 16));
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      onWidthChange(Math.min(MAX_WIDTH, width + 16));
    }
  }

  function handleResizeStart(event: React.PointerEvent<HTMLDivElement>) {
    const changeWidth = onWidthChange;
    if (!changeWidth) return;

    const target = event.currentTarget;
    if (typeof target.setPointerCapture === 'function') {
      target.setPointerCapture(event.pointerId);
    }
    const startX = event.clientX;
    const startWidth = width;

    function handlePointerMove(moveEvent: PointerEvent) {
      const nextWidth = Math.min(
        MAX_WIDTH,
        Math.max(MIN_WIDTH, startWidth + moveEvent.clientX - startX),
      );
      if (changeWidth) changeWidth(nextWidth);
    }

    function handlePointerUp() {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    }

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp, { once: true });
  }

  return (
    <aside
      aria-label="App sidebar"
      className={cn('relative flex shrink-0 flex-col border-r border-line p-3', className)}
      style={{ width }}
    >
      <div className="mb-3">
        <WorkspaceSwitcher onWorkspaceSelect={onWorkspaceSelect} />
      </div>

      <nav aria-label="Workspace navigation" className="flex flex-col gap-1">
        <NavItem href={routes.workspaces()} active={pathname === routes.workspaces()}>
          <Layers className="size-4" />
          Все пространства
        </NavItem>

        {workspaceSlug ? (
          <>
            <NavItem disabled badge={<Badge variant="danger" count={0} />}>
              <Inbox className="size-4" />
              Непрочитанное
            </NavItem>
            <NavItem disabled>
              <FolderKanban className="size-4" />
              Моя работа
            </NavItem>

            <Separator className="my-2" />

            <NavItem disabled>
              <FolderKanban className="size-4" />
              Проекты
            </NavItem>
            <NavItem disabled>
              <MessageSquare className="size-4" />
              Каналы
            </NavItem>
            <NavItem disabled>
              <Mail className="size-4" />
              Личные сообщения
            </NavItem>
          </>
        ) : (
          <>
            <Separator className="my-2" />
            <NavItem disabled>
              <FolderKanban className="size-4" />
              Проекты
            </NavItem>
            <NavItem disabled>
              <MessageSquare className="size-4" />
              Каналы
            </NavItem>
            <NavItem disabled>
              <Mail className="size-4" />
              Личные сообщения
            </NavItem>
            <p className="mt-2 text-caption text-fg-muted">
              Разделы появятся после выбора пространства
            </p>
          </>
        )}
      </nav>

      <div
        role="separator"
        aria-label="Resize sidebar"
        aria-orientation="vertical"
        onPointerDown={handleResizeStart}
        onKeyDown={handleResizeKeyDown}
        className={cn(
          'absolute top-0 right-[-2px] hidden h-full w-1 cursor-col-resize desktop-s:flex',
          'hover:bg-brand-primary/10',
          'focus-visible:ring-3 focus-visible:ring-brand-primary/40',
        )}
        tabIndex={0}
      />
    </aside>
  );
}
