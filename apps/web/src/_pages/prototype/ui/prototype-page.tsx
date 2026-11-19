'use client';

import { useEffect, useReducer, useRef, useState, type SubmitEvent } from 'react';
import { MESSAGE_BODY_MAX_LENGTH, MESSAGE_NEW_EVENT, MessageNewEvent } from '@app/contracts';
import { getSocket } from '@/shared/api';
import { uuidv7 } from '@/shared/lib';
import { Button, Input } from '@/shared/ui';
import {
  classifySendError,
  fetchInstanceId,
  fetchMessages,
  sendMessage,
} from '../api/prototype-api';
import {
  announcedFeedReducer,
  feedRows,
  initialAnnouncedFeed,
  PROTOTYPE_CHANNEL_ID,
} from '../model/feed';
import { ConnectionIndicator } from './connection-indicator';

type Instance = { kind: 'loading' } | { kind: 'ready'; id: string } | { kind: 'unavailable' };

function instanceText(instance: Instance): string {
  if (instance.kind === 'ready') return `Instance: ${instance.id}`;
  return `Instance: ${instance.kind}`;
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

/**
 * Realtime prototype (UL-128): the seeded channel's feed on one api replica. Two windows bound to
 * different replicas see each other's messages without a reload, in `seq` order.
 */
export function PrototypePage() {
  // `announcement` is derived from the feed by the reducer, so the "Send status" live region always
  // matches the rows, whatever order the 201, `message:new` and a failure arrive in.
  const [{ feed, announcement }, dispatch] = useReducer(announcedFeedReducer, initialAnnouncedFeed);
  const [instance, setInstance] = useState<Instance>({ kind: 'loading' });
  const [draft, setDraft] = useState('');
  const [historyFailed, setHistoryFailed] = useState(false);
  // The effect's history loader, so the Retry button reuses its abort signal.
  const loadHistoryRef = useRef<(() => Promise<void>) | null>(null);

  useEffect(() => {
    const socket = getSocket();
    const controller = new AbortController();
    const { signal } = controller;

    const loadHistory = async () => {
      try {
        const history = await fetchMessages(PROTOTYPE_CHANNEL_ID, signal);
        if (signal.aborted) return;
        dispatch({ type: 'merge', messages: history });
        setHistoryFailed(false);
      } catch (error) {
        if (signal.aborted || isAbortError(error)) return;
        console.warn('prototype: could not load messages', error);
        setHistoryFailed(true);
      }
    };
    loadHistoryRef.current = loadHistory;

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

    // Every connect, the first and each reconnect, reloads the latest page of history (the api's
    // last 100 messages) and the merge by id drops the overlap. A gap longer than one page is not
    // caught up here: paging after the last known seq (`?afterSeq=`) is UL-130.
    // Any connect may land on another replica than the health read before it (Traefik re-picks
    // io_srv when the old one is gone, also when the first handshake had to retry), so each
    // connect re-reads the instance id.
    // The connection state itself is not set here: the lifecycle listeners in @/shared/api own it.
    const onConnect = () => {
      void loadInstance();
      void loadHistory();
    };

    // Wire data is untrusted: anything that fails the contracts schema is dropped, never rendered.
    const onMessageNew = (payload: unknown) => {
      const result = MessageNewEvent.safeParse(payload);
      if (!result.success) {
        console.warn('prototype: ignoring invalid message:new payload', result.error);
        return;
      }
      if (result.data.message.channelId !== PROTOTYPE_CHANNEL_ID) return;
      dispatch({ type: 'merge', messages: [result.data.message] });
    };

    // Listeners first, so nothing the socket emits after connect() is missed.
    socket.on('connect', onConnect);
    socket.on(MESSAGE_NEW_EVENT, onMessageNew);

    // Health first, then the handshake: Traefik sets io_srv on the health response, so the socket
    // lands on the replica whose instanceId the page shows.
    void loadInstance().then(() => {
      if (signal.aborted) return;
      // A remount within the same tab finds the singleton already connected.
      if (socket.connected) onConnect();
      else socket.connect();
    });

    return () => {
      controller.abort();
      loadHistoryRef.current = null;
      socket.off('connect', onConnect);
      socket.off(MESSAGE_NEW_EVENT, onMessageNew);
      // No disconnect(): the singleton lives as long as the tab.
    };
  }, []);

  /**
   * The only send path, used by both Send and Retry. It never throws. Nothing calls it on its own:
   * no retry on reconnect or `online` (UL-131), and unsent rows live in memory only (UL-193).
   */
  const deliver = async (clientMsgId: string, body: string) => {
    dispatch({ type: 'pending', clientMsgId, body });
    try {
      const message = await sendMessage(PROTOTYPE_CHANNEL_ID, { clientMsgId, body });
      dispatch({ type: 'merge', messages: [message] });
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
              void loadHistoryRef.current?.();
            }}
          >
            Retry
          </Button>
        </div>
      ) : null}
      <p role="status" aria-label="Send status" className="sr-only">
        {announcement}
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
