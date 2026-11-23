'use client';

import { usePathname } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { AppHeader } from '@/widgets/app-header';
import { AppSidebar, MobileNavDrawer } from '@/widgets/app-sidebar';

type LayoutVariant = 'full' | 'headonly';

function getLayoutVariant(pathname: string): LayoutVariant {
  if (pathname === '/workspaces') return 'headonly';
  if (pathname === '/workspaces/create') return 'headonly';
  if (/^\/workspaces\/[^/]+\/settings$/.test(pathname)) return 'headonly';
  if (/^\/workspaces\/[^/]+\/projects\/create$/.test(pathname)) return 'headonly';
  return 'full';
}

export function AppLayout({ children }: Readonly<{ children: ReactNode }>) {
  const pathname = usePathname();
  const variant = getLayoutVariant(pathname);
  const [sidebarWidth, setSidebarWidth] = useState(264);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  const showSidebar = variant === 'full';

  return (
    <div className="flex h-svh flex-col overflow-hidden">
      <AppHeader
        onOpenMobileSidebar={
          showSidebar
            ? () => {
                setIsMobileNavOpen(true);
              }
            : undefined
        }
      />
      <div className="flex flex-1 min-h-0 overflow-auto">
        {showSidebar ? (
          <>
            <AppSidebar
              width={sidebarWidth}
              onWidthChange={setSidebarWidth}
              className="sticky top-0 hidden h-[calc(100svh-4rem)] self-start desktop-s:flex"
            />
            <MobileNavDrawer open={isMobileNavOpen} onOpenChange={setIsMobileNavOpen} />
          </>
        ) : null}
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
