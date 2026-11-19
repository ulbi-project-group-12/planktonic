import type { CatchUpPage, FetchMessagesPage, MessageResponse } from '@app/contracts';
import { describe, expect, it, vi } from 'vitest';
import { PROTOTYPE_CHANNEL_ID } from './feed';
import { createFeedStore, createFeedSync } from './feed-sync';

function msg(seq: number): MessageResponse {
  const tag = seq.toString(16).padStart(12, '0');
  return {
    id: `01900000-0000-7000-8000-${tag}`,
    seq: String(seq),
    channelId: PROTOTYPE_CHANNEL_ID,
    authorId: '00000000-0000-7000-8000-0000000000aa',
    clientMsgId: `01900000-0000-7000-9000-${tag}`,
    body: `m${String(seq)}`,
    createdAt: '2026-11-18T12:00:00.000Z',
  };
}

const range = (from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, i) => msg(from + i));

/** A fake api over `server()`: the newest page, or what comes after `afterSeq`. */
function api(server: () => MessageResponse[]) {
  return vi.fn<FetchMessagesPage>((query) => {
    const limit = Number(query.limit ?? '100');
    const all = server();
    if (query.afterSeq === undefined) {
      return Promise.resolve({ messages: all.slice(-limit), hasMore: all.length > limit });
    }
    const after = all.filter((m) => BigInt(m.seq) > BigInt(query.afterSeq ?? '0'));
    return Promise.resolve({ messages: after.slice(0, limit), hasMore: after.length > limit });
  });
}

function setup(server: () => MessageResponse[], limit?: number) {
  const feed = createFeedStore();
  const fetchPage = api(server);
  const controller = new AbortController();
  const onResult = vi.fn();
  const sync = createFeedSync({
    feed,
    fetchPage,
    signal: controller.signal,
    onResult,
    ...(limit === undefined ? {} : { limit }),
  });
  const seqs = () => feed.sent().map((m) => Number(m.seq));
  return { feed, fetchPage, controller, onResult, sync, seqs };
}

describe('createFeedSync', () => {
  it('first run loads the newest page; the next asks after the last seq', async () => {
    let server = range(1, 2);
    const { sync, fetchPage, seqs } = setup(() => server);

    await sync.run();
    server = range(1, 4);
    await sync.run();

    expect(seqs()).toEqual([1, 2, 3, 4]);
    expect(fetchPage.mock.calls.map(([q]) => q)).toEqual([
      { limit: '100' },
      { afterSeq: '2', limit: '100' },
    ]);
  });

  it('calls during a pass share it and make exactly one more pass', async () => {
    let server = range(1, 1);
    const { sync, fetchPage, seqs } = setup(() => server);
    await sync.run();
    server = range(1, 3);

    const first = sync.run();
    const second = sync.run();
    const third = sync.run();
    expect(second).toBe(first);
    expect(third).toBe(first);
    await first;

    expect(fetchPage).toHaveBeenCalledTimes(3);
    expect(seqs()).toEqual([1, 2, 3]);
  });

  it('a gap is not merged and reports gap; the catch-up brings the missing one', async () => {
    let server = range(1, 41);
    const { sync, seqs } = setup(() => server);
    await sync.run();
    server = range(1, 43);

    expect(sync.receive(msg(43))).toBe('gap');
    expect(seqs().at(-1)).toBe(41);
    await sync.run();
    expect(seqs().slice(-3)).toEqual([41, 42, 43]);
  });

  it('the next seq and a repeat are merged, a repeat as one row', () => {
    const { sync, seqs } = setup(() => []);
    expect(sync.receive(msg(1))).toBe('merged');
    expect(sync.receive(msg(1))).toBe('merged');
    expect(seqs()).toEqual([1]);
  });

  it('before the first load, a live message is merged and does not become the baseline', async () => {
    const server = range(1, 43);
    const { sync, fetchPage, seqs } = setup(() => server);

    expect(sync.receive(msg(43))).toBe('merged');
    await sync.run();

    expect(fetchPage.mock.calls[0]?.[0]).toEqual({ limit: '100' });
    expect(seqs()).toHaveLength(43);
  });

  it('hasMore resets the feed to the newest page', async () => {
    let server = range(1, 2);
    const { sync, seqs } = setup(() => server, 3);
    await sync.run();
    server = range(1, 10);

    await sync.run();
    expect(seqs()).toEqual([8, 9, 10]);
  });

  it('keeps unsent rows through a reset', async () => {
    let server = range(1, 2);
    const { feed, sync } = setup(() => server, 3);
    await sync.run();
    feed.dispatch({
      type: 'pending',
      clientMsgId: '01900000-0000-7000-9000-00000000ffff',
      body: 'x',
    });
    server = range(1, 10);

    await sync.run();
    expect(feed.store.getState().feed.unsent).toHaveLength(1);
  });

  it('a failed pass reports the error and never rejects; the next run recovers', async () => {
    const { sync, fetchPage, onResult, seqs } = setup(() => range(1, 1));
    fetchPage.mockRejectedValueOnce(new Error('offline'));

    await expect(sync.run()).resolves.toBeUndefined();
    expect(onResult).toHaveBeenLastCalledWith({ ok: false, error: new Error('offline') });
    await sync.run();
    expect(onResult).toHaveBeenLastCalledWith({ ok: true });
    expect(seqs()).toEqual([1]);
  });

  it('dispatches nothing after abort', async () => {
    let resolve!: (page: CatchUpPage) => void;
    const { sync, fetchPage, controller, onResult, seqs } = setup(() => []);
    fetchPage.mockImplementationOnce(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    const running = sync.run();
    controller.abort();
    resolve({ messages: range(1, 2), hasMore: false });
    await running;

    expect(seqs()).toEqual([]);
    expect(onResult).not.toHaveBeenCalled();
  });
});
