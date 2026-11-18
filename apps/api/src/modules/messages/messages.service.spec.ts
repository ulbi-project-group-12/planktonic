import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { describe, expect, it, vi } from 'vitest';
import { type MessageRow, MessagesRepository } from './messages.repository.js';
import { MessagesService } from './messages.service.js';

const CHANNEL = '00000000-0000-7000-8000-000000000001';
const AUTHOR = '00000000-0000-7000-8000-000000000002';

const row: MessageRow = {
  id: '00000000-0000-7000-8000-000000000003',
  seq: 7n,
  channelId: CHANNEL,
  authorId: AUTHOR,
  body: 'hello',
  createdAt: new Date('2026-11-16T10:00:00.000Z'),
};

async function setup(repository: Partial<MessagesRepository>) {
  const moduleRef = await Test.createTestingModule({
    providers: [MessagesService, { provide: MessagesRepository, useValue: repository }],
  }).compile();
  return moduleRef.get(MessagesService);
}

describe('MessagesService', () => {
  it('maps a created row to the contract response', async () => {
    const service = await setup({ create: vi.fn().mockResolvedValue(row) });

    await expect(service.create(CHANNEL, AUTHOR, 'hello')).resolves.toEqual({
      id: row.id,
      seq: '7',
      channelId: CHANNEL,
      authorId: AUTHOR,
      body: 'hello',
      createdAt: '2026-11-16T10:00:00.000Z',
    });
  });

  it('throws 404 when posting to a missing channel', async () => {
    const service = await setup({ create: vi.fn().mockResolvedValue(null) });

    await expect(service.create(CHANNEL, AUTHOR, 'hi')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('lists messages of an existing channel', async () => {
    const service = await setup({
      channelExists: vi.fn().mockResolvedValue(true),
      findLatest: vi.fn().mockResolvedValue([row]),
    });

    const result = await service.list(CHANNEL);
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0]?.seq).toBe('7');
  });

  it('throws 404 when listing a missing channel', async () => {
    const service = await setup({ channelExists: vi.fn().mockResolvedValue(false) });

    await expect(service.list(CHANNEL)).rejects.toBeInstanceOf(NotFoundException);
  });
});
