import { PRODUCT_DISPLAY_NAME } from '@app/config/product';
import { routes } from '@/shared/config';
import { Link as UiLink, Typography } from '@/shared/ui';

/** The landing footer: the wordmark, the entry links and the product line. */
export function LandingFooter() {
  return (
    <footer>
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 px-4 py-8 mobile-xl:flex-row mobile-xl:items-center desktop-s:px-6">
        <div className="flex items-center gap-2">
          <span
            aria-hidden
            className="flex size-6 items-center justify-center rounded-md bg-brand-primary text-micro font-bold text-on-brand"
          >
            {PRODUCT_DISPLAY_NAME.slice(0, 2)}
          </span>
          <Typography size="body-s" color="text-secondary">
            {PRODUCT_DISPLAY_NAME} — рабочий мессенджер для команд
          </Typography>
        </div>
        <nav aria-label="Вход и регистрация" className="flex items-center gap-1">
          <UiLink href={routes.login()} variant="nav">
            Войти
          </UiLink>
          <UiLink href={routes.register()} variant="nav">
            Регистрация
          </UiLink>
        </nav>
      </div>
    </footer>
  );
}
