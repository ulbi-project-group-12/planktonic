import { PRODUCT_DISPLAY_NAME } from '@app/config/product';

export function HomePage() {
  return (
    <main className="mx-auto flex min-h-svh max-w-2xl flex-col justify-center gap-4 p-8">
      <h1 className="text-4xl font-semibold tracking-tight">{PRODUCT_DISPLAY_NAME}</h1>
      <p className="text-base text-neutral-600">
        The web skeleton is running. The code lives in FSD layers under <code>src/</code>.
      </p>
    </main>
  );
}
