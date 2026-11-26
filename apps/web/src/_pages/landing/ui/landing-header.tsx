import Link from 'next/link';
import { PRODUCT_DISPLAY_NAME } from '@app/config/product';
import { ThemeSwitcher } from '@/features/theme-switch';
import { routes } from '@/shared/config';
import { Link as UiLink } from '@/shared/ui';
import { LandingCta, LandingLoginButton } from './landing-cta';

/**
 * The landing header: the logo, anchors to the sections, the theme switch and the
 * entry actions. Sticky, so the «Начать» button is always at hand while scrolling.
 */
export function LandingHeader() {
  return (
    <header className="sticky top-0 z-10 border-b border-line bg-surface">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 desktop-s:px-6">
        <Link
          href={routes.home()}
          className="flex items-center gap-2 rounded-button px-1 py-1 text-fg-primary outline-none focus-visible:ring-3 focus-visible:ring-brand-primary/40"
        >
          <span
            aria-hidden
            className="flex size-8 items-center justify-center rounded-button bg-brand-primary text-caption font-bold text-on-brand"
          >
            {PRODUCT_DISPLAY_NAME.slice(0, 2)}
          </span>
          <span className="text-body font-bold">{PRODUCT_DISPLAY_NAME}</span>
        </Link>
        <nav aria-label="Разделы лендинга" className="hidden items-center gap-1 desktop-s:flex">
          <UiLink href="#how" variant="nav">
            Как это работает
          </UiLink>
          <UiLink href="#features" variant="nav">
            Возможности
          </UiLink>
        </nav>
        <div className="flex items-center gap-2">
          <ThemeSwitcher />
          <LandingLoginButton size="m" className="hidden mobile-xl:inline-flex" />
          <LandingCta size="m" />
        </div>
      </div>
    </header>
  );
}
