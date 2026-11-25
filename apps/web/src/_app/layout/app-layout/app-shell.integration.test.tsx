import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useParams } from 'next/navigation';
import { describe, expect, it, vi } from 'vitest';
import { renderWithApi } from '@/shared/lib/testing';
import { AppShell } from './app-layout';

async function postWorkspace(name: string, slug: string) {
  const response = await fetch('http://api.example.invalid/api/workspaces', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name, slug }),
  });
  expect(response.status).toBe(201);
}

const push = vi.fn();
let currentSlug = 'ws-a';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  usePathname: () => `/workspaces/${currentSlug}`,
  useParams: () => ({ workspaceSlug: currentSlug }),
}));

function WorkspaceContent() {
  const params = useParams();
  return <div data-testid="workspace-content">{params.workspaceSlug}</div>;
}

describe('AppShell workspace switch', () => {
  it('switches workspaces without reloading and clears the old workspace data', async () => {
    const user = userEvent.setup();
    await postWorkspace('Workspace A', 'ws-a');
    await postWorkspace('Workspace B', 'ws-b');

    const { rerender } = renderWithApi(
      <AppShell>
        <WorkspaceContent />
      </AppShell>,
    );

    expect(await screen.findByTestId('workspace-content')).toHaveTextContent('ws-a');

    await user.click(await screen.findByRole('button', { name: /Workspace A/ }));
    await user.click(screen.getByRole('menuitem', { name: /Workspace B/ }));

    expect(push).toHaveBeenCalledWith('/workspaces/ws-b');

    currentSlug = 'ws-b';
    rerender(
      <AppShell>
        <WorkspaceContent />
      </AppShell>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('workspace-content')).toHaveTextContent('ws-b');
    });
    expect(screen.queryByTestId('workspace-content')).not.toHaveTextContent('ws-a');
  });
});
