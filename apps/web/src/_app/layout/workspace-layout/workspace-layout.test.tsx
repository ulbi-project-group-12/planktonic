import { describe, expect, it, vi } from 'vitest';
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
  it('renders children for a valid slug', async () => {
    await expect(render('my-team')).resolves.toBe(children);
    expect(notFoundMock).not.toHaveBeenCalled();
  });

  it.each(['create', 'My-Team', 'team_1', '-team'])('calls notFound for %s', async (slug) => {
    await expect(render(slug)).rejects.toThrow('NEXT_NOT_FOUND');
  });
});

describe('WorkspaceLayout format vs membership', () => {
  // Format is only a shape check: a well-formed slug passes here, and the membership check
  // (UL-144) is what turns an unknown workspace into a 404.
  it('lets a well-formed unknown slug through to the membership check', async () => {
    await expect(render('forgot-password222')).resolves.toBe(children);
  });
});
