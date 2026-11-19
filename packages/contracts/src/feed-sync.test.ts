import { describe, expect, it, vi } from 'vitest';
import {
  applyCatchUp,
  catchUp,
  type CatchUpPage,
  type FetchMessagesPage,
  isSeqGap,
  maxSeq,
  mergeMessages,
  resetFeed,
  syncedSeq,
} from './feed-sync.js';
import type { GetMessagesQueryInput, MessageResponse } from './message.js';

const CHANNEL = '00000000-0000-7000-8000-000000000001';

function msg(seq: number | string, body = `m${String(seq)}`): MessageResponse {
  const n = String(seq).padStart(12, '0');
  return {
    id: `00000000-0000-7000-8000-${n}`,
    seq: String(seq),
    channelId: CHANNEL,
    authorId: '00000000-0000-7000-8000-000000000002',
    clientMsgId: `019a8f00-0000-7000-8000-${n}`,
    body,
    createdAt: '2026-11-18T10:00:00.000Z',
  };
}

const seqs = (list: readonly MessageResponse[]) => list.map((m) => m.seq);

function fetcher(pages: Record<string, CatchUpPage>) {
  return vi.fn<FetchMessagesPage>((query: GetMessagesQueryInput) => {
    const page = pages[query.afterSeq ?? 'latest'];
    if (!page) throw new Error(`unexpected query ${JSON.stringify(query)}`);
    return Promise.resolve(page);
  });
}

describe('mergeMessages', () => {
  it('the same message twice is one row', () => {
    const once = mergeMessages([], [msg(1)]);
    const twice = mergeMessages(once, [msg(1)]);
    expect(seqs(twice)).toEqual(['1']);
  });

  it('a live event that is also in a catch-up page is one row, in seq order', () => {
    const feed = mergeMessages([msg(1), msg(2)], [msg(4)]);
    expect(seqs(mergeMessages(feed, [msg(3), msg(4)]))).toEqual(['1', '2', '3', '4']);
  });

  it('sorts past 2^53 by BigInt', () => {
    const big = mergeMessages([msg('9007199254740993')], [msg('9007199254740992')]);
    expect(seqs(big)).toEqual(['9007199254740992', '9007199254740993']);
  });

  it('returns current itself for an empty incoming list', () => {
    const feed = [msg(1)];
    expect(mergeMessages(feed, [])).toBe(feed);
  });
});

describe('maxSeq', () => {
  it('is null for an empty feed', () => {
    expect(maxSeq([])).toBeNull();
  });

  it('is the greatest seq, compared as BigInt', () => {
    expect(maxSeq([msg(9), msg(10), msg(2)])).toBe('10');
    expect(maxSeq([msg('9007199254740993'), msg('9007199254740992')])).toBe('9007199254740993');
  });
});

describe('syncedSeq', () => {
  it('is null for an empty feed and the end of the gapless run otherwise', () => {
    expect(syncedSeq([])).toBeNull();
    expect(syncedSeq([msg(3), msg(1), msg(2)])).toBe('3');
    expect(syncedSeq([msg(1), msg(2), msg(3), msg(5)])).toBe('3');
    expect(syncedSeq([msg(9), msg(10), msg(12)])).toBe('10');
  });

  it('counts a repeated seq once', () => {
    expect(syncedSeq([msg(1), msg(1), msg(2)])).toBe('2');
  });
});

describe('isSeqGap', () => {
  it('41 then 43 is a gap', () => {
    expect(isSeqGap([msg(40), msg(41)], msg(43))).toBe(true);
  });

  it('the next seq, an old seq and a repeat are not', () => {
    const feed = [msg(40), msg(41)];
    expect(isSeqGap(feed, msg(42))).toBe(false);
    expect(isSeqGap(feed, msg(12))).toBe(false);
    expect(isSeqGap(feed, msg(41))).toBe(false);
  });

  it('an empty feed has no gap unless a load set the baseline', () => {
    expect(isSeqGap([], msg(43))).toBe(false);
    expect(isSeqGap([], msg(1), '0')).toBe(false);
    expect(isSeqGap([], msg(2), '0')).toBe(true);
  });

  it('a message above an existing hole is a gap, even if it is max + 1', () => {
    // 42-44 were lost; the user's own 201 put 45 in the feed.
    const feed = [msg(40), msg(41), msg(45)];
    expect(isSeqGap(feed, msg(46))).toBe(true);
  });
});

describe('catchUp', () => {
  it('an empty feed loads the newest page once, as a reset', async () => {
    const fetchPage = fetcher({ latest: { messages: [msg(1), msg(2)], hasMore: false } });

    const result = await catchUp([], fetchPage);

    expect(result).toEqual({ kind: 'reset', messages: [msg(1), msg(2)] });
    expect(fetchPage.mock.calls).toEqual([[{ limit: '100' }]]);
  });

  it('asks for the messages after the greatest seq and appends them', async () => {
    const fetchPage = fetcher({ '41': { messages: [msg(42), msg(43)], hasMore: false } });

    const result = await catchUp([msg(41), msg(40)], fetchPage);

    expect(result).toEqual({ kind: 'append', messages: [msg(42), msg(43)] });
    expect(fetchPage.mock.calls).toEqual([[{ afterSeq: '41', limit: '100' }]]);
  });

  it('on hasMore it loads the newest page and resets, without paging forward', async () => {
    const fetchPage = fetcher({
      '2': { messages: [msg(3), msg(4)], hasMore: true },
      latest: { messages: [msg(9), msg(10)], hasMore: true },
    });

    const result = await catchUp([msg(1), msg(2)], fetchPage, 2);

    expect(result).toEqual({ kind: 'reset', messages: [msg(9), msg(10)] });
    expect(fetchPage.mock.calls).toEqual([[{ afterSeq: '2', limit: '2' }], [{ limit: '2' }]]);
  });

  it('asks from below a hole, not after the greatest seq (own 201 above the hole)', async () => {
    const fetchPage = fetcher({
      '41': { messages: [msg(42), msg(43), msg(44), msg(45)], hasMore: false },
    });

    const result = await catchUp([msg(40), msg(41), msg(45)], fetchPage);

    expect(fetchPage.mock.calls).toEqual([[{ afterSeq: '41', limit: '100' }]]);
    expect(seqs(applyCatchUp([msg(40), msg(41), msg(45)], result))).toEqual([
      '40',
      '41',
      '42',
      '43',
      '44',
      '45',
    ]);
  });

  it('a failed request rejects and is not retried', async () => {
    const fetchPage = vi.fn<FetchMessagesPage>(() => Promise.reject(new Error('offline')));

    await expect(catchUp([msg(1)], fetchPage)).rejects.toThrow('offline');
    expect(fetchPage).toHaveBeenCalledTimes(1);
  });
});

describe('resetFeed', () => {
  it('keeps live messages newer than the page and drops the older feed', () => {
    const current = [msg(1), msg(2), msg(11)];
    expect(seqs(resetFeed(current, [msg(9), msg(10)]))).toEqual(['9', '10', '11']);
  });

  it('a live message that is also in the page is one row', () => {
    const live = msg(10, 'live copy');
    const result = resetFeed([msg(1), live], [msg(9), msg(10)]);
    expect(seqs(result)).toEqual(['9', '10']);
  });

  it('sorts a page that arrives out of order', () => {
    expect(seqs(resetFeed([], [msg(3), msg(1), msg(2)]))).toEqual(['1', '2', '3']);
  });

  it('an empty page keeps the current feed', () => {
    expect(seqs(resetFeed([msg(1)], []))).toEqual(['1']);
  });
});

describe('applyCatchUp', () => {
  it('append merges, reset resets', () => {
    const feed = [msg(1), msg(2)];
    expect(seqs(applyCatchUp(feed, { kind: 'append', messages: [msg(3), msg(2)] }))).toEqual([
      '1',
      '2',
      '3',
    ]);
    expect(seqs(applyCatchUp(feed, { kind: 'reset', messages: [msg(7)] }))).toEqual(['7']);
  });
});
