import { PRODUCT_DISPLAY_NAME } from '@app/config/product';
import { Button } from '@/shared/ui';

export function HomePage() {
  return (
    <main className="mx-auto flex min-h-svh max-w-2xl flex-col justify-center gap-4 p-8">
      <h1 className="text-4xl font-semibold tracking-tight">{PRODUCT_DISPLAY_NAME}</h1>
      <p className="text-base text-muted-foreground">
        The web skeleton is running. The code lives in FSD layers under <code>src/</code>.
      </p>
      <div>
        <Button type="button">About this skeleton</Button>
      </div>
    </main>
  );
}
