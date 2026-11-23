import { describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../../../core/prisma/prisma.service.js';
import { LoginRepository } from './login.repository.js';

const email = "Ada.O'Connor@example.com";

function setup() {
  const $queryRaw = vi.fn();
  const repository = new LoginRepository({ $queryRaw } as unknown as PrismaService);
  return { repository, $queryRaw };
}

describe('LoginRepository.findActiveByEmail', () => {
  it('binds the email and selects credentials for an active account', async () => {
    const { repository, $queryRaw } = setup();
    const user = { id: 'user-id', passwordHash: 'test-hash', tokenVersion: 2 };
    $queryRaw.mockResolvedValue([user]);

    await expect(repository.findActiveByEmail(email)).resolves.toEqual(user);

    const sql = $queryRaw.mock.calls[0]?.[0] as TemplateStringsArray;
    expect($queryRaw).toHaveBeenCalledExactlyOnceWith(sql, email);
    expect(sql.join('?')).toContain('WHERE lower(email) = lower(?) AND deactivated_at IS NULL');
  });

  it('returns null when no active account matches', async () => {
    const { repository, $queryRaw } = setup();
    $queryRaw.mockResolvedValue([]);

    await expect(repository.findActiveByEmail(email)).resolves.toBeNull();
  });
});
