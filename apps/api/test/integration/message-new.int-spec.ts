// UL-127: REST send → `message:new` in the channel room, across two app instances in one process
// (shared Postgres and Redis, Redis Streams adapter between them). Run with `pnpm test:integration`.
//
// "No event" is proven with a control event, not a timer: the instance that would have emitted
// the unwanted event then emits a wanted one to the same room. The adapter keeps one instance's
// broadcasts in order, so once the wanted event has arrived the unwanted one can no longer come.
import { randomUUID, randomUUIDv7 } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaPg } from '@prisma/adapter-pg';
import { io, type Socket } from 'socket.io-client';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { MESSAGE_NEW_EVENT, MessageNewEvent, MessageResponse } from '@app/contracts';
import { AppModule } from '../../src/app.module.js';
import { configureApp } from '../../src/app.setup.js';
import { INSTANCE_ID } from '../../src/core/instance/instance-id.provider.js';
import { PrismaService } from '../../src/core/prisma/prisma.service.js';
import { configureRealtime } from '../../src/core/realtime/realtime.setup.js';
import { channelRoom } from '../../src/core/realtime/rooms.js';
import { PrismaClient } from '../../src/generated/prisma/client.js';
import { DEFAULT_AUTHOR_ID } from '../../src/modules/messages/default-author.js';
import { RealtimeGateway } from '../../src/modules/realtime/realtime.gateway.js';

const EVENT_TIMEOUT_MS = 5_000;

const apps: INestApplication[] = [];
const clients: Socket[] = [];
const createdChannels: string[] = [];
let prisma: PrismaClient;

async function createTestApp(instanceId: string): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(INSTANCE_ID)
    .useValue(instanceId)
    .compile();
  const app = configureApp(moduleRef.createNestApplication({ logger: false }));
  apps.push(app);
  await configureRealtime(app);
  await app.listen(0, '127.0.0.1');
  return app;
}

async function connectClient(app: INestApplication): Promise<Socket> {
  const client = io(await app.getUrl(), {
    autoConnect: false,
    transports: ['websocket'],
    reconnection: false,
    forceNew: true,
    timeout: EVENT_TIMEOUT_MS,
  });
  clients.push(client);
  await new Promise<void>((resolve, reject) => {
    client.once('connect', () => {
      resolve();
    });
    client.once('connect_error', reject);
    client.connect();
  });
  return client;
}

/** The gateway joins rooms after a DB lookup, so `connect` can fire first: wait for the room. */
async function joinedRoom(app: INestApplication, client: Socket, channelId: string): Promise<void> {
  const { server } = app.get(RealtimeGateway);
  await expect
    .poll(() => server.sockets.adapter.rooms.get(channelRoom(channelId))?.has(client.id ?? ''), {
      timeout: EVENT_TIMEOUT_MS,
    })
    .toBe(true);
}

interface Listener {
  client: Socket;
  events: MessageNewEvent[];
}

/** A fresh channel with one listening client on each instance, both already in its room. */
async function channelWithListeners(): Promise<{ channelId: string; on: [Listener, Listener] }> {
  const channel = await prisma.channel.create({ data: { name: `it-${randomUUID()}` } });
  createdChannels.push(channel.id);
  const on = (await Promise.all(
    apps.slice(0, 2).map(async (app) => {
      const client = await connectClient(app);
      await joinedRoom(app, client, channel.id);
      const events: MessageNewEvent[] = [];
      client.on(MESSAGE_NEW_EVENT, (payload: unknown) => {
        events.push(MessageNewEvent.parse(payload));
      });
      return { client, events };
    }),
  )) as [Listener, Listener];
  return { channelId: channel.id, on };
}

function bySeq(events: MessageNewEvent[]): MessageNewEvent[] {
  return [...events].sort((a, b) => Number(BigInt(a.message.seq) - BigInt(b.message.seq)));
}

async function post(
  app: INestApplication,
  channelId: string,
  body: string,
  clientMsgId = randomUUIDv7(),
): Promise<Response> {
  return fetch(`${await app.getUrl()}/api/channels/${channelId}/messages`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ clientMsgId, body }),
  });
}

beforeAll(async () => {
  prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });
  await prisma.user.upsert({
    where: { id: DEFAULT_AUTHOR_ID },
    update: {},
    create: { id: DEFAULT_AUTHOR_ID, name: 'test-user' },
  });
  await createTestApp('test-api-1');
  await createTestApp('test-api-2');
});

afterAll(async () => {
  for (const client of clients) client.disconnect();
  await Promise.allSettled(apps.map((app) => app.close()));
  await prisma.message.deleteMany({ where: { channelId: { in: createdChannels } } });
  await prisma.channel.deleteMany({ where: { id: { in: createdChannels } } });
  await prisma.$disconnect();
});

describe('message:new after commit, across instances', () => {
  it('POST on instance 1 reaches the client on instance 2 with the message and its seq', async () => {
    const { channelId, on } = await channelWithListeners();
    const [sender, remote] = on;

    const response = await post(apps[0]!, channelId, 'hello across instances');

    expect(response.status).toBe(201);
    const message = MessageResponse.parse(await response.json());
    expect(message.seq).toBe('1');
    await expect.poll(() => remote.events, { timeout: EVENT_TIMEOUT_MS }).toEqual([{ message }]);
    // The sender's own socket gets the event too (decision recorded in the UL-127 PR): the
    // client merges it with the POST response by `id`.
    await expect.poll(() => sender.events, { timeout: EVENT_TIMEOUT_MS }).toEqual([{ message }]);
  });

  it('publishes nothing when the transaction rolls back after the insert', async () => {
    const { channelId, on } = await channelWithListeners();
    const [, remote] = on;
    const prismaService = apps[0]!.get(PrismaService);
    const transaction = prismaService.$transaction.bind(prismaService) as (
      fn: (tx: unknown) => Promise<unknown>,
    ) => Promise<unknown>;
    let inserted = false;
    // The real repository runs its UPDATE + INSERT; the callback then throws, so Postgres rolls
    // both back. Only the next transaction is affected.
    vi.spyOn(prismaService, '$transaction').mockImplementationOnce(((
      fn: (tx: unknown) => Promise<unknown>,
    ) =>
      transaction(async (tx) => {
        await fn(tx);
        inserted = true;
        throw new Error('fail after insert');
      })) as never);

    const failed = await post(apps[0]!, channelId, 'rolled back');
    expect(failed.status).toBe(500);
    expect(inserted).toBe(true);
    expect(await prisma.message.count({ where: { channelId } })).toBe(0);

    // Control event from the same instance and room: the next message, which reuses seq 1.
    const control = await post(apps[0]!, channelId, 'control');
    expect(control.status).toBe(201);
    const message = MessageResponse.parse(await control.json());
    expect(message.seq).toBe('1');
    await expect.poll(() => remote.events, { timeout: EVENT_TIMEOUT_MS }).toEqual([{ message }]);
  });

  it('publishes nothing for a retry with the same clientMsgId, on either instance', async () => {
    const { channelId, on } = await channelWithListeners();
    const [sender, remote] = on;
    const key = randomUUIDv7();

    const first = await post(apps[0]!, channelId, 'once', key);
    expect(first.status).toBe(201);
    const message = MessageResponse.parse(await first.json());
    // The lost-response retry may land on either replica; both find the stored row.
    for (const app of apps.slice(0, 2)) {
      const retry = await post(app, channelId, 'once', key);
      expect(retry.status).toBe(201);
      expect(MessageResponse.parse(await retry.json())).toEqual(message);
    }

    // Control events from both instances. Each instance's broadcasts stay in order, so once both
    // controls are in, a stray retry event from either instance would already have arrived. The
    // two instances' events may interleave, hence the sort by seq.
    const controls: MessageResponse[] = [];
    for (const app of apps.slice(0, 2)) {
      const control = await post(app, channelId, 'control');
      controls.push(MessageResponse.parse(await control.json()));
    }
    expect(controls.map((control) => control.seq)).toEqual(['2', '3']);
    const expected = [message, ...controls].map((m) => ({ message: m }));
    for (const listener of [remote, sender]) {
      await expect
        .poll(() => bySeq(listener.events), { timeout: EVENT_TIMEOUT_MS })
        .toEqual(expected);
    }
  });

  it('publishes nothing for a channel that does not exist', async () => {
    const { channelId, on } = await channelWithListeners();
    const [, remote] = on;

    const missing = await post(apps[0]!, randomUUID(), 'nowhere');
    expect(missing.status).toBe(404);

    const control = await post(apps[0]!, channelId, 'control');
    const message = MessageResponse.parse(await control.json());
    await expect.poll(() => remote.events, { timeout: EVENT_TIMEOUT_MS }).toEqual([{ message }]);
  });

  it('keeps events of different channels in their own rooms', async () => {
    const first = await channelWithListeners();
    const second = await channelWithListeners();
    const remote = apps[1]!.get(RealtimeGateway).server;
    // Each listener socket joined every channel that existed when it connected, so the second
    // channel's sockets are in both rooms and the first channel's only in the first.
    expect(
      remote.sockets.adapter.rooms.get(channelRoom(second.channelId))?.has(first.on[1].client.id!),
    ).toBeFalsy();

    const response = await post(apps[0]!, second.channelId, 'second only');
    const message = MessageResponse.parse(await response.json());
    const control = await post(apps[0]!, first.channelId, 'first');
    const firstMessage = MessageResponse.parse(await control.json());

    await expect
      .poll(() => first.on[1].events, { timeout: EVENT_TIMEOUT_MS })
      .toEqual([{ message: firstMessage }]);
    // The second channel's listener is in both rooms, so it sees both, in send order.
    await expect
      .poll(() => second.on[1].events, { timeout: EVENT_TIMEOUT_MS })
      .toEqual([{ message }, { message: firstMessage }]);
  });
});
