import { UpdateMeRequestSchema } from '@app/contracts';
import { describe, expect, it, vi } from 'vitest';
import type { UsersRepository } from './users.repository.js';
import { UsersService } from './users.service.js';

const userId = '019a8f00-0000-7000-8000-000000000004';

function setup() {
  const updateProfile = vi.fn<UsersRepository['updateProfile']>();
  const service = new UsersService({ updateProfile } as unknown as UsersRepository);
  return { service, updateProfile };
}

describe('UsersService.updateMe', () => {
  it('passes the patch to the repository and returns the stored profile', async () => {
    const { service, updateProfile } = setup();
    const stored = { id: userId, name: 'Ada', email: 'ada@example.com', tz: 'Asia/Tokyo' };
    updateProfile.mockResolvedValue(stored);

    const patch = UpdateMeRequestSchema.parse({ tz: 'Asia/Tokyo' });
    await expect(service.updateMe(userId, patch)).resolves.toEqual(stored);
    expect(updateProfile).toHaveBeenCalledExactlyOnceWith(userId, patch);
  });

  it('rejects a stored zone the contract does not know', async () => {
    const { service, updateProfile } = setup();
    updateProfile.mockResolvedValue({
      id: userId,
      name: 'Ada',
      email: 'ada@example.com',
      tz: 'Mars/Olympus',
    });

    await expect(service.updateMe(userId, { name: 'Ada' })).rejects.toThrow();
  });
});
