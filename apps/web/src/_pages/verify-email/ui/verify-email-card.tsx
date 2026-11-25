import { PRODUCT_DISPLAY_NAME } from '@app/config/product';
import type { ReactNode } from 'react';
import { Typography } from '@/shared/ui';

/**
 * The card every /verify-email screen shares — the same composition the login and register
 * screens use (logo, centred h1 + subtitle, content, footer line), minus their form.
 */
export function VerifyEmailCard({
  title,
  subtitle,
  children,
  footer,
}: Readonly<{
  title: string;
  subtitle?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
}>) {
  return (
    <main className="flex min-h-svh items-center justify-center bg-app p-4">
      <div className="flex w-full max-w-[400px] flex-col gap-5 rounded-xl border border-line bg-surface p-8">
        <div className="flex items-center justify-center gap-3">
          <span
            aria-hidden
            className="flex size-10 shrink-0 items-center justify-center rounded-button bg-brand-primary text-body-l leading-6 font-bold text-on-brand"
          >
            {PRODUCT_DISPLAY_NAME.slice(0, 2)}
          </span>
          <Typography as="span" size="body-l" weight="700" className="leading-6 tracking-[-0.18px]">
            {PRODUCT_DISPLAY_NAME}
          </Typography>
        </div>
        <div className="flex flex-col items-center gap-1 text-center">
          <Typography as="h1" size="h4" weight="700" className="tracking-[-0.12px]">
            {title}
          </Typography>
          {subtitle ? (
            <Typography as="p" size="body-s" color="text-secondary">
              {subtitle}
            </Typography>
          ) : null}
        </div>
        {children}
        {footer ? (
          <Typography as="p" size="body-s" color="text-secondary" className="text-center leading-6">
            {footer}
          </Typography>
        ) : null}
      </div>
    </main>
  );
}
