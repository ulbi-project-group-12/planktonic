import { Progress } from '@/shared/ui/progress';
import { Typography } from '@/shared/ui/typography';
import { CreateWorkspaceForm } from './create-workspace-form';

/**
 * Create-workspace screen, step 1 of 2 (mockup screen.ws.create1): name and address.
 * Step 2 (inviting members) is UL-220's job; after submit the form goes to the workspace page.
 */
export function WorkspaceCreatePage() {
  return (
    <main className="mx-auto flex min-h-svh w-full max-w-md flex-col justify-center gap-8 p-8">
      <div className="flex flex-col gap-3">
        <Typography size="caption" color="text-secondary">
          Шаг 1 из 2 — название и адрес
        </Typography>
        <Progress value={50} aria-label="Шаг 1 из 2" />
        <Typography as="h1" size="h3">
          Создайте пространство
        </Typography>
      </div>
      <CreateWorkspaceForm />
    </main>
  );
}
