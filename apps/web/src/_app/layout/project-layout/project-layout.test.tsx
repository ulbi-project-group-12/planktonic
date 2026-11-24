import { describe, expect, it, vi } from 'vitest';
import { ProjectLayout } from './project-layout';

const notFoundMock = vi.hoisted(() =>
  vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
);

vi.mock('next/navigation', () => ({ notFound: notFoundMock }));

async function render(projectKey: string) {
  return ProjectLayout({
    params: Promise.resolve({ workspaceSlug: 'my-team', projectKey }),
    children: 'content',
  });
}

describe('ProjectLayout', () => {
  it('renders children for a valid key', async () => {
    await expect(render('WEB')).resolves.toBe('content');
  });

  it.each(['web', 'create', 'W', '1WEB'])('calls notFound for %s', async (key) => {
    await expect(render(key)).rejects.toThrow('NEXT_NOT_FOUND');
  });
});
