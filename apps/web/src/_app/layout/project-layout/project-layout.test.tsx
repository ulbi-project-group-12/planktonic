import { describe, expect, it } from 'vitest';
import { ProjectLayout } from './project-layout';

async function render(projectKey: string) {
  return ProjectLayout({
    params: Promise.resolve({ workspaceSlug: 'my-team', projectKey }),
    children: 'content',
  });
}

describe('ProjectLayout', () => {
  it.each(['WEB', 'web', 'create', 'W', '1WEB'])(
    'renders children for project key %s',
    async (key) => {
      await expect(render(key)).resolves.toBe('content');
    },
  );
});
