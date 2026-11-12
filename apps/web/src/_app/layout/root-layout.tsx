import { PRODUCT_DISPLAY_NAME } from '@app/config/product';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: PRODUCT_DISPLAY_NAME,
  description: 'Work messenger for development teams.',
};

export function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
