import { CreateWorkspaceRequestSchema } from '@app/contracts';
import { describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../../core/prisma/prisma.service.js';
import { Prisma, WsRole } from '../../generated/prisma/client.js';
import { WorkspaceRepository } from './workspace.repository.js';

const input = CreateWorkspaceRequestSchema.parse({ name: 'My team', slug: 'my-team' });
const userId = 'user-id';
const workspace = { id: '019a8f00-0000-7000-8000-000000000004', ...input };
const uniqueViolation = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
  code: 'P2002',
  clientVersion: 'test',
});

function setup() {
  const create = vi.fn<() => Promise<typeof workspace>>();
  const findUnique = vi.fn<() => Promise<{ id: string } | null>>();
  const findMany = vi.fn<() => Promise<(typeof workspace)[]>>();
  const prisma = { workspace: { create, findMany, findUnique } } as unknown as PrismaService;
  return { repository: new WorkspaceRepository(prisma), create, findMany, findUnique };
}

describe('WorkspaceRepository.findAllForUser', () => {
  it('queries spaces by user membership and sorts them by slug', async () => {
    const { repository, findMany } = setup();
    findMany.mockResolvedValue([workspace]);

    await expect(repository.findAllForUser(userId)).resolves.toEqual([workspace]);
    expect(findMany).toHaveBeenCalledExactlyOnceWith({
      where: { members: { some: { userId } } },
      select: { id: true, name: true, slug: true },
      orderBy: { slug: 'asc' },
    });
  });

  it('returns an empty list when there are no matching workspaces', async () => {
    const { repository, findMany } = setup();
    findMany.mockResolvedValue([]);

    await expect(repository.findAllForUser(userId)).resolves.toEqual([]);
  });
});

describe('WorkspaceRepository.createWithOwner', () => {
  it('creates the workspace and its owner in one nested Prisma write', async () => {
    const { repository, create, findUnique } = setup();
    create.mockResolvedValue(workspace);

    await expect(repository.createWithOwner(input, userId)).resolves.toEqual(workspace);
    expect(create).toHaveBeenCalledExactlyOnceWith({
      data: { ...input, members: { create: { userId, role: WsRole.OWNER } } },
      select: { id: true, name: true, slug: true },
    });
    expect(findUnique).not.toHaveBeenCalled();
  });

  it('returns null after a uniqueness violation when the slug exists', async () => {
    const { repository, create, findUnique } = setup();
    create.mockRejectedValue(uniqueViolation);
    findUnique.mockResolvedValue({ id: workspace.id });

    await expect(repository.createWithOwner(input, userId)).resolves.toBeNull();
    expect(findUnique).toHaveBeenCalledExactlyOnceWith({
      where: { slug: input.slug },
      select: { id: true },
    });
  });

  it('rethrows a uniqueness violation when no workspace has the requested slug', async () => {
    const { repository, create, findUnique } = setup();
    create.mockRejectedValue(uniqueViolation);
    findUnique.mockResolvedValue(null);

    await expect(repository.createWithOwner(input, userId)).rejects.toBe(uniqueViolation);
  });

  it('propagates other errors without looking up the slug', async () => {
    const { repository, create, findUnique } = setup();
    const failure = new Error('Database unavailable');
    create.mockRejectedValue(failure);

    await expect(repository.createWithOwner(input, userId)).rejects.toBe(failure);
    expect(findUnique).not.toHaveBeenCalled();
  });
});
