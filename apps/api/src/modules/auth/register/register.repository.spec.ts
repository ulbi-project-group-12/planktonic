import { describe, expect, it, vi } from 'vitest';
import { RegisterResponseSchema } from '@app/contracts';
import type { PrismaService } from '../../../core/prisma/prisma.service.js';
import { RegisterRepository } from './register.repository.js';

const name = "O'Connor";
const email = 'Ada@example.com';
const passwordHash = 'test-hash';

function setup() {
  const $queryRaw = vi.fn();
  const repository = new RegisterRepository({ $queryRaw } as unknown as PrismaService);
  return { repository, $queryRaw };
}

describe('RegisterRepository.create', () => {
  it('uses bound parameters and returns the public user from the insert', async () => {
    const { repository, $queryRaw } = setup();
    const user = { id: '019a8f00-0000-7000-8000-000000000004', name, email };
    $queryRaw.mockResolvedValue([user]);

    const result = await repository.create(name, email, passwordHash);

    expect(result).toEqual(user);
    expect(RegisterResponseSchema.safeParse(result).success).toBe(true);
    const sql = expect.arrayContaining([
      expect.stringContaining('INSERT INTO users (name, email, password_hash)'),
      expect.stringContaining('ON CONFLICT (lower(email)) DO NOTHING'),
      expect.stringContaining('RETURNING id, name, email'),
    ]) as TemplateStringsArray;
    expect($queryRaw).toHaveBeenCalledExactlyOnceWith(sql, name, email, passwordHash);
  });

  it('returns null when the insert skips a conflicting email', async () => {
    const { repository, $queryRaw } = setup();
    $queryRaw.mockResolvedValue([]);

    await expect(repository.create(name, email, passwordHash)).resolves.toBeNull();
    expect($queryRaw).toHaveBeenCalledTimes(1);
  });

  it('propagates other database errors', async () => {
    const { repository, $queryRaw } = setup();
    const failure = new Error('connection lost');
    $queryRaw.mockRejectedValue(failure);

    await expect(repository.create(name, email, passwordHash)).rejects.toBe(failure);
  });
});
