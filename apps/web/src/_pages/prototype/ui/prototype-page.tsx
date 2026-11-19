'use client';

import { useEffect, useRef, useState, type SubmitEvent } from 'react';
import { useStore } from 'zustand';
import { MESSAGE_BODY_MAX_LENGTH, MESSAGE_NEW_EVENT, MessageNewEvent } from '@app/contracts';
import { getSocket, registerCatchUp, syncWith } from '@/shared/api';
import { uuidv7 } from '@/shared/lib';
import { Button, Input } from '@/shared/ui';
import {
  classifySendError,
  fetchInstanceId,
  fetchMessages,
  sendMessage,
} from '../api/prototype-api';
import { feedRows, PROTOTYPE_CHANNEL_ID } from '../model/feed';
import { createFeedStore, createFeedSync, type FeedSync } from '../model/feed-sync';
import { ConnectionIndicator } from './connection-indicator';

type Instance = { kind: 'loading' } | { kind: 'ready'; id: string } | { kind: 'unavailable' };

function instanceText(instance: Instance): string {
  if (instance.kind === 'ready') return `Instance: ${instance.id}`;
  return `Instance: ${instance.kind}`;
}

/**
 * Realtime prototype (UL-128): the seeded channel's feed on one api replica. Two windows bound to
 * different replicas see each other's messages without a reload, in `seq` order. After a reconnect
 * the feed catches up on what it missed (UL-130).
 */
export function PrototypePage() {
  // The feed lives in a store outside React so the catch-up reads it as it is now (see
  // `createFeedStore`). `announcement` is derived from the feed by the reducer, so the "Send
  // status" live region always matches the rows, whatever order the 201, `message:new` and a
  // failure arrive in.
  const [feedStore] = useState(createFeedStore);
  const { feed, announcement, announcementId } = useStore(feedStore.store);
  const { dispatch } = feedStore;
  const [instance, setInstance] = useState<Instance>({ kind: 'loading' });
  const [draft, setDraft] = useState('');
  const [historyFailed, setHistoryFailed] = useState(false);
  // The effect's catch-up, so the Retry button runs the same single-flight runner.
  const syncRef = useRef<FeedSync | null>(null);

  useEffect(() => {
    const socket = getSocket();
    const controller = new AbortController();
    const { signal } = controller;

    // The catch-up is the only history load (STACK §4.4): on an empty feed it loads the newest
    // page, afterwards it asks for what came after the last known seq. Connection State Recovery
    // is off, so this REST read is how a reconnect gets what the socket missed.
    const sync = createFeedSync({
      feed: feedStore,
      fetchPage: (query) => fetchMessages(PROTOTYPE_CHANNEL_ID, query, signal),
      signal,
      onResult: (outcome) => {
        if (outcome.ok) {
          setHistoryFailed(false);
          return;
        }
        console.warn('prototype: could not load messages', outcome.error);
        setHistoryFailed(true);
      },
    });
    syncRef.current = sync;

    // Only the latest read may set the instance: an older, slower answer is dropped. A failed
    // re-read keeps a known id rather than replacing it with `unavailable`.
    let instanceRead = 0;
    const loadInstance = () => {
      const read = ++instanceRead;
      return fetchInstanceId(signal).then(
        (id) => {
          if (!signal.aborted && read === instanceRead) setInstance({ kind: 'ready', id });
        },
        (error: unknown) => {
          if (signal.aborted || read !== instanceRead) return;
          console.warn('prototype: could not load the instance id', error);
          setInstance((current) => (current.kind === 'ready' ? current : { kind: 'unavailable' }));
        },
      );
    };

    // Every connect, the first and each reconnect, runs the catch-up. The transport (@/shared/api)
    // runs it and owns the connection state: `syncing` until it settles, then `connected`. This
    // component never writes that state.
    const unregister = registerCatchUp(() => sync.run());

    // Any connect may land on another replica than the health read before it (Traefik re-picks
    // io_srv when the old one is gone, also when the first handshake had to retry), so each
    // connect re-reads the instance id.
    const onConnect = () => {
      void loadInstance();
    };

    // Wire data is untrusted: anything that fails the contracts schema is dropped, never rendered.
    const onMessageNew = (payload: unknown) => {
      const result = MessageNewEvent.safeParse(payload);
      if (!result.success) {
        console.warn('prototype: ignoring invalid message:new payload', result.error);
        return;
      }
      if (result.data.message.channelId !== PROTOTYPE_CHANNEL_ID) return;
      // A skipped seq (41 → 43) means an event was lost on a live connection: same catch-up.
      if (sync.receive(result.data.message) === 'catch-up') void syncWith(() => sync.run());
    };

    // Listeners first, so nothing the socket emits after connect() is missed.
    socket.on('connect', onConnect);
    socket.on(MESSAGE_NEW_EVENT, onMessageNew);

    // Health first, then the handshake: Traefik sets io_srv on the health response, so the socket
    // lands on the replica whose instanceId the page shows.
    void loadInstance().then(() => {
      if (signal.aborted) return;
      // A remount within the same tab finds the singleton already connected: no connect event
      // comes, so the catch-up starts here.
      if (socket.connected) void syncWith(() => sync.run());
      else socket.connect();
    });

    return () => {
      controller.abort();
      syncRef.current = null;
      unregister();
      socket.off('connect', onConnect);
      socket.off(MESSAGE_NEW_EVENT, onMessageNew);
      // No disconnect(): the singleton lives as long as the tab.
    };
  }, [feedStore]);

  /**
   * The only send path, used by both Send and Retry. It never throws. Nothing calls it on its own:
   * no retry on reconnect or `online` (UL-131), and unsent rows live in memory only (UL-193).
   */
  const deliver = async (clientMsgId: string, body: string) => {
    dispatch({ type: 'pending', clientMsgId, body });
    try {
      const message = await sendMessage(PROTOTYPE_CHANNEL_ID, { clientMsgId, body });
      // Through the catch-up runner like a live event: the 201 can be the first sign of a hole
      // (others' messages lost while this client was away), and its seq must not hide it.
      const sync = syncRef.current;
      if (!sync) dispatch({ type: 'merge', messages: [message] });
      else if (sync.receive(message) === 'catch-up') void syncWith(() => sync.run());
    } catch (error) {
      console.warn('prototype: send failed', error);
      dispatch({ type: 'failed', clientMsgId, failure: classifySendError(error) });
    }
  };

  const sendDisabled = draft.trim() === '' || draft.length > MESSAGE_BODY_MAX_LENGTH;

  const onSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (sendDisabled) return;
    // The body goes as typed: the server stores it verbatim. Every Send gets a fresh key; the row
    // keeps the text, so the draft clears at once.
    const body = draft;
    setDraft('');
    void deliver(uuidv7(), body);
  };

  return (
    <main className="mx-auto flex min-h-svh max-w-2xl flex-col gap-4 p-8">
      <h1 className="text-body-xl font-bold tracking-tight">Realtime prototype</h1>
      <div className="flex flex-col gap-1 text-body-s text-fg-secondary">
        <p>{instanceText(instance)}</p>
        <ConnectionIndicator />
      </div>
      {historyFailed ? (
        <div role="alert" className="flex items-center gap-2 text-body-s text-danger">
          <span>Could not load the messages.</span>
          <Button
            type="button"
            variant="secondary"
            size="s"
            onClick={() => {
              const sync = syncRef.current;
              if (sync) void syncWith(() => sync.run());
            }}
          >
            Retry
          </Button>
        </div>
      ) : null}
      <p role="status" aria-label="Send status" className="sr-only">
        {/* A new node per announcement, so a repeated sentence is read out again. */}
        {announcement ? <span key={announcementId}>{announcement}</span> : null}
      </p>
      <ol aria-label="Messages" className="flex flex-col gap-1 text-body-s">
        {feedRows(feed).map((row) => {
          if (row.status === 'sent') {
            return <li key={row.key}>{`#${row.message.seq} ${row.message.body}`}</li>;
          }
          if (row.status === 'pending') {
            return (
              <li key={row.key} className="flex flex-wrap items-center gap-2">
                <span>{row.body}</span>
                <span className="text-fg-secondary">Sending…</span>
              </li>
            );
          }
          return (
            <li key={row.key} className="flex flex-wrap items-center gap-2">
              <span>{row.body}</span>
              <span className="text-danger">{`Not sent: ${row.failure.reason}`}</span>
              {row.failure.retryable ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="s"
                  onClick={() => {
                    void deliver(row.clientMsgId, row.body);
                  }}
                >
                  Retry
                </Button>
              ) : (
                <span className="text-fg-secondary">Retrying will not help.</span>
              )}
            </li>
          );
        })}
      </ol>
      <form aria-label="Send a message" className="flex items-end gap-2" onSubmit={onSubmit}>
        <Input
          label="Message"
          value={draft}
          maxLength={MESSAGE_BODY_MAX_LENGTH}
          autoComplete="off"
          onChange={(event) => {
            setDraft(event.target.value);
          }}
        />
        <Button type="submit" disabled={sendDisabled}>
          Send
        </Button>
      </form>
    </main>
  );
}
