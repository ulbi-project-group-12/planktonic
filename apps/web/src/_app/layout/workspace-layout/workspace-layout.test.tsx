import { describe, expect, it, vi } from 'vitest';
import { WorkspaceAccess } from './workspace-access';
import { WorkspaceLayout } from './workspace-layout';

const notFoundMock = vi.hoisted(() =>
  vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
);

vi.mock('next/navigation', () => ({ notFound: notFoundMock }));

const children = 'content';

async function render(workspaceSlug: string) {
  return WorkspaceLayout({ params: Promise.resolve({ workspaceSlug }), children });
}

describe('WorkspaceLayout', () => {
  it('passes a valid slug and children to the access check', async () => {
    await expect(render('my-team')).resolves.toEqual(
      <WorkspaceAccess slug="my-team">{children}</WorkspaceAccess>,
    );
    expect(notFoundMock).not.toHaveBeenCalled();
  });

  it.each(['create', 'My-Team', 'team_1', '-team'])('calls notFound for %s', async (slug) => {
    await expect(render(slug)).rejects.toThrow('NEXT_NOT_FOUND');
  });
});
