import { CreateWorkspaceRequestSchema } from '@app/contracts';
import { describe, expect, it, vi } from 'vitest';
import { WorkspaceController } from './workspace.controller.js';
import type { WorkspaceService } from './workspace.service.js';

describe('WorkspaceController.create', () => {
  it('passes the request and authenticated user ID to the service and returns its result', async () => {
    const input = CreateWorkspaceRequestSchema.parse({ name: 'My team', slug: 'my-team' });
    const user = { id: 'user-id', name: 'Ada', email: 'ada@example.com' };
    const workspace = { id: '019a8f00-0000-7000-8000-000000000004', ...input };
    const create = vi.fn<WorkspaceService['create']>().mockResolvedValue(workspace);
    const controller = new WorkspaceController({ create } as unknown as WorkspaceService);

    await expect(controller.create(input, user)).resolves.toEqual(workspace);
    expect(create).toHaveBeenCalledExactlyOnceWith(input, user.id);
  });
});

describe('WorkspaceController.list', () => {
  it('passes the authenticated user ID to the service and returns its list', async () => {
    const user = { id: 'user-id', name: 'Ada', email: 'ada@example.com' };
    const listForUser = vi.fn<WorkspaceService['listForUser']>().mockResolvedValue([]);
    const controller = new WorkspaceController({ listForUser } as unknown as WorkspaceService);

    await expect(controller.list(user)).resolves.toEqual([]);
    expect(listForUser).toHaveBeenCalledExactlyOnceWith(user.id);
  });
});
