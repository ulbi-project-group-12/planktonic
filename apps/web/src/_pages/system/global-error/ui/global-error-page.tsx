'use client';

import { PRODUCT_DISPLAY_NAME } from '@app/config/product';

interface GlobalErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export function GlobalErrorPage({ error, reset }: GlobalErrorPageProps) {
  return (
    <html lang="ru">
      <body>
        <main className="mx-auto flex min-h-svh max-w-2xl flex-col justify-center gap-4 p-8">
          <h1 className="text-body-xl font-bold">Что-то пошло не так</h1>
          <p className="text-body-l text-fg-secondary">
            {PRODUCT_DISPLAY_NAME} не смог загрузить страницу.
            {error.digest ? ` Код ошибки: ${error.digest}` : null}
          </p>
          <button type="button" className="self-start underline" onClick={reset}>
            Попробовать снова
          </button>
        </main>
      </body>
    </html>
  );
}
