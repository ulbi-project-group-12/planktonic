import { InviteAcceptance } from './invite-acceptance';

interface InvitePageProps {
  params: Promise<{ token: string }>;
}

/** /invite/[token] — the «Присоединиться» screen (UL-220). */
export async function InvitePage({ params }: InvitePageProps) {
  const { token } = await params;
  return (
    <main className="mx-auto flex min-h-svh max-w-lg flex-col justify-center gap-6 p-8">
      <InviteAcceptance token={token} />
    </main>
  );
}
