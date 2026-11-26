import { UpdateMeRequestSchema } from '@app/contracts';
import { describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../../core/prisma/prisma.service.js';
import { UsersRepository } from './users.repository.js';

const userId = '019a8f00-0000-7000-8000-000000000004';

function setup() {
  const update = vi.fn();
  const repository = new UsersRepository({
    user: { update },
  } as unknown as PrismaService);
  return { repository, update };
}

describe('UsersRepository.updateProfile', () => {
  it('updates only the sent fields and returns the public profile', async () => {
    const { repository, update } = setup();
    const stored = { id: userId, name: 'Ada', email: 'ada@example.com', tz: 'UTC' };
    update.mockResolvedValue(stored);

    const patch = UpdateMeRequestSchema.parse({ tz: 'UTC' });
    await expect(repository.updateProfile(userId, patch)).resolves.toEqual(stored);
    expect(update).toHaveBeenCalledExactlyOnceWith({
      where: { id: userId },
      data: patch,
      select: { id: true, name: true, email: true, tz: true },
    });
  });
});
