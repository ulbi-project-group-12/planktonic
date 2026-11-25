import { PRODUCT_DISPLAY_NAME } from '@app/config/product';
import { Typography } from '@/shared/ui/typography';
import { InviteMemberButton } from '@/widgets/invite-member';

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
      {/* UL-220 test stand: fixed OWNER until UL-151 exposes the real role — so it is
          shown only in the mocked dev environment, where the demo actually runs. On the
          real api a hardcoded OWNER would lie about the member's permissions. */}
      {process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_API_MOCKING === 'true' ? (
        <div className="self-center">
          <InviteMemberButton workspaceSlug={workspaceSlug} inviterRole="OWNER" />
        </div>
      ) : null}
    </main>
  );
}
