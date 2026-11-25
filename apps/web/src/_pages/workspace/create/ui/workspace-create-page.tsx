import { CreateWorkspaceForm } from './create-workspace-form';

/**
 * Create-workspace wizard (mockup screen.ws.create1 → screen.ws.create2):
 * step 1 — name and address, step 2 — invite members by link (UL-218, UL-220).
 */
export function WorkspaceCreatePage() {
  return (
    <main className="mx-auto flex min-h-[calc(100svh-4rem)] w-full max-w-md flex-col justify-center gap-8 p-8">
      <CreateWorkspaceForm />
    </main>
  );
}
