import { PRODUCT_DISPLAY_NAME } from '@app/config/product';
import { Typography } from '@/shared/ui/typography';

interface ChannelCreatePageProps {
  params: Promise<{ workspaceSlug: string; projectKey: string }>;
}

export async function ChannelCreatePage({ params }: ChannelCreatePageProps) {
  const { workspaceSlug, projectKey } = await params;

  return (
    <main className="mx-auto flex min-h-[calc(100svh-4rem)] max-w-2xl flex-col justify-center gap-4 p-8">
      <Typography as="h1" size="h3">
        Скоро здесь будет создание канала {PRODUCT_DISPLAY_NAME}
      </Typography>
      <Typography as="p" color="text-secondary">
        workspaceSlug = {workspaceSlug}, projectKey = {projectKey}
      </Typography>
    </main>
  );
}
