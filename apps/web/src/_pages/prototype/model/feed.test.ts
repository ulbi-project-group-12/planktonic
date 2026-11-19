import type { MessageResponse } from '@app/contracts';
import { describe, expect, it } from 'vitest';
import {
  type FeedState,
  feedReducer,
  feedRows,
  initialFeedState,
  mergeMessages,
  PROTOTYPE_CHANNEL_ID,
  type SendFailure,
} from './feed';

const AUTHOR_ID = '00000000-0000-7000-8000-0000000000aa';

/** A complete MessageResponse; the id and clientMsgId derive from a short numeric tag. */
function msg({ id, seq, body }: { id: number; seq: string; body?: string }): MessageResponse {
  const tag = id.toString(16).padStart(12, '0');
  return {
    id: `01900000-0000-7000-8000-${tag}`,
    seq,
    channelId: PROTOTYPE_CHANNEL_ID,
    authorId: AUTHOR_ID,
    clientMsgId: `01900000-0000-7000-9000-${tag}`,
    body: body ?? `message ${String(id)}`,
    createdAt: '2026-11-18T12:00:00.000Z',
  };
}

const seqs = (messages: readonly MessageResponse[]) => messages.map((message) => message.seq);

describe('mergeMessages', () => {
  it('keeps one row when the POST copy is already there and the event copy arrives', () => {
    const postCopy = msg({ id: 1, seq: '3', body: 'hello' });
    const eventCopy = msg({ id: 1, seq: '3', body: 'hello' });
    const merged = mergeMessages([postCopy], [eventCopy]);
    expect(merged).toHaveLength(1);
    expect(merged[0]?.id).toBe(postCopy.id);
  });

  it('keeps one row when the event copy is already there and the POST copy arrives', () => {
    const eventCopy = msg({ id: 1, seq: '3', body: 'hello' });
    const postCopy = msg({ id: 1, seq: '3', body: 'hello' });
    expect(mergeMessages([eventCopy], [postCopy])).toHaveLength(1);
  });

  it('merges history over live rows without duplicates', () => {
    const live = [msg({ id: 5, seq: '5' }), msg({ id: 6, seq: '6' })];
    const history = [1, 2, 3, 4, 5, 6].map((n) => msg({ id: n, seq: String(n) }));
    const merged = mergeMessages(live, history);
    expect(seqs(merged)).toEqual(['1', '2', '3', '4', '5', '6']);
  });

  it('sorts out-of-order seqs ascending', () => {
    const incoming = [msg({ id: 3, seq: '3' }), msg({ id: 1, seq: '1' }), msg({ id: 2, seq: '2' })];
    expect(seqs(mergeMessages([], incoming))).toEqual(['1', '2', '3']);
  });

  it('sorts seqs beyond 2^53 by their exact value', () => {
    const incoming = [
      msg({ id: 1, seq: '10000000000000000' }),
      msg({ id: 2, seq: '9007199254740993' }),
      msg({ id: 3, seq: '9007199254740992' }),
      msg({ id: 4, seq: '9' }),
    ];
    expect(seqs(mergeMessages([], incoming))).toEqual([
      '9',
      '9007199254740992',
      '9007199254740993',
      '10000000000000000',
    ]);
  });

  it('lets a later copy of the same id replace the current one', () => {
    const current = [msg({ id: 1, seq: '1', body: 'old' })];
    const merged = mergeMessages(current, [msg({ id: 1, seq: '1', body: 'new' })]);
    expect(merged).toHaveLength(1);
    expect(merged[0]?.body).toBe('new');
  });

  it('does not mutate its inputs', () => {
    const current = Object.freeze([msg({ id: 2, seq: '2' })]);
    const incoming = Object.freeze([msg({ id: 1, seq: '1' })]);
    const merged = mergeMessages(current, incoming);
    expect(seqs(merged)).toEqual(['1', '2']);
    expect(seqs(current)).toEqual(['2']);
    expect(seqs(incoming)).toEqual(['1']);
    expect(merged).not.toBe(current);
  });

  it('returns the current array itself when nothing comes in', () => {
    const current = [msg({ id: 1, seq: '1' })];
    expect(mergeMessages(current, [])).toBe(current);
  });
});

const KEY_A = '01900000-0000-7000-9000-00000000a001';
const KEY_B = '01900000-0000-7000-9000-00000000b002';
const NO_NETWORK: SendFailure = { retryable: true, reason: 'no connection to the server' };

/** The server's copy of a message this client sent with `clientMsgId`. */
function delivered(clientMsgId: string, id: number, seq: string, body: string): MessageResponse {
  return { ...msg({ id, seq, body }), clientMsgId };
}

function pending(clientMsgId: string, body: string) {
  return { type: 'pending', clientMsgId, body } as const;
}

function failed(clientMsgId: string, failure: SendFailure = NO_NETWORK) {
  return { type: 'failed', clientMsgId, failure } as const;
}

function merge(...messages: MessageResponse[]) {
  return { type: 'merge', messages } as const;
}

describe('feedReducer', () => {
  it('merges the action messages into sent', () => {
    const state: FeedState = { sent: [msg({ id: 2, seq: '2' })], unsent: [] };
    const next = feedReducer(state, merge(msg({ id: 1, seq: '1' })));
    expect(seqs(next.sent)).toEqual(['1', '2']);
    expect(next.unsent).toEqual([]);
  });

  it('appends pending rows in send order', () => {
    let state = feedReducer(initialFeedState, pending(KEY_A, 'a'));
    state = feedReducer(state, pending(KEY_B, 'b'));
    expect(state.unsent).toEqual([
      { clientMsgId: KEY_A, body: 'a', status: 'pending' },
      { clientMsgId: KEY_B, body: 'b', status: 'pending' },
    ]);
  });

  it('flips a row to failed and keeps its body', () => {
    let state = feedReducer(initialFeedState, pending(KEY_A, 'a'));
    state = feedReducer(state, failed(KEY_A));
    expect(state.unsent).toEqual([
      { clientMsgId: KEY_A, body: 'a', status: 'failed', failure: NO_NETWORK },
    ]);
  });

  it('flips a failed row back to pending in place on retry', () => {
    let state = feedReducer(initialFeedState, pending(KEY_A, 'a'));
    state = feedReducer(state, pending(KEY_B, 'b'));
    state = feedReducer(state, failed(KEY_A));
    state = feedReducer(state, pending(KEY_A, 'ignored'));
    expect(state.unsent).toEqual([
      { clientMsgId: KEY_A, body: 'a', status: 'pending' },
      { clientMsgId: KEY_B, body: 'b', status: 'pending' },
    ]);
  });

  it('drops only the unsent row whose clientMsgId a merged message carries', () => {
    let state = feedReducer(initialFeedState, pending(KEY_A, 'a'));
    state = feedReducer(state, pending(KEY_B, 'b'));
    state = feedReducer(state, merge(delivered(KEY_A, 1, '1', 'a')));
    expect(seqs(state.sent)).toEqual(['1']);
    expect(state.unsent).toEqual([{ clientMsgId: KEY_B, body: 'b', status: 'pending' }]);
  });

  it('does not mutate its input state', () => {
    const state = Object.freeze({
      sent: Object.freeze([msg({ id: 1, seq: '1' })]),
      unsent: Object.freeze([{ clientMsgId: KEY_A, body: 'a', status: 'pending' } as const]),
    });
    feedReducer(state, failed(KEY_A));
    feedReducer(state, pending(KEY_B, 'b'));
    feedReducer(state, merge(delivered(KEY_A, 2, '2', 'a')));
    expect(state.unsent).toEqual([{ clientMsgId: KEY_A, body: 'a', status: 'pending' }]);
    expect(seqs(state.sent)).toEqual(['1']);
  });
});

describe('feedRows', () => {
  it('lists sent rows by seq, then unsent rows in send order, with distinct keys', () => {
    const first = msg({ id: 1, seq: '1', body: 'first' });
    let state = feedReducer(initialFeedState, merge(first));
    state = feedReducer(state, pending(KEY_A, 'a'));
    state = feedReducer(state, pending(KEY_B, 'b'));
    state = feedReducer(state, failed(KEY_B));
    expect(feedRows(state)).toEqual([
      { status: 'sent', key: first.id, message: first },
      { clientMsgId: KEY_A, body: 'a', status: 'pending', key: `unsent:${KEY_A}` },
      {
        clientMsgId: KEY_B,
        body: 'b',
        status: 'failed',
        failure: NO_NETWORK,
        key: `unsent:${KEY_B}`,
      },
    ]);
  });

  it('keeps an unsent row last after a sent message with a higher seq arrives', () => {
    let state = feedReducer(initialFeedState, pending(KEY_A, 'a'));
    state = feedReducer(state, merge(msg({ id: 9, seq: '9', body: 'later' })));
    expect(feedRows(state).map((row) => row.status)).toEqual(['sent', 'pending']);
  });
});
