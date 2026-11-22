'use client';

import { PRODUCT_DISPLAY_NAME } from '@app/config/product';
// global-error replaces the root layout, so it brings its own global styles.
import '../styles/globals.css';

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export function GlobalError({ error, reset }: GlobalErrorProps) {
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
