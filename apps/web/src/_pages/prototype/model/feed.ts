import { type MessageResponse, mergeMessages, resetFeed } from '@app/contracts';

/** The channel `pnpm db:seed` creates; the prototype page shows only this one. */
export const PROTOTYPE_CHANNEL_ID = '00000000-0000-7000-8000-000000000001';

// The merge by `id` (UL-128) lives in @app/contracts with the rest of the catch-up logic (UL-130),
// so the api's tests run the same code. Re-exported for this slice's callers.
export { mergeMessages };

/** Why a send did not go through, as shown on its row. */
export interface SendFailure {
  readonly retryable: boolean;
  readonly reason: string;
}

/**
 * A message this client sent that the server has not confirmed yet. Client state only: it has no
 * `id` or `seq`, and the status is not a contracts field (UL-131).
 */
export type UnsentRow =
  | { readonly clientMsgId: string; readonly body: string; readonly status: 'pending' }
  | {
      readonly clientMsgId: string;
      readonly body: string;
      readonly status: 'failed';
      readonly failure: SendFailure;
    };

export interface FeedState {
  /** Confirmed messages: the union by `id`, sorted by `seq` (see `mergeMessages`). */
  readonly sent: readonly MessageResponse[];
  /**
   * Local rows in send order, rendered after every sent row. They live in memory only (durable
   * storage is UL-193, phase 5) and nothing retries them automatically. They never take part in
   * a `seq` computation: the catch-up after the last known seq (UL-130) reads `sent` only.
   */
  readonly unsent: readonly UnsentRow[];
}

export const initialFeedState: FeedState = { sent: [], unsent: [] };

export type FeedAction =
  | { type: 'merge'; messages: readonly MessageResponse[] }
  /**
   * The catch-up fell too far behind (`hasMore`) or this is the first load: `sent` becomes the
   * newest page plus any live message newer than it (`resetFeed`). Unsent rows stay.
   */
  | { type: 'reset'; messages: readonly MessageResponse[] }
  | { type: 'pending'; clientMsgId: string; body: string }
  | { type: 'failed'; clientMsgId: string; failure: SendFailure };

/**
 * The match key for a `clientMsgId`. The server stores it lower-cased (UL-126), so a copy from the
 * wire may differ in case from the key this client made.
 */
function keyOf(clientMsgId: string): string {
  return clientMsgId.toLowerCase();
}

/** `rows` with the row at `index` swapped for `row`, as a new array. */
function replaceAt(
  rows: readonly UnsentRow[],
  index: number,
  row: UnsentRow,
): readonly UnsentRow[] {
  const next = [...rows];
  next[index] = row;
  return next;
}

/**
 * `state` with `sent` replaced, and the unsent rows that `delivered` confirms removed (matched by
 * `clientMsgId`). The same `state` comes back when neither changed.
 */
function withSent(
  state: FeedState,
  sent: readonly MessageResponse[],
  delivered: readonly MessageResponse[],
): FeedState {
  const keys = new Set(delivered.map((message) => keyOf(message.clientMsgId)));
  const unsent = state.unsent.some((row) => keys.has(keyOf(row.clientMsgId)))
    ? state.unsent.filter((row) => !keys.has(keyOf(row.clientMsgId)))
    : state.unsent;
  if (sent === state.sent && unsent === state.unsent) return state;
  return { sent, unsent };
}

/**
 * Every history load, live event, `POST` result and send status goes through here. Rows are keyed
 * by `clientMsgId`, so the local pending row, the `POST` 201 and `message:new` end in one row in any
 * arrival order, and a failure that lands after delivery changes nothing. Inputs are never mutated
 * and the same `state` comes back when nothing changes.
 */
export function feedReducer(state: FeedState, action: FeedAction): FeedState {
  switch (action.type) {
    case 'merge':
      return withSent(state, mergeMessages(state.sent, action.messages), action.messages);
    case 'reset':
      return withSent(state, resetFeed(state.sent, action.messages), action.messages);
    case 'pending': {
      const { clientMsgId, body } = action;
      const key = keyOf(clientMsgId);
      if (state.sent.some((message) => keyOf(message.clientMsgId) === key)) return state;
      const index = state.unsent.findIndex((row) => keyOf(row.clientMsgId) === key);
      if (index === -1) {
        return { ...state, unsent: [...state.unsent, { clientMsgId, body, status: 'pending' }] };
      }
      const row = state.unsent[index];
      if (!row || row.status === 'pending') return state;
      // A retry keeps the row's own key, body and position.
      const retried: UnsentRow = {
        clientMsgId: row.clientMsgId,
        body: row.body,
        status: 'pending',
      };
      return { ...state, unsent: replaceAt(state.unsent, index, retried) };
    }
    case 'failed': {
      const index = state.unsent.findIndex(
        (row) => keyOf(row.clientMsgId) === keyOf(action.clientMsgId),
      );
      const row = state.unsent[index];
      // Gone: the 201 or message:new already won, so the failure is stale.
      if (index === -1 || !row) return state;
      const failed: UnsentRow = {
        clientMsgId: row.clientMsgId,
        body: row.body,
        status: 'failed',
        failure: action.failure,
      };
      return { ...state, unsent: replaceAt(state.unsent, index, failed) };
    }
  }
}

/** One rendered row of the Messages list. */
export type FeedRow =
  | { readonly status: 'sent'; readonly key: string; readonly message: MessageResponse }
  | (UnsentRow & { readonly key: string });

/**
 * Sent rows in `seq` order (keyed by message id), then unsent rows in send order. The `unsent:`
 * prefix keeps an unsent key from ever colliding with a message id.
 */
export function feedRows(state: FeedState): readonly FeedRow[] {
  return [
    ...state.sent.map((message): FeedRow => ({ status: 'sent', key: message.id, message })),
    ...state.unsent.map((row): FeedRow => ({ ...row, key: `unsent:${row.clientMsgId}` })),
  ];
}

/** What the failed row says, read out by the "Send status" live region. */
function failureText(failure: SendFailure): string {
  const hint = failure.retryable ? 'Press Retry to try again.' : 'Retrying will not help.';
  return `Message not sent: ${failure.reason}. ${hint}`;
}

/**
 * What changed for this client's own sends between two feed states, as one sentence for a screen
 * reader, or `null` when nothing did. It is derived from the feed itself, so it always matches the
 * rows: a failure the reducer ignored (the message was already delivered) is never announced, and a
 * failed row that `message:new` or history confirms later is announced as sent. When one step
 * changes several rows, the last change wins.
 */
export function sendAnnouncement(prev: FeedState, next: FeedState): string | null {
  if (prev.unsent === next.unsent) return null;
  let said: string | null = null;
  const before = new Map(prev.unsent.map((row) => [keyOf(row.clientMsgId), row]));
  const after = new Set(next.unsent.map((row) => keyOf(row.clientMsgId)));
  for (const row of prev.unsent) {
    const key = keyOf(row.clientMsgId);
    if (!after.has(key) && next.sent.some((message) => keyOf(message.clientMsgId) === key)) {
      said = 'Message sent.';
    }
  }
  for (const row of next.unsent) {
    const old = before.get(keyOf(row.clientMsgId));
    if (old?.status === row.status && (row.status !== 'failed' || old === row)) continue;
    said = row.status === 'pending' ? 'Sending message…' : failureText(row.failure);
  }
  return said;
}

/**
 * The feed plus the last thing the "Send status" live region said. `announcementId` grows with every
 * announcement, so the page can render each one as a new node: two identical sentences in a row
 * (two sends confirmed, two equal failures) would otherwise leave the region's text unchanged and a
 * screen reader silent.
 */
export interface AnnouncedFeed {
  readonly feed: FeedState;
  readonly announcement: string;
  readonly announcementId: number;
}

export const initialAnnouncedFeed: AnnouncedFeed = {
  feed: initialFeedState,
  announcement: '',
  announcementId: 0,
};

/** `feedReducer`, plus the announcement for whatever it changed (`sendAnnouncement`). */
export function announcedFeedReducer(state: AnnouncedFeed, action: FeedAction): AnnouncedFeed {
  const feed = feedReducer(state.feed, action);
  if (feed === state.feed) return state;
  const said = sendAnnouncement(state.feed, feed);
  if (said === null) return { ...state, feed };
  return { feed, announcement: said, announcementId: state.announcementId + 1 };
}
