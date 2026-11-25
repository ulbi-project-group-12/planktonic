/* eslint-disable @eslint-react/dom-no-dangerously-set-innerhtml --
   The root layout needs an inline, self-contained theme init script in <head>
   so the theme is applied before the first paint. */

import { PRODUCT_DISPLAY_NAME } from '@app/config/product';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { THEME_STORAGE_KEY } from '@/features/theme-switch';
import { Toaster } from '@/shared/ui/toast';
import { TooltipProvider } from '@/shared/ui/tooltip';
import '../../styles/globals.css';
import { ApiProviders } from '../api-providers';
import { getThemeInitScript } from './theme-init-script';

export const metadata: Metadata = {
  title: PRODUCT_DISPLAY_NAME,
  description: 'Work messenger for development teams.',
};

export function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* The inline script must execute before the first paint to avoid a theme flash.
            It is generated from a static, self-contained function and contains no user input. */}
        <script
          dangerouslySetInnerHTML={{
            __html: getThemeInitScript(THEME_STORAGE_KEY),
          }}
        />
      </head>
      <body>
        {/* Radix Tooltip throws outside a provider: one for the whole app. */}
        <ApiProviders>
          <TooltipProvider>{children}</TooltipProvider>
        </ApiProviders>
        <Toaster />
      </body>
    </html>
  );
}
