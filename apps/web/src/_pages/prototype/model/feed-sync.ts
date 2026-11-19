import {
  catchUp,
  type FetchMessagesPage,
  maxSeq,
  MESSAGES_PAGE_LIMIT,
  type MessageResponse,
  syncedSeq,
} from '@app/contracts';
import { createStore, type StoreApi } from 'zustand';
import {
  announcedFeedReducer,
  type AnnouncedFeed,
  type FeedAction,
  initialAnnouncedFeed,
} from './feed';

/**
 * The page's feed outside React: the catch-up must read the feed as it is now, not as of the last
 * render, or a second pass after a dispatch would ask for an old `afterSeq`. React reads it with
 * `useStore`; every write goes through `announcedFeedReducer`.
 */
export interface FeedStore {
  readonly store: StoreApi<AnnouncedFeed>;
  readonly dispatch: (action: FeedAction) => void;
  /** Confirmed messages only: unsent rows (UL-131) have no `seq` and never feed `afterSeq`. */
  readonly sent: () => readonly MessageResponse[];
}

export function createFeedStore(): FeedStore {
  const store = createStore<AnnouncedFeed>()(() => initialAnnouncedFeed);
  return {
    store,
    dispatch: (action) => {
      store.setState((state) => announcedFeedReducer(state, action), true);
    },
    sent: () => store.getState().feed.sent,
  };
}

export interface FeedSyncOptions {
  readonly feed: FeedStore;
  /** "How to make a request": `GET` messages with this query, already schema-checked. */
  readonly fetchPage: FetchMessagesPage;
  /** Aborted on unmount: nothing is dispatched after it. */
  readonly signal: AbortSignal;
  /** A pass failed (the page shows Retry) or succeeded (the page hides it). */
  readonly onResult?: (outcome: { ok: true } | { ok: false; error: unknown }) => void;
  readonly limit?: number;
}

export interface FeedSync {
  /**
   * Brings the feed up to date (STACK §4.4): the newest page the first time, then the messages
   * after the end of the gapless run (`syncedSeq`), or the newest page again when the server says
   * `hasMore`. Single flight: a call while a pass runs makes one more pass after it and shares its
   * promise, so a reconnect during a gap catch-up never runs two requests side by side, and a call
   * that lands while a pass fails still gets its pass. If the feed still has a hole after a pass
   * (a message arrived above the page meanwhile), one more pass runs, once. Never rejects; a
   * failure goes to `onResult`.
   */
  run(): Promise<void>;
  /**
   * A confirmed message from outside the catch-up: a live `message:new` for this channel, or this
   * client's own `POST` 201. It is always merged (by `id`, so a repeat is one row). It returns
   * `catch-up` when it shows that the feed missed something and the caller should `run()`:
   * - it sits above a hole (the feed is complete to 41 and 43 arrives, or the user's own 201 is
   *   45 while 42-44 never came); the catch-up asks from 41, so the hole fills;
   * - the channel was empty at load and the first message is not seq 1.
   *
   * It returns `ok` otherwise, and also while a pass runs (that pass's end checks for holes) or
   * after a failed pass: those wait for Retry or the next reconnect, so a broken api is not asked
   * again on every live message.
   */
  receive(message: MessageResponse): 'ok' | 'catch-up';
}

/** Whether the confirmed feed misses a seq below its greatest one. */
function hasHole(sent: readonly MessageResponse[]): boolean {
  return sent.length > 0 && syncedSeq(sent) !== maxSeq(sent);
}

export function createFeedSync(options: FeedSyncOptions): FeedSync {
  const { feed, fetchPage, signal, onResult } = options;
  const limit = options.limit ?? MESSAGES_PAGE_LIMIT;
  let running: Promise<void> | null = null;
  // `run()` sets it while `loop` awaits; read through a function, since flow analysis cannot see
  // that write and would treat the loop conditions as always false.
  let again = false;
  const rerunRequested = () => again;
  // Until the first pass succeeds the feed has no baseline: live messages merged meanwhile must not
  // become the `afterSeq` (1..42 would be skipped), so the pass loads the newest page instead.
  let loaded = false;
  // The next pass loads the newest page even though the feed is not empty (WR-02: the channel was
  // empty at load and a live 2 arrived, so 1 is missing and no `afterSeq` would find it).
  let fromLatest = false;
  // The last pass failed: holes wait for Retry or a reconnect instead of a GET per live message.
  let failed = false;

  const pass = async () => {
    const base = loaded && !fromLatest ? feed.sent() : [];
    const result = await catchUp(base, fetchPage, limit);
    if (signal.aborted) return;
    feed.dispatch({
      type: result.kind === 'append' ? 'merge' : 'reset',
      messages: result.messages,
    });
    loaded = true;
    fromLatest = false;
  };

  const loop = async () => {
    let followedUp = false;
    for (;;) {
      again = false;
      try {
        await pass();
      } catch (error) {
        if (signal.aborted) break;
        // A trigger that came in while this pass failed (a reconnect, say) gets its own try.
        if (rerunRequested()) continue;
        failed = true;
        onResult?.({ ok: false, error });
        break;
      }
      if (signal.aborted) break;
      if (rerunRequested()) continue;
      // A message merged above the page while it was in flight can leave a hole: one more pass.
      // Only once, so a hole the server cannot fill never turns into a request loop.
      if (!followedUp && (fromLatest || hasHole(feed.sent()))) {
        followedUp = true;
        continue;
      }
      failed = false;
      onResult?.({ ok: true });
      break;
    }
    // Cleared in the same tick as the last `again` check, so no `run()` can slip in between and
    // get a promise that settles without running a pass for it.
    running = null;
  };

  return {
    run() {
      if (running) {
        again = true;
        return running;
      }
      running = loop();
      return running;
    },
    receive(message) {
      const emptyBefore = feed.sent().length === 0;
      feed.dispatch({ type: 'merge', messages: [message] });
      if (!loaded) return 'ok';
      if (emptyBefore && BigInt(message.seq) > 1n) fromLatest = true;
      if (!fromLatest && !hasHole(feed.sent())) return 'ok';
      return running || failed ? 'ok' : 'catch-up';
    },
  };
}
