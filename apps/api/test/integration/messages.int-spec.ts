// POST/GET messages against a real, migrated Postgres (UL-125). Run with `pnpm test:integration`
// (vitest.integration.config.ts); `pnpm test` skips this directory.
//
// The key property: concurrent sends to one channel get seq 1..N with no gaps and no duplicates,
// because the UPDATE ... RETURNING on the channel row serializes them inside each transaction.
// UL-126 adds idempotency: a retry with the same clientMsgId returns the stored message and does
// not advance channels.last_seq, also when the copies race each other.
import { randomUUID, randomUUIDv7 } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaPg } from '@prisma/adapter-pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { GetMessagesResponse, MessageResponse } from '@app/contracts';
import { AppModule } from '../../src/app.module.js';
import { configureApp } from '../../src/app.setup.js';
import { PrismaClient } from '../../src/generated/prisma/client.js';
import { DEFAULT_AUTHOR_ID } from '../../src/modules/messages/default-author.js';
import { MessagesRepository } from '../../src/modules/messages/messages.repository.js';

const PARALLEL_SENDS = 20;
const N = String(PARALLEL_SENDS);
const PARALLEL_RETRIES = 10;
const OTHER_AUTHOR_ID = randomUUIDv7();

let app: INestApplication;
let baseUrl: string;
let prisma: PrismaClient;
let repository: MessagesRepository;
const createdChannels: string[] = [];

beforeAll(async () => {
  prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });
  await prisma.user.upsert({
    where: { id: DEFAULT_AUTHOR_ID },
    update: {},
    create: { id: DEFAULT_AUTHOR_ID, name: 'test-user' },
  });
  await prisma.user.create({ data: { id: OTHER_AUTHOR_ID, name: 'it-other-author' } });

  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = configureApp(moduleRef.createNestApplication({ logger: false }));
  await app.listen(0, '127.0.0.1');
  baseUrl = await app.getUrl();
  repository = app.get(MessagesRepository);
});

afterAll(async () => {
  await app.close();
  // Each test owns a fresh channel; remove them so reruns start clean.
  await prisma.message.deleteMany({ where: { channelId: { in: createdChannels } } });
  await prisma.channel.deleteMany({ where: { id: { in: createdChannels } } });
  await prisma.user.delete({ where: { id: OTHER_AUTHOR_ID } });
  await prisma.$disconnect();
});

async function newChannel(): Promise<string> {
  const channel = await prisma.channel.create({ data: { name: `it-${randomUUID()}` } });
  createdChannels.push(channel.id);
  return channel.id;
}

function post(
  channelId: string,
  body: string,
  clientMsgId: string = randomUUIDv7(),
): Promise<Response> {
  return fetch(`${baseUrl}/api/channels/${channelId}/messages`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ clientMsgId, body }),
  });
}

async function lastSeq(channelId: string): Promise<bigint> {
  const channel = await prisma.channel.findUniqueOrThrow({ where: { id: channelId } });
  return channel.lastSeq;
}

function rowsWithKey(clientMsgId: string) {
  return prisma.message.findMany({ where: { clientMsgId } });
}

describe('messages against Postgres', () => {
  it('POST saves the message and returns it with seq "1"', async () => {
    const channelId = await newChannel();

    const response = await post(channelId, 'hello');

    expect(response.status).toBe(201);
    const message = MessageResponse.parse(await response.json());
    expect(message).toMatchObject({ seq: '1', channelId, authorId: DEFAULT_AUTHOR_ID });
    const row = await prisma.message.findUniqueOrThrow({ where: { id: message.id } });
    expect(row.seq).toBe(1n);
    const channel = await prisma.channel.findUniqueOrThrow({ where: { id: channelId } });
    expect(channel.lastSeq).toBe(1n);
  });

  it(`${N} parallel POSTs get seq 1..${N}, no gaps, no duplicates`, async () => {
    const channelId = await newChannel();

    const responses = await Promise.all(
      Array.from({ length: PARALLEL_SENDS }, (_, i) => post(channelId, `parallel ${String(i)}`)),
    );

    expect(responses.map((r) => r.status)).toEqual(Array(PARALLEL_SENDS).fill(201));
    const created = await Promise.all(
      responses.map(async (r) => MessageResponse.parse(await r.json())),
    );
    const seqs = created.map((m) => Number(m.seq)).sort((a, b) => a - b);
    console.log(`seq of ${N} parallel POSTs, sorted: ${seqs.join(',')}`);
    expect(seqs).toEqual(Array.from({ length: PARALLEL_SENDS }, (_, i) => i + 1));

    // GET returns exactly those messages, ascending by seq.
    const list = await fetch(`${baseUrl}/api/channels/${channelId}/messages`);
    expect(list.status).toBe(200);
    const { messages } = GetMessagesResponse.parse(await list.json());
    expect(messages.map((m) => m.seq)).toEqual(seqs.map(String));
    expect(new Set(messages.map((m) => m.id))).toEqual(new Set(created.map((m) => m.id)));
  });

  it('POST and GET to a missing channel return 404 and use no number', async () => {
    const missing = randomUUID();

    expect((await post(missing, 'hello')).status).toBe(404);
    expect((await fetch(`${baseUrl}/api/channels/${missing}/messages`)).status).toBe(404);
  });
});

describe('idempotent send (UL-126)', () => {
  it('a sequential retry returns the same message and spends no seq', async () => {
    const channelId = await newChannel();
    const key = randomUUIDv7();

    const first = await post(channelId, 'hello', key);
    const retry = await post(channelId, 'hello', key);

    expect([first.status, retry.status]).toEqual([201, 201]);
    const original = MessageResponse.parse(await first.json());
    const repeated = MessageResponse.parse(await retry.json());
    expect(repeated).toEqual(original);
    expect(original).toMatchObject({ seq: '1', clientMsgId: key });
    expect(await rowsWithKey(key)).toHaveLength(1);
    expect(await lastSeq(channelId)).toBe(1n);

    // The next new message continues the sequence without a gap.
    const next = MessageResponse.parse(await (await post(channelId, 'next')).json());
    expect(next.seq).toBe('2');
  });

  it('a retry with a different body gets the stored message back', async () => {
    const channelId = await newChannel();
    const key = randomUUIDv7();

    const original = MessageResponse.parse(await (await post(channelId, 'first', key)).json());
    const retry = await post(channelId, 'edited before retry', key);

    expect(retry.status).toBe(201);
    expect(MessageResponse.parse(await retry.json())).toEqual(original);
    expect(await lastSeq(channelId)).toBe(1n);
  });

  it(`${String(PARALLEL_RETRIES)} concurrent POSTs with one key make one row`, async () => {
    const channelId = await newChannel();
    const key = randomUUIDv7();

    const responses = await Promise.all(
      Array.from({ length: PARALLEL_RETRIES }, () => post(channelId, 'racing', key)),
    );

    expect(responses.map((r) => r.status)).toEqual(Array(PARALLEL_RETRIES).fill(201));
    const messages = await Promise.all(
      responses.map(async (r) => MessageResponse.parse(await r.json())),
    );
    expect(new Set(messages.map((m) => m.id)).size).toBe(1);
    expect(new Set(messages.map((m) => m.seq))).toEqual(new Set(['1']));
    expect(await rowsWithKey(key)).toHaveLength(1);
    expect(await lastSeq(channelId)).toBe(1n);
  });

  it('exactly one of the concurrent calls reports created: true', async () => {
    const channelId = await newChannel();
    const key = randomUUIDv7();

    const results = await Promise.all(
      Array.from({ length: PARALLEL_RETRIES }, () =>
        repository.create(channelId, DEFAULT_AUTHOR_ID, key, 'racing'),
      ),
    );

    expect(results.filter((r) => r?.created === true)).toHaveLength(1);
    expect(new Set(results.map((r) => r?.row.id)).size).toBe(1);
    expect(await lastSeq(channelId)).toBe(1n);
  });

  it('the same key from another author is a different message', async () => {
    const channelId = await newChannel();
    const key = randomUUIDv7();

    const mine = await repository.create(channelId, DEFAULT_AUTHOR_ID, key, 'mine');
    const theirs = await repository.create(channelId, OTHER_AUTHOR_ID, key, 'theirs');

    expect([mine?.created, theirs?.created]).toEqual([true, true]);
    expect(theirs?.row.id).not.toBe(mine?.row.id);
    expect([mine?.row.seq, theirs?.row.seq]).toEqual([1n, 2n]);
    expect(await rowsWithKey(key)).toHaveLength(2);
  });

  it('the same key racing into two channels: one 201, one 409, no seq spent by the loser', async () => {
    const channels = [await newChannel(), await newChannel()];
    const key = randomUUIDv7();

    const responses = await Promise.all(channels.map((id) => post(id, 'racing', key)));

    expect(responses.map((r) => r.status).sort()).toEqual([201, 409]);
    const winner = channels[responses.findIndex((r) => r.status === 201)] ?? '';
    const loser = channels[responses.findIndex((r) => r.status === 409)] ?? '';
    expect(await lastSeq(winner)).toBe(1n);
    expect(await lastSeq(loser)).toBe(0n);
    expect(await rowsWithKey(key)).toHaveLength(1);
  });

  it('an uppercase key is stored and returned lowercase, so retries still match', async () => {
    const channelId = await newChannel();
    const key = randomUUIDv7();

    const first = MessageResponse.parse(
      await (await post(channelId, 'hi', key.toUpperCase())).json(),
    );
    const retry = MessageResponse.parse(await (await post(channelId, 'hi', key)).json());

    expect(first.clientMsgId).toBe(key);
    expect(retry).toEqual(first);
    expect(await lastSeq(channelId)).toBe(1n);
  });

  it('reusing a key in another channel returns 409 and spends no seq there', async () => {
    const firstChannel = await newChannel();
    const secondChannel = await newChannel();
    const key = randomUUIDv7();

    expect((await post(firstChannel, 'hello', key)).status).toBe(201);
    expect((await post(secondChannel, 'hello', key)).status).toBe(409);

    expect(await lastSeq(secondChannel)).toBe(0n);
    expect(await rowsWithKey(key)).toHaveLength(1);
  });
});
