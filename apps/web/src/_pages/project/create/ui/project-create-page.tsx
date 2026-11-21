import { PRODUCT_DISPLAY_NAME } from '@app/config/product';
import { Typography } from '@/shared/ui/typography';

interface ProjectCreatePageProps {
  params: Promise<{ workspaceSlug: string }>;
}

export async function ProjectCreatePage({ params }: ProjectCreatePageProps) {
  const { workspaceSlug } = await params;

  return (
    <main className="mx-auto flex min-h-svh max-w-2xl flex-col justify-center gap-4 p-8">
      <Typography as="h1" size="h3">
        Скоро здесь будет создание проекта {PRODUCT_DISPLAY_NAME}
      </Typography>
      <Typography as="p" color="text-secondary">
        workspaceSlug = {workspaceSlug}
      </Typography>
    </main>
  );
}
