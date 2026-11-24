'use client';

import { usePathname } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { routes } from '@/shared/config';
import { AppHeader } from '@/widgets/app-header';
import { AppSidebar, MobileNavDrawer } from '@/widgets/app-sidebar';
import { SessionGate } from './session-gate';

type LayoutVariant = 'full' | 'headonly';

function getLayoutVariant(pathname: string): LayoutVariant {
  if (pathname === routes.workspaces()) return 'headonly';
  if (pathname === routes.workspaceCreate()) return 'headonly';
  if (/^\/workspaces\/[^/]+\/settings$/.test(pathname)) return 'headonly';
  if (/^\/workspaces\/[^/]+\/projects\/create$/.test(pathname)) return 'headonly';
  return 'full';
}

/** The header, the sidebar and the page. Rendered only for a signed-in visitor. */
export function AppShell({ children }: Readonly<{ children: ReactNode }>) {
  const pathname = usePathname();
  const variant = getLayoutVariant(pathname);
  const [sidebarWidth, setSidebarWidth] = useState(264);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  // Any navigation closes the drawer. Without this the flag survives a visit to a page without
  // the sidebar (the drawer is not mounted there) and the drawer reopens on the next page with one.
  const [lastPathname, setLastPathname] = useState(pathname);
  if (lastPathname !== pathname) {
    setLastPathname(pathname);
    setIsMobileNavOpen(false);
  }

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
        {/* Every page renders its own <main>, so the wrapper must not be a second one. */}
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}

/** Everything in the `(app)` group is behind the login: the shell mounts once the gate lets in. */
export function AppLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <SessionGate>
      <AppShell>{children}</AppShell>
    </SessionGate>
  );
}
