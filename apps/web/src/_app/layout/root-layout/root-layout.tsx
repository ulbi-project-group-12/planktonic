import { PRODUCT_DISPLAY_NAME } from '@app/config/product';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Toaster } from '@/shared/ui/toast';
import { TooltipProvider } from '@/shared/ui/tooltip';
import '../../styles/globals.css';
import { ApiProviders } from '../api-providers';

export const metadata: Metadata = {
  title: PRODUCT_DISPLAY_NAME,
  description: 'Work messenger for development teams.',
};

export function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
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
