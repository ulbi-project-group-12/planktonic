import { PRODUCT_DISPLAY_NAME } from '@app/config/product';
import { Typography } from '@/shared/ui/typography';

export function WorkspaceSettingsPage() {
  return (
    <main className="mx-auto flex min-h-svh max-w-2xl flex-col justify-center gap-4 p-8">
      <Typography as="h1" size="h3">
        Скоро здесь будут настройки пространства {PRODUCT_DISPLAY_NAME}
      </Typography>
    </main>
  );
}
