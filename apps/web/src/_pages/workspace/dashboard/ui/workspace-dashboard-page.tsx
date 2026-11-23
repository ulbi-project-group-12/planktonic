import { PRODUCT_DISPLAY_NAME } from '@app/config/product';
import { Typography } from '@/shared/ui/typography';

interface WorkspaceDashboardPageProps {
  params: Promise<{ workspaceSlug: string }>;
}

export async function WorkspaceDashboardPage({ params }: WorkspaceDashboardPageProps) {
  const { workspaceSlug } = await params;

  return (
    <main className="mx-auto flex min-h-[calc(100svh-4rem)] max-w-2xl flex-col justify-center gap-4 p-8">
      <Typography as="h1" size="h3">
        Скоро здесь будет страница пространства {PRODUCT_DISPLAY_NAME}
      </Typography>
      <Typography as="p" color="text-secondary">
        workspaceSlug = {workspaceSlug}
      </Typography>
    </main>
  );
}
