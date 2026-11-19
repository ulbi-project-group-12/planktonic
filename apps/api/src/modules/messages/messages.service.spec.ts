import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { describe, expect, it, vi } from 'vitest';
import { RealtimePublisher } from '../../core/realtime/realtime-publisher.js';
import { type MessageRow, MessagesRepository } from './messages.repository.js';
import { MessagesService } from './messages.service.js';

const CHANNEL = '00000000-0000-7000-8000-000000000001';
const AUTHOR = '00000000-0000-7000-8000-000000000002';
const KEY = '019a8f00-0000-7000-8000-000000000004';

const row: MessageRow = {
  id: '00000000-0000-7000-8000-000000000003',
  seq: 7n,
  channelId: CHANNEL,
  authorId: AUTHOR,
  clientMsgId: KEY,
  body: 'hello',
  createdAt: new Date('2026-11-16T10:00:00.000Z'),
};

const publish = vi.fn();

async function setup(repository: Partial<MessagesRepository>) {
  publish.mockReset();
  const moduleRef = await Test.createTestingModule({
    providers: [
      MessagesService,
      { provide: MessagesRepository, useValue: repository },
      { provide: RealtimePublisher, useValue: { publish } },
    ],
  }).compile();
  return moduleRef.get(MessagesService);
}

describe('MessagesService', () => {
  it('maps a created row to the contract response with created: true', async () => {
    const create = vi.fn().mockResolvedValue({ row, created: true });
    const service = await setup({ create });

    await expect(service.create(CHANNEL, AUTHOR, KEY, 'hello')).resolves.toEqual({
      message: {
        id: row.id,
        seq: '7',
        channelId: CHANNEL,
        authorId: AUTHOR,
        clientMsgId: KEY,
        body: 'hello',
        createdAt: '2026-11-16T10:00:00.000Z',
      },
      created: true,
    });
    expect(create).toHaveBeenCalledWith(CHANNEL, AUTHOR, KEY, 'hello');
  });

  it('passes a found row through with created: false', async () => {
    const service = await setup({ create: vi.fn().mockResolvedValue({ row, created: false }) });

    const result = await service.create(CHANNEL, AUTHOR, KEY, 'edited on retry');
    expect(result.created).toBe(false);
    expect(result.message).toMatchObject({ id: row.id, seq: '7', body: 'hello' });
  });

  it('treats an uppercase channel id in the path as the same channel', async () => {
    const service = await setup({ create: vi.fn().mockResolvedValue({ row, created: false }) });

    const result = await service.create(CHANNEL.toUpperCase(), AUTHOR, KEY, 'hello');
    expect(result).toMatchObject({ created: false, message: { id: row.id } });
  });

  it('throws 409 when the key was already used in another channel', async () => {
    const elsewhere = { ...row, channelId: '00000000-0000-7000-8000-000000000009' };
    const service = await setup({
      create: vi.fn().mockResolvedValue({ row: elsewhere, created: false }),
    });

    await expect(service.create(CHANNEL, AUTHOR, KEY, 'hello')).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('throws 404 when posting to a missing channel', async () => {
    const service = await setup({ create: vi.fn().mockResolvedValue(null) });

    await expect(service.create(CHANNEL, AUTHOR, KEY, 'hi')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('publishes message:new to the channel room after the repository resolves', async () => {
    let committed = false;
    const create = vi.fn(async () => {
      await Promise.resolve();
      committed = true;
      return { row, created: true };
    });
    // After setup: setup() resets the publish mock, implementation included.
    const service = await setup({ create });
    let committedAtPublish: boolean | undefined;
    publish.mockImplementation(() => {
      committedAtPublish = committed;
    });

    const { message } = await service.create(CHANNEL, AUTHOR, KEY, 'hello');

    expect(committedAtPublish).toBe(true);

    expect(publish).toHaveBeenCalledExactlyOnceWith(`channel:${CHANNEL}`, 'message:new', {
      message,
    });
  });

  it('publishes nothing for a retry (created: false)', async () => {
    const service = await setup({ create: vi.fn().mockResolvedValue({ row, created: false }) });

    await service.create(CHANNEL, AUTHOR, KEY, 'hello');
    expect(publish).not.toHaveBeenCalled();
  });

  it('publishes nothing when the key belongs to another channel (409)', async () => {
    const elsewhere = { ...row, channelId: '00000000-0000-7000-8000-000000000009' };
    const service = await setup({
      create: vi.fn().mockResolvedValue({ row: elsewhere, created: false }),
    });

    await expect(service.create(CHANNEL, AUTHOR, KEY, 'hi')).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(publish).not.toHaveBeenCalled();
  });

  it('publishes nothing when the transaction fails', async () => {
    const service = await setup({ create: vi.fn().mockRejectedValue(new Error('rolled back')) });

    await expect(service.create(CHANNEL, AUTHOR, KEY, 'hi')).rejects.toThrow('rolled back');
    expect(publish).not.toHaveBeenCalled();
  });

  it('publishes nothing for a missing channel', async () => {
    const service = await setup({ create: vi.fn().mockResolvedValue(null) });

    await expect(service.create(CHANNEL, AUTHOR, KEY, 'hi')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(publish).not.toHaveBeenCalled();
  });

  it('lists the newest page of an existing channel, oldest first, hasMore false', async () => {
    const findLatest = vi.fn().mockResolvedValue([row]);
    const service = await setup({ channelExists: vi.fn().mockResolvedValue(true), findLatest });

    const result = await service.list(CHANNEL, { limit: 100 });

    expect(findLatest).toHaveBeenCalledWith(CHANNEL, 101);
    expect(result.messages.map((m) => m.seq)).toEqual(['7']);
    expect(result.hasMore).toBe(false);
  });

  it('newest page: one row past the limit means older ones exist and is not returned', async () => {
    const rows = [5n, 6n, 7n].map((seq) => ({
      ...row,
      id: `${row.id.slice(0, -1)}${String(seq)}`,
      seq,
    }));
    const service = await setup({
      channelExists: vi.fn().mockResolvedValue(true),
      findLatest: vi.fn().mockResolvedValue(rows),
    });

    const result = await service.list(CHANNEL, { limit: 2 });

    expect(result.messages.map((m) => m.seq)).toEqual(['6', '7']);
    expect(result.hasMore).toBe(true);
  });

  it('afterSeq reads after it as a BigInt and trims the extra row into hasMore', async () => {
    const rows = [8n, 9n, 10n].map((seq) => ({
      ...row,
      id: `${row.id.slice(0, -1)}${String(seq)}`,
      seq,
    }));
    const findAfter = vi.fn().mockResolvedValue(rows);
    const service = await setup({ channelExists: vi.fn().mockResolvedValue(true), findAfter });

    const result = await service.list(CHANNEL, { afterSeq: '7', limit: 2 });

    expect(findAfter).toHaveBeenCalledWith(CHANNEL, 7n, 3);
    expect(result.messages.map((m) => m.seq)).toEqual(['8', '9']);
    expect(result.hasMore).toBe(true);
  });

  it('afterSeq with exactly limit rows left has hasMore false', async () => {
    const service = await setup({
      channelExists: vi.fn().mockResolvedValue(true),
      findAfter: vi.fn().mockResolvedValue([row]),
    });

    const result = await service.list(CHANNEL, { afterSeq: '6', limit: 1 });

    expect(result).toMatchObject({ hasMore: false });
    expect(result.messages).toHaveLength(1);
  });

  it('throws 404 when listing a missing channel', async () => {
    const service = await setup({ channelExists: vi.fn().mockResolvedValue(false) });

    await expect(service.list(CHANNEL, { limit: 100 })).rejects.toBeInstanceOf(NotFoundException);
  });
});
