import {
  catchUp,
  type FetchMessagesPage,
  isSeqGap,
  MESSAGES_PAGE_LIMIT,
  type MessageResponse,
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
   * after the last known `seq`, or the newest page again when the server says `hasMore`. Single
   * flight: a call while a pass runs makes one more pass after it and shares its promise, so a
   * reconnect during a gap catch-up (or two gaps) never runs two requests side by side. Never
   * rejects; a failure goes to `onResult`.
   */
  run(): Promise<void>;
  /**
   * A live `message:new` for this channel. A message that skips a seq (the feed ends at 41 and 43
   * arrives) is not merged: it only reports `gap`, and the caller runs the catch-up, which still
   * asks `afterSeq=41` and so brings 42 and 43 together. Merging 43 first would move the last
   * known seq past 42, and 42 would never come. Anything else is merged (`merged`); a repeat or a
   * message already in a page is one row (`mergeMessages` by `id`).
   */
  receive(message: MessageResponse): 'merged' | 'gap';
}

export function createFeedSync(options: FeedSyncOptions): FeedSync {
  const { feed, fetchPage, signal, onResult } = options;
  const limit = options.limit ?? MESSAGES_PAGE_LIMIT;
  let running: Promise<void> | null = null;
  // `run()` sets it while `loop` awaits; read through a function, since flow analysis cannot see
  // that write and would treat the loop condition as always false.
  let again = false;
  const rerunRequested = () => again;
  // Until the first pass succeeds the feed has no baseline: live messages merged meanwhile must not
  // become the `afterSeq` (1..42 would be skipped), so the pass loads the newest page instead.
  let loaded = false;

  const pass = async () => {
    const result = await catchUp(loaded ? feed.sent() : [], fetchPage, limit);
    if (signal.aborted) return;
    feed.dispatch({
      type: result.kind === 'append' ? 'merge' : 'reset',
      messages: result.messages,
    });
    loaded = true;
  };

  const loop = async () => {
    try {
      do {
        again = false;
        await pass();
      } while (rerunRequested() && !signal.aborted);
      if (!signal.aborted) onResult?.({ ok: true });
    } catch (error) {
      if (!signal.aborted) onResult?.({ ok: false, error });
    }
  };

  return {
    run() {
      if (running) {
        again = true;
        return running;
      }
      running = loop().finally(() => {
        running = null;
      });
      return running;
    },
    receive(message) {
      if (loaded && isSeqGap(feed.sent(), message)) return 'gap';
      feed.dispatch({ type: 'merge', messages: [message] });
      return 'merged';
    },
  };
}
