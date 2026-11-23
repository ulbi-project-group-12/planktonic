'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { LogOut, Menu, Settings } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { WorkspaceSlug } from '@app/contracts';
import { PRODUCT_DISPLAY_NAME } from '@app/config/product';
import { useCurrentUser } from '../api/use-current-user';
import { routes } from '@/shared/config';
import {
  Avatar,
  Button,
  Dropdown,
  DropdownContent,
  DropdownItem,
  DropdownTrigger,
  Skeleton,
} from '@/shared/ui';
import { ThemeSwitcher } from './theme-switcher';

function isWorkspaceSlug(value: unknown): value is string {
  return typeof value === 'string' && WorkspaceSlug.safeParse(value).success;
}

function CompactWorkspaceSwitcher({ onClick }: { onClick: () => void }) {
  const params = useParams();
  const slug = isWorkspaceSlug(params.workspaceSlug) ? params.workspaceSlug : undefined;

  return (
    <Button
      variant="secondary"
      size="s"
      onClick={onClick}
      className="max-w-[140px] truncate desktop-s:hidden"
      aria-label={slug ? `Текущее пространство ${slug}` : 'Выберите пространство'}
    >
      <span className="truncate">{slug ?? 'Пространство'}</span>
    </Button>
  );
}

interface AppHeaderProps {
  onOpenMobileSidebar?: () => void;
}

export function AppHeader({ onOpenMobileSidebar }: AppHeaderProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const user = useCurrentUser();

  const isPending = user.isPending;

  return (
    <header className="flex h-16 items-center justify-between border-b border-line bg-surface px-4">
      <div className="flex items-center gap-2">
        {onOpenMobileSidebar ? (
          <Button
            variant="secondary"
            size="icon"
            className="desktop-s:hidden"
            aria-label="Открыть меню"
            onClick={onOpenMobileSidebar}
          >
            <Menu className="size-5" />
          </Button>
        ) : null}
        <Link
          href={routes.workspaces()}
          className="flex items-center gap-2 rounded-button px-2 py-1 text-fg-primary outline-none focus-visible:ring-3 focus-visible:ring-brand-primary/40"
        >
          <span className="flex size-8 items-center justify-center rounded-button bg-brand-primary text-caption font-bold text-on-brand">
            pl
          </span>
          <span className="hidden text-body-s font-bold desktop-s:inline">
            {PRODUCT_DISPLAY_NAME}
          </span>
        </Link>
      </div>

      <div className="flex items-center gap-2">
        {onOpenMobileSidebar ? <CompactWorkspaceSwitcher onClick={onOpenMobileSidebar} /> : null}

        <ThemeSwitcher />

        <Dropdown>
          <DropdownTrigger>
            <Button
              variant="secondary"
              size="m"
              className="gap-1.5 pl-1.5 pr-0"
              aria-label={
                isPending
                  ? 'Загрузка меню пользователя'
                  : `Меню пользователя ${user.data?.name ?? ''}`
              }
            >
              {isPending ? (
                <Skeleton className="size-8 rounded-full" />
              ) : (
                <Avatar name={user.data?.name ?? ''} size="m" />
              )}
              {isPending ? (
                <Skeleton className="hidden h-4 w-20 desktop-s:block" />
              ) : (
                <span className="hidden desktop-s:inline">{user.data?.name}</span>
              )}
            </Button>
          </DropdownTrigger>
          <DropdownContent align="end" className="w-56">
            <DropdownItem
              onClick={() => {
                router.push(routes.profileSettings());
              }}
            >
              <Settings className="size-4" />
              Настройки профиля
            </DropdownItem>
            <DropdownItem
              danger
              onClick={() => {
                queryClient.clear();
                router.push(routes.login());
              }}
            >
              <LogOut className="size-4" />
              Выйти
            </DropdownItem>
          </DropdownContent>
        </Dropdown>
      </div>
    </header>
  );
}
