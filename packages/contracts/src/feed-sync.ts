// The client's catch-up after a reconnect (STACK §4.4, UL-130), as plain functions over message
// lists. It lives here, not in apps/web, so the api's realtime tests (UL-133) run the client's real
// code: apps/api cannot import apps/web, and a copy in a test would drift. No React, no browser API,
// no I/O of its own: the caller passes "how to make a request".
import {
  type GetMessagesQueryInput,
  MESSAGES_PAGE_LIMIT,
  type MessageResponse,
} from './message.js';

/** Ascending by `seq`. It is a decimal string past 2^53, so neither Number nor string compare. */
export function compareSeq(a: MessageResponse, b: MessageResponse): number {
  const left = BigInt(a.seq);
  const right = BigInt(b.seq);
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

/**
 * Union of two message lists by `id`, sorted by `seq` ascending. A later copy wins (incoming over
 * current, and later inside incoming), so one message that arrives twice (the `POST` 201 and the
 * sender's own `message:new`, or a live event and the same message in a catch-up page) is one row,
 * whichever comes first. Neither input is mutated; an empty `incoming` returns `current` itself so
 * a UI can skip the render.
 */
export function mergeMessages(
  current: readonly MessageResponse[],
  incoming: readonly MessageResponse[],
): readonly MessageResponse[] {
  if (incoming.length === 0) return current;
  const byId = new Map<string, MessageResponse>();
  for (const message of current) byId.set(message.id, message);
  for (const message of incoming) byId.set(message.id, message);
  return [...byId.values()].sort(compareSeq);
}

/**
 * The greatest `seq` in the list, or `null` for an empty one. Only confirmed messages have a
 * `seq`: a caller with local unsent rows (UL-131) passes the confirmed ones only.
 */
export function maxSeq(messages: readonly MessageResponse[]): string | null {
  let max: bigint | null = null;
  for (const message of messages) {
    const seq = BigInt(message.seq);
    if (max === null || seq > max) max = seq;
  }
  return max === null ? null : max.toString();
}

/**
 * The end of the gapless run of seqs that starts at the feed's lowest one, or `null` for an empty
 * feed: for 1, 2, 3, 5 it is 3. A channel's seqs have no holes (UL-125), so a hole in the feed is
 * a message this client never got, and the catch-up must ask from below it. The greatest seq
 * would not do: the user's own `POST` 201 (or a live event kept through a reset) can sit above a
 * hole, and asking after it would skip the hole for good.
 */
export function syncedSeq(messages: readonly MessageResponse[]): string | null {
  if (messages.length === 0) return null;
  const seqs = [...new Set(messages.map((message) => BigInt(message.seq)))].sort((a, b) =>
    a < b ? -1 : a > b ? 1 : 0,
  );
  let end = seqs[0] ?? 0n;
  for (const seq of seqs.slice(1)) {
    if (seq !== end + 1n) break;
    end = seq;
  }
  return end.toString();
}

/**
 * Whether `incoming` shows that something before it was lost: the feed is complete up to 41 and
 * 43 arrives, so 42 never came (a Redis hiccup on a live connection, STACK §4.4). A message above
 * a hole the feed already has is a gap too. An old or repeated seq is not, and neither is the next
 * one. An empty feed compares against `baseline`: `'0'` once a load has shown the channel empty
 * (so a live 2 means 1 was lost), `null` (the default) when nothing is known yet.
 */
export function isSeqGap(
  feed: readonly MessageResponse[],
  incoming: MessageResponse,
  baseline: string | null = null,
): boolean {
  const known = syncedSeq(feed) ?? baseline;
  if (known === null) return false;
  return BigInt(incoming.seq) > BigInt(known) + 1n;
}

/** One `GET` messages page, as the caller's fetcher returns it (already schema-checked). */
export interface CatchUpPage {
  readonly messages: readonly MessageResponse[];
  readonly hasMore: boolean;
}

/** "How to make a request": `GET /channels/:id/messages` with this query. */
export type FetchMessagesPage = (query: GetMessagesQueryInput) => Promise<CatchUpPage>;

/**
 * What the feed should do with the result:
 * - `append`: merge `messages` into the feed (they are the ones after its gapless run);
 * - `reset`: the feed is too far behind or empty; replace its confirmed messages with `messages`,
 *   the newest page (keeping anything newer that arrived while the request ran, see `resetFeed`).
 */
export type CatchUpResult =
  | { readonly kind: 'append'; readonly messages: readonly MessageResponse[] }
  | { readonly kind: 'reset'; readonly messages: readonly MessageResponse[] };

/**
 * The catch-up after a reconnect or a seq gap (STACK §4.4, step 2), for one channel:
 * - an empty feed loads the newest page (`reset`), which also makes it the initial load, so the
 *   first `connect` sends one request, not a history load plus a catch-up;
 * - otherwise it asks for the messages after the end of the feed's gapless run (`syncedSeq`), one
 *   page of `limit`, so a hole below a later message is filled too;
 * - if the server says `hasMore`, the client missed more than a page: rather than paging forward
 *   without end, it loads the newest page once and the feed resets to it (`reset`).
 *
 * `feed` is the confirmed messages only (never local unsent rows: they have no `seq`). A failed
 * request rejects; nothing is retried here.
 */
export async function catchUp(
  feed: readonly MessageResponse[],
  fetchPage: FetchMessagesPage,
  limit: number = MESSAGES_PAGE_LIMIT,
): Promise<CatchUpResult> {
  const afterSeq = syncedSeq(feed);
  const pageLimit = String(limit);
  if (afterSeq === null) {
    const latest = await fetchPage({ limit: pageLimit });
    return { kind: 'reset', messages: latest.messages };
  }
  const page = await fetchPage({ afterSeq, limit: pageLimit });
  if (!page.hasMore) return { kind: 'append', messages: page.messages };
  const latest = await fetchPage({ limit: pageLimit });
  return { kind: 'reset', messages: latest.messages };
}

/**
 * The confirmed feed after a `reset`: the newest page, plus every message of `current` newer than
 * that page. Those are live events that arrived while the request ran; replacing the feed outright
 * would drop them (the page was read before they were sent). Older messages of `current` go: a
 * reset is how the client forgets a gap it will not fill.
 */
export function resetFeed(
  current: readonly MessageResponse[],
  latest: readonly MessageResponse[],
): readonly MessageResponse[] {
  const top = maxSeq(latest);
  const newer =
    top === null ? current : current.filter((message) => BigInt(message.seq) > BigInt(top));
  // Through `mergeMessages` from empty, so the result is deduped and sorted even when the page
  // arrives out of order; the page's copy of a message wins over a live one (it is the later read).
  return mergeMessages([], [...newer, ...latest]);
}

/** `CatchUpResult` applied to a confirmed feed: `mergeMessages` or `resetFeed`. */
export function applyCatchUp(
  current: readonly MessageResponse[],
  result: CatchUpResult,
): readonly MessageResponse[] {
  return result.kind === 'append'
    ? mergeMessages(current, result.messages)
    : resetFeed(current, result.messages);
}
