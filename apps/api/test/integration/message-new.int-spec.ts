// UL-127: REST send → `message:new` in the channel room, across two app instances in one process
// (shared Postgres and Redis, Redis Streams adapter between them). Run with `pnpm test:integration`.
//
// "No event" is proven with a control event, not a timer: the instance that would have emitted
// the unwanted event then emits a wanted one to the same room. One instance's broadcasts stay in
// order: socket.io-adapter's ClusterAdapter awaits each XADD on one Redis connection before the
// next, and receivers XREAD the single stream in order. So once the wanted event has arrived, the
// unwanted one can no longer come.
import { randomUUID, randomUUIDv7 } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import type { Socket } from 'socket.io-client';
import { describe, expect, it, vi } from 'vitest';
import { MESSAGE_NEW_EVENT, MessageNewEvent, MessageResponse } from '@app/contracts';
import { PrismaService } from '../../src/core/prisma/prisma.service.js';
import { channelRoom } from '../../src/core/realtime/rooms.js';
import { RealtimeGateway } from '../../src/modules/realtime/realtime.gateway.js';
import { RealtimeService } from '../../src/modules/realtime/realtime.service.js';
import { recordEvents, waitForEvent, type EventRecorder } from './support/events.js';
import { createChannel, postMessage } from './support/http.js';
import { useStand } from './support/stand.js';

const stand = useStand({ instances: ['test-api-1', 'test-api-2'] });
const { apps } = stand;

/**
 * The gateway joins rooms in connection middleware, so by `connect` the socket must already be in
 * the room. No polling: a client cannot poll either, and its catch-up starts on `connect`.
 */
function expectInRoom(app: INestApplication, client: Socket, channelId: string): void {
  const { server } = app.get(RealtimeGateway);
  expect(server.sockets.adapter.rooms.get(channelRoom(channelId))?.has(client.id ?? '')).toBe(true);
}

interface Listener {
  client: Socket;
  events: EventRecorder<MessageNewEvent>;
}

/**
 * A fresh channel with one recording client on each instance ("A" on 1, "B" on 2), both already
 * in its room. `prefix` keeps the labels apart when a test makes more than one channel.
 */
async function channelWithListeners(
  prefix = '',
): Promise<{ channelId: string; on: [Listener, Listener] }> {
  const channelId = await createChannel(stand.prisma);
  const on = (await Promise.all(
    apps.slice(0, 2).map(async (app, index) => {
      const client = await stand.connect(app, `${prefix}${index === 0 ? 'A' : 'B'}`);
      expectInRoom(app, client, channelId);
      return { client, events: recordEvents(client, MESSAGE_NEW_EVENT, MessageNewEvent.parse) };
    }),
  )) as [Listener, Listener];
  return { channelId, on };
}

function bySeq(events: readonly MessageNewEvent[]): MessageNewEvent[] {
  return [...events].sort((a, b) => Number(BigInt(a.message.seq) - BigInt(b.message.seq)));
}

/** Waits for exactly `expected.length` events and checks them, in arrival order. */
async function expectEvents(listener: Listener, expected: MessageResponse[]): Promise<void> {
  await listener.events.waitForCount(expected.length);
  expect(listener.events.events).toEqual(expected.map((message) => ({ message })));
}

describe('message:new after commit, across instances', () => {
  // The UL-132 acceptance test: user A on instance 1 sends, user B on instance 2 receives.
  it('A on instance 1 sends, B on instance 2 receives message:new', async () => {
    const channelId = await createChannel(stand.prisma);
    const a = await stand.connect(apps[0]!, 'A');
    const b = await stand.connect(apps[1]!, 'B');
    expectInRoom(apps[0]!, a, channelId);
    expectInRoom(apps[1]!, b, channelId);
    const received = waitForEvent(b, MESSAGE_NEW_EVENT, { parse: MessageNewEvent.parse });
    // The sender's own socket gets the event too (decision recorded in the UL-127 PR): the
    // client merges it with the POST response by `id`.
    const echoed = waitForEvent(a, MESSAGE_NEW_EVENT, { parse: MessageNewEvent.parse });
    const onB = recordEvents(b, MESSAGE_NEW_EVENT, MessageNewEvent.parse);

    const response = await postMessage(apps[0]!, channelId, 'hello across instances');

    expect(response.status).toBe(201);
    const message = MessageResponse.parse(await response.json());
    expect(message.seq).toBe('1');
    expect(await received).toEqual({ message });
    expect(await echoed).toEqual({ message });

    // Exactly once: a control message from the same instance comes right after, nothing between.
    const control = MessageResponse.parse(
      await (await postMessage(apps[0]!, channelId, 'control')).json(),
    );
    await onB.waitForCount(2);
    expect(onB.events).toEqual([{ message }, { message: control }]);
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

    const failed = await postMessage(apps[0]!, channelId, 'rolled back');
    expect(failed.status).toBe(500);
    expect(inserted).toBe(true);
    expect(await stand.prisma.message.count({ where: { channelId } })).toBe(0);

    // Control event from the same instance and room: the next message, which reuses seq 1.
    const control = await postMessage(apps[0]!, channelId, 'control');
    expect(control.status).toBe(201);
    const message = MessageResponse.parse(await control.json());
    expect(message.seq).toBe('1');
    await expectEvents(remote, [message]);
  });

  it('publishes nothing for a retry with the same clientMsgId, on either instance', async () => {
    const { channelId, on } = await channelWithListeners();
    const [sender, remote] = on;
    const key = randomUUIDv7();

    const first = await postMessage(apps[0]!, channelId, 'once', key);
    expect(first.status).toBe(201);
    const message = MessageResponse.parse(await first.json());
    // The lost-response retry may land on either replica; both find the stored row.
    for (const app of apps.slice(0, 2)) {
      const retry = await postMessage(app, channelId, 'once', key);
      expect(retry.status).toBe(201);
      expect(MessageResponse.parse(await retry.json())).toEqual(message);
    }

    // Control events from both instances. Each instance's broadcasts stay in order, so once both
    // controls are in, a stray retry event from either instance would already have arrived. The
    // two instances' events may interleave, hence the sort by seq.
    const controls: MessageResponse[] = [];
    for (const app of apps.slice(0, 2)) {
      const control = await postMessage(app, channelId, 'control');
      controls.push(MessageResponse.parse(await control.json()));
    }
    expect(controls.map((control) => control.seq)).toEqual(['2', '3']);
    const expected = [message, ...controls].map((m) => ({ message: m }));
    for (const listener of [remote, sender]) {
      expect(bySeq(await listener.events.waitForCount(expected.length))).toEqual(expected);
    }
  });

  it('routes by the stored channel id when the path spells the uuid in upper case', async () => {
    const { channelId, on } = await channelWithListeners();
    const [, remote] = on;

    const response = await postMessage(apps[0]!, channelId.toUpperCase(), 'shouty path');
    expect(response.status).toBe(201);
    const message = MessageResponse.parse(await response.json());
    expect(message.channelId).toBe(channelId);
    await expectEvents(remote, [message]);
  });

  it('publishes nothing for a channel that does not exist', async () => {
    const { channelId, on } = await channelWithListeners();
    const [, remote] = on;

    // No socket can be in a missing channel's room, so watch the publisher itself as well.
    const publish = vi.spyOn(apps[0]!.get(RealtimeService), 'publish');
    try {
      const missing = await postMessage(apps[0]!, randomUUID(), 'nowhere');
      expect(missing.status).toBe(404);
      expect(publish).not.toHaveBeenCalled();

      const control = await postMessage(apps[0]!, channelId, 'control');
      const message = MessageResponse.parse(await control.json());
      expect(publish).toHaveBeenCalledExactlyOnceWith(channelRoom(channelId), MESSAGE_NEW_EVENT, {
        message,
      });
      await expectEvents(remote, [message]);
    } finally {
      publish.mockRestore();
    }
  });

  it('keeps events of different channels in their own rooms', async () => {
    const first = await channelWithListeners('first-');
    const second = await channelWithListeners('second-');
    const remote = apps[1]!.get(RealtimeGateway).server;
    // Each listener socket joined every channel that existed when it connected, so the second
    // channel's sockets are in both rooms and the first channel's only in the first.
    expect(
      remote.sockets.adapter.rooms.get(channelRoom(second.channelId))?.has(first.on[1].client.id!),
    ).toBeFalsy();

    const response = await postMessage(apps[0]!, second.channelId, 'second only');
    const message = MessageResponse.parse(await response.json());
    const control = await postMessage(apps[0]!, first.channelId, 'first');
    const firstMessage = MessageResponse.parse(await control.json());

    await expectEvents(first.on[1], [firstMessage]);
    // The second channel's listener is in both rooms, so it sees both, in send order.
    await expectEvents(second.on[1], [message, firstMessage]);
  });
});
