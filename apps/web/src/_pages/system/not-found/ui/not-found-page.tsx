import { PRODUCT_DISPLAY_NAME } from '@app/config/product';
import { Link } from '@/shared/ui/link';
import { Typography } from '@/shared/ui/typography';
import { routes } from '@/shared/config';

export function NotFoundPage() {
  return (
    <main className="mx-auto flex min-h-svh max-w-2xl flex-col items-start justify-center gap-4 p-8">
      <Typography as="h1" size="h2">
        404
      </Typography>
      <Typography as="p" size="body-l" color="text-secondary">
        Страница не найдена в {PRODUCT_DISPLAY_NAME}
      </Typography>
      <Link variant="inline" href={routes.home()}>
        На главную
      </Link>
    </main>
  );
}
