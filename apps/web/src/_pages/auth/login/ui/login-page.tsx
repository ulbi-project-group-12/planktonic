import { PRODUCT_DISPLAY_NAME } from '@app/config/product';
import { routes } from '@/shared/config';
import { Button } from '@/shared/ui/button';
import { Link } from '@/shared/ui/link';
import { Typography } from '@/shared/ui/typography';
import { LoginForm } from './login-form';

export function LoginPage() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-app p-4">
      <div className="flex w-full max-w-[400px] flex-col gap-5 rounded-2xl border border-line bg-surface p-8">
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
            Войти
          </Typography>
          <Typography as="p" size="body-s" color="text-secondary">
            Мессенджер, задачи и GitHub — в одном месте
          </Typography>
        </div>
        <LoginForm />
        <div aria-hidden className="flex w-full items-center gap-3">
          <div className="h-px flex-1 bg-line" />
          <span className="text-body-xs leading-6 text-fg-muted">или</span>
          <div className="h-px flex-1 bg-line" />
        </div>
        <Button
          type="button"
          variant="secondary"
          size="l"
          fullWidth
          disabled
          title="Вход через GitHub пока недоступен"
          className="text-[15px] leading-6"
        >
          Войти через GitHub
        </Button>
        <Typography as="p" size="body-s" color="text-secondary" className="text-center leading-6">
          Нет аккаунта?{' '}
          <Link href={routes.register()} className="font-bold leading-6">
            Зарегистрироваться
          </Link>
        </Typography>
      </div>
    </main>
  );
}
