import Link from 'next/link';
import type { ReactNode } from 'react';
import { PRODUCT_DISPLAY_NAME } from '@app/config/product';
import { routes } from '@/shared/config';
import { ThemeSwitcher } from '@/widgets/app-header';

export function AuthLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className="flex h-svh flex-col overflow-hidden">
      <header className="flex h-16 items-center justify-between border-b border-line bg-surface px-4">
        <Link
          href={routes.home()}
          className="flex items-center gap-2 rounded-button px-2 py-1 text-fg-primary outline-none focus-visible:ring-3 focus-visible:ring-brand-primary/40"
        >
          <span className="flex size-8 items-center justify-center rounded-button bg-brand-primary text-caption font-bold text-on-brand">
            pl
          </span>
          <span className="text-body-s font-bold">{PRODUCT_DISPLAY_NAME}</span>
        </Link>
        <ThemeSwitcher />
      </header>
      <div className="flex flex-1 min-h-0 overflow-auto">{children}</div>
    </div>
  );
}
