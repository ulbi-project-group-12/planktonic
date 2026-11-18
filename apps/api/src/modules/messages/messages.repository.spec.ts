import { describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../../core/prisma/prisma.service.js';
import { Prisma } from '../../generated/prisma/client.js';
import { type MessageRow, MessagesRepository } from './messages.repository.js';

const CHANNEL = '00000000-0000-7000-8000-000000000001';
const AUTHOR = '00000000-0000-7000-8000-000000000002';
const KEY = '019a8f00-0000-7000-8000-000000000004';

const row: MessageRow = {
  id: '00000000-0000-7000-8000-000000000003',
  seq: 1n,
  channelId: CHANNEL,
  authorId: AUTHOR,
  clientMsgId: KEY,
  body: 'hello',
  createdAt: new Date('2026-11-18T10:00:00.000Z'),
};

const uniqueViolation = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
  code: 'P2002',
  clientVersion: 'test',
});

function setup(findUnique: ReturnType<typeof vi.fn>, $transaction: ReturnType<typeof vi.fn>) {
  const prisma = { message: { findUnique }, $transaction } as unknown as PrismaService;
  return new MessagesRepository(prisma);
}

describe('MessagesRepository.create', () => {
  it('returns a row found before the transaction without opening one', async () => {
    const $transaction = vi.fn();
    const repository = setup(vi.fn().mockResolvedValue(row), $transaction);

    await expect(repository.create(CHANNEL, AUTHOR, KEY, 'hello')).resolves.toEqual({
      row,
      created: false,
    });
    expect($transaction).not.toHaveBeenCalled();
  });

  it('turns P2002 into the stored row when it exists after the rollback', async () => {
    const findUnique = vi.fn().mockResolvedValueOnce(null).mockResolvedValueOnce(row);
    const repository = setup(findUnique, vi.fn().mockRejectedValue(uniqueViolation));

    await expect(repository.create(CHANNEL, AUTHOR, KEY, 'hello')).resolves.toEqual({
      row,
      created: false,
    });
  });

  it('rethrows P2002 when no row has the key (another constraint failed)', async () => {
    const repository = setup(
      vi.fn().mockResolvedValue(null),
      vi.fn().mockRejectedValue(uniqueViolation),
    );

    await expect(repository.create(CHANNEL, AUTHOR, KEY, 'hello')).rejects.toBe(uniqueViolation);
  });

  it('rethrows any other error as is', async () => {
    const failure = new Error('connection lost');
    const findUnique = vi.fn().mockResolvedValue(null);
    const repository = setup(findUnique, vi.fn().mockRejectedValue(failure));

    await expect(repository.create(CHANNEL, AUTHOR, KEY, 'hello')).rejects.toBe(failure);
    expect(findUnique).toHaveBeenCalledTimes(1);
  });
});
