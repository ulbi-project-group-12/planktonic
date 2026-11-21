'use client';

import { PRODUCT_DISPLAY_NAME } from '@app/config/product';
import { Button } from '@/shared/ui/button';
import { Typography } from '@/shared/ui/typography';

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export function ErrorPage({ error, reset }: ErrorPageProps) {
  return (
    <main className="mx-auto flex min-h-svh max-w-2xl flex-col items-start justify-center gap-4 p-8">
      <Typography as="h1" size="h2">
        Что-то пошло не так
      </Typography>
      <Typography as="p" size="body-l" color="text-secondary">
        {PRODUCT_DISPLAY_NAME} не смог загрузить эту страницу.
        {error.digest ? ` Код ошибки: ${error.digest}` : null}
      </Typography>
      <Button
        type="button"
        onClick={() => {
          reset();
        }}
      >
        Попробовать снова
      </Button>
    </main>
  );
}
