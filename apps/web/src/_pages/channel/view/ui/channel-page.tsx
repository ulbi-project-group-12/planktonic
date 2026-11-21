import { ChannelId } from '@app/contracts';
import { PRODUCT_DISPLAY_NAME } from '@app/config/product';
import { notFound } from 'next/navigation';
import { Typography } from '@/shared/ui/typography';

interface ChannelPageProps {
  params: Promise<{ workspaceSlug: string; projectKey: string; channelId: string }>;
}

export async function ChannelPage({ params }: ChannelPageProps) {
  const { workspaceSlug, projectKey, channelId } = await params;

  // A channel is addressed by uuid only; anything else is not a channel address.
  if (!ChannelId.safeParse(channelId).success) {
    notFound();
  }

  return (
    <main className="mx-auto flex min-h-svh max-w-2xl flex-col justify-center gap-4 p-8">
      <Typography as="h1" size="h3">
        Скоро здесь будет страница канала {PRODUCT_DISPLAY_NAME}
      </Typography>
      <Typography as="p" color="text-secondary">
        workspaceSlug = {workspaceSlug}, projectKey = {projectKey}, channelId = {channelId}
      </Typography>
    </main>
  );
}
