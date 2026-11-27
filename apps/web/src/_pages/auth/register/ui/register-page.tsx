import { PRODUCT_DISPLAY_NAME } from '@app/config/product';
import { routes } from '@/shared/config';
import { Link } from '@/shared/ui/link';
import { Typography } from '@/shared/ui/typography';
import { RegisterForm } from './register-form';

/**
 * Registration screen per the Figma mockup (card.register): a 400 px card, 32 px padding,
 * 20 px between every block — logo, heading, the form's fields and the footer link.
 */
export function RegisterPage({ next }: { next?: string } = {}) {
  return (
    <main className="flex min-h-[calc(100svh-4rem)] items-center justify-center bg-app p-4">
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
            Создать аккаунт
          </Typography>
          <Typography as="p" size="body-s" color="text-secondary">
            Мессенджер, задачи и GitHub — в одном месте
          </Typography>
        </div>
        <RegisterForm next={next} />
        <Typography as="p" size="body-s" color="text-secondary" className="text-center leading-6">
          Уже есть аккаунт?{' '}
          <Link href={routes.login(next)} className="font-bold">
            Войти
          </Link>
        </Typography>
      </div>
    </main>
  );
}
