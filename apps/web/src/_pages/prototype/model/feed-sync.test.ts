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

  it('a gap is merged at once and asks for a catch-up from below it, which fills it', async () => {
    let server = range(1, 41);
    const { sync, fetchPage, seqs } = setup(() => server);
    await sync.run();
    server = range(1, 43);

    expect(sync.receive(msg(43))).toBe('catch-up');
    expect(seqs().slice(-2)).toEqual([41, 43]);
    await sync.run();
    expect(seqs().slice(-3)).toEqual([41, 42, 43]);
    expect(fetchPage.mock.calls.at(-1)?.[0]).toEqual({ afterSeq: '41', limit: '100' });
  });

  it("the user's own 201 above a hole asks for the catch-up too (CR-01)", async () => {
    let server = range(1, 41);
    const { sync, seqs } = setup(() => server);
    await sync.run();
    // 42-44 came while the socket was away; the user's own POST got 45.
    server = range(1, 45);

    expect(sync.receive(msg(45))).toBe('catch-up');
    await sync.run();
    expect(seqs().slice(-5)).toEqual([41, 42, 43, 44, 45]);
  });

  it('a reconnect after an own 201 above a hole asks from below the hole', async () => {
    let server = range(1, 41);
    const { sync, fetchPage } = setup(() => server);
    await sync.run();
    server = range(1, 45);
    sync.receive(msg(45));

    await sync.run();
    expect(fetchPage.mock.calls.at(-1)?.[0]).toEqual({ afterSeq: '41', limit: '100' });
  });

  it('the next seq and a repeat are merged without a catch-up, a repeat as one row', async () => {
    const { sync, seqs } = setup(() => range(1, 1));
    await sync.run();
    expect(sync.receive(msg(2))).toBe('ok');
    expect(sync.receive(msg(2))).toBe('ok');
    expect(seqs()).toEqual([1, 2]);
  });

  it('before the first load, a live message is merged and does not become the baseline', async () => {
    const server = range(1, 43);
    const { sync, fetchPage, seqs } = setup(() => server);

    expect(sync.receive(msg(43))).toBe('ok');
    await sync.run();

    expect(fetchPage.mock.calls[0]?.[0]).toEqual({ limit: '100' });
    expect(seqs()).toHaveLength(43);
  });

  it('an empty channel at load: a live 2 means 1 was lost, and the catch-up brings it (WR-02)', async () => {
    let server: MessageResponse[] = [];
    const { sync, fetchPage, seqs } = setup(() => server);
    await sync.run();
    server = range(1, 2);

    expect(sync.receive(msg(2))).toBe('catch-up');
    await sync.run();
    expect(seqs()).toEqual([1, 2]);
    expect(fetchPage.mock.calls.at(-1)?.[0]).toEqual({ limit: '100' });
  });

  it('an empty channel at load: a live 1 is just merged', async () => {
    const { sync, seqs } = setup(() => []);
    await sync.run();
    expect(sync.receive(msg(1))).toBe('ok');
    expect(seqs()).toEqual([1]);
  });

  it('a hole made while a pass runs is filled by one follow-up pass, not one per event', async () => {
    let server = range(1, 2);
    const { sync, fetchPage, seqs } = setup(() => server);
    await sync.run();
    let release!: () => void;
    const gate = new Promise<void>((done) => {
      release = done;
    });
    // The catch-up's GET is answered with the server as it was when it was sent (up to 4).
    fetchPage.mockImplementationOnce(async (query) => {
      const answer = { messages: range(3, 4), hasMore: false };
      expect(query.afterSeq).toBe('2');
      await gate;
      return answer;
    });
    server = range(1, 4);
    const running = sync.run();
    // While it is in flight, 6 and 7 arrive live (5 was lost): no new catch-up is asked for.
    server = range(1, 7);
    expect(sync.receive(msg(6))).toBe('ok');
    expect(sync.receive(msg(7))).toBe('ok');
    release();
    await running;

    expect(seqs()).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(fetchPage).toHaveBeenCalledTimes(3);
  });

  it('a run requested while a pass fails still gets its pass (WR-01)', async () => {
    const { sync, fetchPage, onResult, seqs } = setup(() => range(1, 2));
    let fail!: (error: Error) => void;
    fetchPage.mockImplementationOnce(
      () =>
        new Promise((_, reject) => {
          fail = reject;
        }),
    );
    const first = sync.run();
    // A reconnect while the GET hangs.
    void sync.run();
    fail(new Error('timeout'));
    await first;

    expect(fetchPage).toHaveBeenCalledTimes(2);
    expect(seqs()).toEqual([1, 2]);
    expect(onResult).toHaveBeenLastCalledWith({ ok: true });
  });

  it('after a failed pass, a hole waits for Retry instead of a GET per live message', async () => {
    let server = range(1, 2);
    const { sync, fetchPage } = setup(() => server);
    await sync.run();
    fetchPage.mockRejectedValueOnce(new Error('503'));
    await sync.run();
    server = range(1, 6);

    expect(sync.receive(msg(5))).toBe('ok');
    expect(sync.receive(msg(6))).toBe('ok');
    expect(fetchPage).toHaveBeenCalledTimes(2);
    await sync.run();
    expect(sync.receive(msg(7))).toBe('ok');
  });

  it('a run() right after a pass settles starts a new pass (IN-01)', async () => {
    const { sync, fetchPage } = setup(() => range(1, 1));
    const first = sync.run();
    await first;
    const second = sync.run();
    expect(second).not.toBe(first);
    await second;
    expect(fetchPage).toHaveBeenCalledTimes(2);
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
