// POST/GET messages against a real, migrated Postgres (UL-125). Run with `pnpm test:integration`
// (vitest.integration.config.ts); `pnpm test` skips this directory.
//
// The key property: concurrent sends to one channel get seq 1..N with no gaps and no duplicates,
// because the UPDATE ... RETURNING on the channel row serializes them inside each transaction.
import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaPg } from '@prisma/adapter-pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { GetMessagesResponse, MessageResponse } from '@app/contracts';
import { AppModule } from '../../src/app.module.js';
import { configureApp } from '../../src/app.setup.js';
import { PrismaClient } from '../../src/generated/prisma/client.js';
import { DEFAULT_AUTHOR_ID } from '../../src/modules/messages/default-author.js';

const PARALLEL_SENDS = 20;
const N = String(PARALLEL_SENDS);

let app: INestApplication;
let baseUrl: string;
let prisma: PrismaClient;
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

  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = configureApp(moduleRef.createNestApplication({ logger: false }));
  await app.listen(0, '127.0.0.1');
  baseUrl = await app.getUrl();
});

afterAll(async () => {
  await app.close();
  // Each test owns a fresh channel; remove them so reruns start clean.
  await prisma.message.deleteMany({ where: { channelId: { in: createdChannels } } });
  await prisma.channel.deleteMany({ where: { id: { in: createdChannels } } });
  await prisma.$disconnect();
});

async function newChannel(): Promise<string> {
  const channel = await prisma.channel.create({ data: { name: `it-${randomUUID()}` } });
  createdChannels.push(channel.id);
  return channel.id;
}

function post(channelId: string, body: string): Promise<Response> {
  return fetch(`${baseUrl}/api/channels/${channelId}/messages`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ body }),
  });
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
