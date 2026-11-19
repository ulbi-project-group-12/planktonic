// UL-133, the phase 2 exit test (ROADMAP): A on instance 1, B on instance 2, B goes offline, A sends
// 5, B comes back and gets those 5, in seq order, once. Next to it: a retry with the same
// clientMsgId returns the same message. Run with `pnpm test:integration`.
//
// It checks the pieces together: gapless seq (UL-125), idempotent POST (UL-126), message:new after
// commit across instances (UL-124, UL-127) and the client's catch-up and dedup (UL-130). The
// catch-up is `catchUp` / `applyCatchUp` / `mergeMessages` from @app/contracts, the code the web
// feed runs, never a copy. Connection State Recovery is off (STACK §4.4), so B's socket gets none
// of what was sent while it was away: B fills the gap through REST, from its last gapless seq.
//
// How B goes offline matters. `client.disconnect()` is a clean exit: the server is told goodbye
// and socket.io never reconnects by itself. Here B talks to instance 2 through a TCP link
// (support/network.ts) and the test resets it, so neither side says goodbye, the server sees
// `transport close` and B's own reconnection brings it back, to the same instance 2.
//
// No timers: every step waits for an event or a result, with the stand's timeouts.
import type { INestApplication } from '@nestjs/common';
import type { Socket } from 'socket.io-client';
import { randomUUIDv7 } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  applyCatchUp,
  catchUp,
  compareSeq,
  type FetchMessagesPage,
  GetMessagesResponse,
  MESSAGE_NEW_EVENT,
  MessageNewEvent,
  MessageResponse,
  mergeMessages,
} from '@app/contracts';
import { RealtimeGateway } from '../../src/modules/realtime/realtime.gateway.js';
import {
  recordEvents,
  waitForDisconnect,
  waitForReconnect,
  withTimeout,
} from './support/events.js';
import { createChannel, getMessages, postMessage } from './support/http.js';
import type { NetworkLink } from './support/network.js';
import { useStand } from './support/stand.js';

const stand = useStand({ instances: ['test-api-1', 'test-api-2'] });
const { apps } = stand;
const one = (): INestApplication => apps[0]!;
const two = (): INestApplication => apps[1]!;

async function post(
  app: INestApplication,
  channelId: string,
  body: string,
  clientMsgId?: string,
): Promise<MessageResponse> {
  const response = await postMessage(app, channelId, body, clientMsgId);
  expect(response.status).toBe(201);
  return MessageResponse.parse(await response.json());
}

/** The web client's fetcher, minus the browser: GET on `app`, parsed with the contracts schema. */
function fetcherOn(app: INestApplication, channelId: string): FetchMessagesPage {
  return async (query) => {
    const response = await getMessages(app, channelId, query);
    if (!response.ok) throw new Error(`GET messages failed with ${String(response.status)}`);
    return GetMessagesResponse.parse(await response.json());
  };
}

const seqs = (messages: readonly MessageResponse[]): string[] => messages.map((m) => m.seq);
const ids = (messages: readonly MessageResponse[]): string[] => messages.map((m) => m.id);
const range = (from: number, to: number): string[] =>
  Array.from({ length: to - from + 1 }, (_, i) => String(from + i));

/** Resolves with the reason instance `app` gives when the server side of `client` goes away. */
function serverDisconnectOf(app: INestApplication, client: Socket): Promise<string> {
  const id = client.id;
  const socket =
    id === undefined ? undefined : app.get(RealtimeGateway).server.sockets.sockets.get(id);
  if (!socket) throw new Error(`No server socket for ${String(id)} on ${stand.instanceIdOf(app)}`);
  return new Promise((resolve) => {
    socket.once('disconnect', resolve);
  });
}

/**
 * Cuts B's link the way a network does and waits until both ends have noticed. Proves it is not
 * a clean disconnect: the server reason is `transport close` (a clean one is `client namespace
 * disconnect`), and B is still `active`, so socket.io is reconnecting it by itself.
 */
async function dropNetwork(link: NetworkLink, b: Socket): Promise<void> {
  // The server socket first: it throws at once if B is not there, before any wait is pending.
  const serverReason = serverDisconnectOf(two(), b);
  const clientReason = waitForDisconnect(b);
  link.drop();
  const [client, server] = await Promise.all([
    clientReason,
    withTimeout(serverReason, 'the server side of B to disconnect'),
  ]);
  expect(client).toMatch(/^transport (close|error)$/);
  expect(server).toBe('transport close');
  expect(b.active).toBe(true);
}

/** Brings the link back and waits for B's own reconnect, to instance 2 again (the link's app). */
async function restoreNetwork(link: NetworkLink, b: Socket): Promise<void> {
  const back = waitForReconnect(b);
  link.restore();
  await back;
  expect(two().get(RealtimeGateway).server.sockets.sockets.has(b.id!)).toBe(true);
}

/**
 * A client straight on instance 2 (no link) that records `message:new`. Once it has seen the
 * offline messages, instance 2's stream reader has handed them out, so B's socket, which joins the
 * room only after the reconnect, can no longer get them live. Without it, a late reader on
 * instance 2 could deliver an "offline" message to the reconnected B.
 */
async function watchInstanceTwo(label: string) {
  const watcher = await stand.connect(two(), label);
  return recordEvents(watcher, MESSAGE_NEW_EVENT, MessageNewEvent.parse);
}

describe('phase 2 exit: B offline, A sends 5 (UL-133)', () => {
  it('B gets exactly the 5 it missed, in seq order, without duplicates', async () => {
    const channelId = await createChannel(stand.prisma);
    const a = await stand.connect(one(), 'A');
    const link = await stand.link(two());
    const b = await stand.connect(two(), 'B', { through: link });
    const onTwo = await watchInstanceTwo('watcher on instance 2');
    const fetchOnTwo = fetcherOn(two(), channelId);

    // B is up to date: two messages, its initial load, both also live.
    const aLive = recordEvents(a, MESSAGE_NEW_EVENT, MessageNewEvent.parse);
    const bLive = recordEvents(b, MESSAGE_NEW_EVENT, MessageNewEvent.parse);
    const earlier = [await post(one(), channelId, 'm1'), await post(one(), channelId, 'm2')];
    await bLive.waitForCount(2);
    let feed = applyCatchUp([], await catchUp([], fetchOnTwo));
    feed = mergeMessages(
      feed,
      bLive.events.map((event) => event.message),
    );
    expect(feed).toEqual(earlier);
    bLive.stop();

    await dropNetwork(link, b);

    // A sends five at once while B is gone; only their seq says their order. A on instance 1 and
    // the watcher on instance 2 get all seven, so instance 2 handed the five out while B was away.
    const sent = await Promise.all(range(1, 5).map((i) => post(one(), channelId, `offline ${i}`)));
    const allIds = new Set([...ids(earlier), ...ids(sent)]);
    await aLive.waitForCount(7);
    await onTwo.waitForCount(7);
    expect(new Set(aLive.events.map((event) => event.message.id))).toEqual(allIds);
    expect(new Set(onTwo.events.map((event) => event.message.id))).toEqual(allIds);

    await restoreNetwork(link, b);

    // B's catch-up: the messages after its gapless run, from instance 2.
    const result = await catchUp(feed, fetchOnTwo);
    expect(result.kind).toBe('append');
    const before = feed;
    feed = applyCatchUp(feed, result);

    const received = feed.slice(before.length);
    expect(received).toHaveLength(5);
    expect(seqs(received)).toEqual(range(3, 7));
    expect(new Set(ids(received))).toEqual(new Set(ids(sent)));
    expect(new Set(ids(feed)).size).toBe(feed.length);
    expect(seqs(feed)).toEqual(range(1, 7));
    expect(feed.slice(0, 2)).toEqual(earlier);
  });

  it('a message that comes both live and in the catch-up page is one row', async () => {
    const channelId = await createChannel(stand.prisma);
    const link = await stand.link(two());
    const b = await stand.connect(two(), 'B', { through: link });
    const onTwo = await watchInstanceTwo('watcher on instance 2');
    const fetchOnTwo = fetcherOn(two(), channelId);

    let feed = applyCatchUp([], await catchUp([], fetchOnTwo));
    expect(feed).toEqual([]);
    const first = await post(one(), channelId, 'm1');
    feed = applyCatchUp(feed, await catchUp(feed, fetchOnTwo));
    expect(feed).toEqual([first]);

    await dropNetwork(link, b);
    const offline = await Promise.all(
      range(1, 4).map((i) => post(one(), channelId, `offline ${i}`)),
    );
    await onTwo.waitForCount(5);
    await restoreNetwork(link, b);

    // The fifth is sent once B is back and reaches it live before B's catch-up GET: it sits above
    // the hole (seq 2..5) and is in the page too. Dedup by id keeps one copy.
    const bLive = recordEvents(b, MESSAGE_NEW_EVENT, MessageNewEvent.parse);
    const fifth = await post(one(), channelId, 'after reconnect');
    const [event] = await bLive.waitForCount(1);
    expect(event!.message).toEqual(fifth);
    feed = mergeMessages(feed, [event!.message]);
    expect(seqs(feed)).toEqual(['1', '6']);

    const result = await catchUp(feed, fetchOnTwo);
    expect(result).toEqual({ kind: 'append', messages: [...[...offline].sort(compareSeq), fifth] });
    feed = applyCatchUp(feed, result);

    expect(seqs(feed)).toEqual(range(1, 6));
    expect(new Set(ids(feed)).size).toBe(6);
    expect(bLive.events).toHaveLength(1);
  });
});

describe('phase 2 exit: retry with the same clientMsgId (UL-133)', () => {
  it('a retry on the other instance returns the same message and sends no second event', async () => {
    const channelId = await createChannel(stand.prisma);
    const b = await stand.connect(two(), 'B');
    const live = recordEvents(b, MESSAGE_NEW_EVENT, MessageNewEvent.parse);
    const clientMsgId = randomUUIDv7();

    // First POST on instance 1; the retry (as after a lost response) on instance 2, so the
    // idempotency holds in the database, not in one process's memory.
    const original = await post(one(), channelId, 'hello', clientMsgId);
    // Wait for its event first: it reaches B through instance 2's stream reader, while the
    // retry and the control below are instance 2's own broadcasts, and the two paths are not
    // ordered against each other.
    await live.waitForCount(1);
    const retried = await post(two(), channelId, 'hello', clientMsgId);
    expect(retried).toEqual(original);
    expect(retried.seq).toBe('1');

    // A control message after the retry, from the instance that served it: one instance's
    // broadcasts reach B in order, so once the control is here, an event of the retry would be too.
    const control = await post(two(), channelId, 'control');
    await live.waitForCount(2);
    expect(live.events.map((e) => e.message)).toEqual([original, control]);

    expect(await stand.prisma.message.count({ where: { channelId } })).toBe(2);
    const channel = await stand.prisma.channel.findUniqueOrThrow({ where: { id: channelId } });
    expect(String(channel.lastSeq)).toBe('2');
  });
});
