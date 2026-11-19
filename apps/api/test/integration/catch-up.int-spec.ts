// UL-130: `GET messages?afterSeq=&limit=` and `hasMore` against Postgres, then the client's own
// catch-up (`catchUp` from @app/contracts, the code the web feed runs) over HTTP after a client
// missed messages while it was disconnected. Run with `pnpm test:integration`.
//
// Connection State Recovery is off (STACK §4.4): what a socket misses while it is away is never
// replayed. The client fills the gap through REST, which goes through the normal access path.
import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import {
  applyCatchUp,
  catchUp,
  type FetchMessagesPage,
  GetMessagesResponse,
  MESSAGE_NEW_EVENT,
  MessageNewEvent,
  MessageResponse,
  mergeMessages,
} from '@app/contracts';
import { recordEvents } from './support/events.js';
import { createChannel, getMessages, postMessage } from './support/http.js';
import { useStand } from './support/stand.js';

const stand = useStand({ instances: ['test-api-1', 'test-api-2'] });
const { apps } = stand;

/** `count` messages posted one after another, so their seq is 1..count in body order. */
async function postMany(channelId: string, count: number, from = 1): Promise<MessageResponse[]> {
  const sent: MessageResponse[] = [];
  for (let i = from; i < from + count; i++) {
    const response = await postMessage(apps[0]!, channelId, `m${String(i)}`);
    expect(response.status).toBe(201);
    sent.push(MessageResponse.parse(await response.json()));
  }
  return sent;
}

async function page(channelId: string, query: Record<string, string> = {}) {
  const response = await getMessages(apps[0]!, channelId, query);
  expect(response.status).toBe(200);
  const body = GetMessagesResponse.parse(await response.json());
  return { seqs: body.messages.map((m) => m.seq), hasMore: body.hasMore };
}

/** The web client's fetcher, minus the browser: GET on `app`, parsed with the contracts schema. */
function fetcherOn(app: INestApplication, channelId: string): FetchMessagesPage {
  return async (query) => {
    const response = await getMessages(app, channelId, query);
    if (!response.ok) throw new Error(`GET messages failed with ${String(response.status)}`);
    return GetMessagesResponse.parse(await response.json());
  };
}

const range = (from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, i) => String(from + i));

describe('GET messages pages (UL-130)', () => {
  it('without afterSeq: the newest page, oldest first; hasMore says older ones exist', async () => {
    const channelId = await createChannel(stand.prisma);
    await postMany(channelId, 3);

    expect(await page(channelId)).toEqual({ seqs: ['1', '2', '3'], hasMore: false });
    expect(await page(channelId, { limit: '3' })).toEqual({
      seqs: ['1', '2', '3'],
      hasMore: false,
    });
    expect(await page(channelId, { limit: '2' })).toEqual({ seqs: ['2', '3'], hasMore: true });
  });

  it('afterSeq in the middle returns the rest, ascending', async () => {
    const channelId = await createChannel(stand.prisma);
    await postMany(channelId, 5);

    expect(await page(channelId, { afterSeq: '2' })).toEqual({
      seqs: ['3', '4', '5'],
      hasMore: false,
    });
    expect(await page(channelId, { afterSeq: '0' })).toEqual({ seqs: range(1, 5), hasMore: false });
  });

  it('afterSeq at the last message (or past it) is an empty page without more', async () => {
    const channelId = await createChannel(stand.prisma);
    await postMany(channelId, 2);

    expect(await page(channelId, { afterSeq: '2' })).toEqual({ seqs: [], hasMore: false });
    expect(await page(channelId, { afterSeq: '99' })).toEqual({ seqs: [], hasMore: false });
  });

  it('an empty channel is an empty page without more', async () => {
    const channelId = await createChannel(stand.prisma);

    expect(await page(channelId)).toEqual({ seqs: [], hasMore: false });
    expect(await page(channelId, { afterSeq: '0' })).toEqual({ seqs: [], hasMore: false });
  });

  it('hasMore at the limit boundary: exactly limit left is false, limit + 1 is true', async () => {
    const channelId = await createChannel(stand.prisma);
    await postMany(channelId, 5);

    // After seq 2, three messages are left.
    expect(await page(channelId, { afterSeq: '2', limit: '3' })).toEqual({
      seqs: ['3', '4', '5'],
      hasMore: false,
    });
    expect(await page(channelId, { afterSeq: '2', limit: '2' })).toEqual({
      seqs: ['3', '4'],
      hasMore: true,
    });
  });

  it('the default and maximum page is 100', async () => {
    const channelId = await createChannel(stand.prisma);
    // Concurrent posts still get gapless seq 1..101 (UL-125).
    await Promise.all(
      Array.from({ length: 101 }, (_, i) => postMessage(apps[0]!, channelId, `bulk ${String(i)}`)),
    );

    expect(await page(channelId, { afterSeq: '0' })).toEqual({
      seqs: range(1, 100),
      hasMore: true,
    });
    expect(await page(channelId)).toEqual({ seqs: range(2, 101), hasMore: true });
    expect((await getMessages(apps[0]!, channelId, { limit: '101' })).status).toBe(400);
  });

  it.each([{ afterSeq: 'abc' }, { afterSeq: '-1' }, { afterSeq: '1e2' }, { limit: '0' }])(
    'returns 400 for %j and reads nothing',
    async (query) => {
      const channelId = await createChannel(stand.prisma);

      const response = await getMessages(apps[0]!, channelId, query);

      expect(response.status).toBe(400);
    },
  );

  it('a missing channel is 404 with afterSeq too', async () => {
    expect((await getMessages(apps[0]!, randomUUID(), { afterSeq: '1' })).status).toBe(404);
  });
});

describe('catch-up after a reconnect (UL-130, shared client logic)', () => {
  it('B misses 5 messages while away and gets all of them, in order, once', async () => {
    const channelId = await createChannel(stand.prisma);
    const before = await postMany(channelId, 2);

    // B on instance 2 has the first two (its initial load) and leaves.
    const away = await stand.connect(apps[1]!, 'B');
    let feed = applyCatchUp([], await catchUp([], fetcherOn(apps[1]!, channelId)));
    expect(feed).toEqual(before);
    stand.disconnect(away);

    // A sends five while B is gone; no socket of B's receives them.
    const missed = await postMany(channelId, 5, 3);

    // B comes back (a new socket, as after a network loss) and catches up from seq 2.
    const back = await stand.connect(apps[1]!, 'B again');
    const live = recordEvents(back, MESSAGE_NEW_EVENT, MessageNewEvent.parse);
    const result = await catchUp(feed, fetcherOn(apps[1]!, channelId));
    expect(result).toEqual({ kind: 'append', messages: missed });
    feed = applyCatchUp(feed, result);
    expect(feed.map((m) => m.seq)).toEqual(range(1, 7));

    // A message sent right after the catch-up arrives live; the same event delivered twice, or
    // again in a later page, is one row.
    const [next] = await postMany(channelId, 1, 8);
    const [event] = await live.waitForCount(1);
    feed = mergeMessages(feed, [event!.message]);
    feed = mergeMessages(feed, [event!.message]);
    feed = applyCatchUp(feed, await catchUp(feed.slice(0, 6), fetcherOn(apps[1]!, channelId)));
    expect(feed.map((m) => m.seq)).toEqual(range(1, 8));
    expect(feed.at(-1)).toEqual(next);
  });

  it('B missed more than a page: hasMore resets the feed to the newest page', async () => {
    const channelId = await createChannel(stand.prisma);
    await postMany(channelId, 2);
    const fetchPage = fetcherOn(apps[1]!, channelId);
    const feed = applyCatchUp([], await catchUp([], fetchPage, 2));

    await postMany(channelId, 5, 3);

    const result = await catchUp(feed, fetchPage, 2);
    expect(result.kind).toBe('reset');
    expect(applyCatchUp(feed, result).map((m) => m.seq)).toEqual(['6', '7']);
  });
});
