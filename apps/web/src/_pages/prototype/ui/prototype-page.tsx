'use client';

import { useEffect, useReducer, useState, type SubmitEvent } from 'react';
import { MESSAGE_BODY_MAX_LENGTH, MESSAGE_NEW_EVENT, MessageNewEvent } from '@app/contracts';
import { getSocket } from '@/shared/api';
import { uuidv7 } from '@/shared/lib';
import { Button, Input } from '@/shared/ui';
import { fetchInstanceId, fetchMessages, sendMessage } from '../api/prototype-api';
import { feedReducer, PROTOTYPE_CHANNEL_ID } from '../model/feed';

type SocketStatus = 'connecting' | 'connected' | 'disconnected';

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
  const [messages, dispatch] = useReducer(feedReducer, []);
  const [instance, setInstance] = useState<Instance>({ kind: 'loading' });
  const [status, setStatus] = useState<SocketStatus>('connecting');
  const [draft, setDraft] = useState('');
  // The clientMsgId of the last send that did not succeed, bound to the body it was made for. A
  // resend of that same body reuses it, so a lost response never makes a second message. An edited
  // draft gets a new key: the server would answer an old key with the stored (old) body.
  const [pending, setPending] = useState<{ key: string; body: string } | null>(null);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  useEffect(() => {
    const socket = getSocket();
    const controller = new AbortController();
    const { signal } = controller;

    const loadHistory = async () => {
      try {
        const history = await fetchMessages(PROTOTYPE_CHANNEL_ID, signal);
        if (!signal.aborted) dispatch({ type: 'merge', messages: history });
      } catch (error) {
        if (!isAbortError(error)) console.warn('prototype: could not load messages', error);
      }
    };

    // Every connect, the first and each reconnect, reloads the history: it catches up on whatever
    // was missed while the socket was down, and the merge by id drops the overlap.
    const onConnect = () => {
      setStatus('connected');
      void loadHistory();
    };
    // `active` means Socket.IO will reconnect by itself.
    const onDisconnect = () => {
      setStatus(socket.active ? 'connecting' : 'disconnected');
    };
    const onConnectError = () => {
      setStatus(socket.active ? 'connecting' : 'disconnected');
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
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);
    socket.on(MESSAGE_NEW_EVENT, onMessageNew);

    // Health first, then the handshake: Traefik sets io_srv on the health response, so the socket
    // lands on the replica whose instanceId the page shows.
    void fetchInstanceId(signal)
      .then(
        (id) => {
          if (!signal.aborted) setInstance({ kind: 'ready', id });
        },
        (error: unknown) => {
          if (signal.aborted) return;
          console.warn('prototype: could not load the instance id', error);
          setInstance({ kind: 'unavailable' });
        },
      )
      .then(() => {
        if (signal.aborted) return;
        // A remount within the same tab finds the singleton already connected.
        if (socket.connected) onConnect();
        else socket.connect();
      });

    return () => {
      controller.abort();
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
      socket.off(MESSAGE_NEW_EVENT, onMessageNew);
      // No disconnect(): the singleton lives as long as the tab.
    };
  }, []);

  const sendDisabled = sending || draft.trim() === '' || draft.length > MESSAGE_BODY_MAX_LENGTH;

  const onSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (sendDisabled) return;
    // The body goes as typed: the server stores it verbatim.
    const body = draft;
    const clientMsgId = pending?.body === body ? pending.key : uuidv7();
    setPending({ key: clientMsgId, body });
    setSending(true);
    setSendError(null);
    try {
      const message = await sendMessage(PROTOTYPE_CHANNEL_ID, { clientMsgId, body });
      dispatch({ type: 'merge', messages: [message] });
      // Text typed while the request was in flight stays.
      setDraft((current) => (current === body ? '' : current));
      setPending((current) => (current?.key === clientMsgId ? null : current));
    } catch (error) {
      console.warn('prototype: send failed', error);
      setSendError('Not sent. Press Send to try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-svh max-w-2xl flex-col gap-4 p-8">
      <h1 className="text-body-xl font-bold tracking-tight">Realtime prototype</h1>
      <div className="flex flex-col gap-1 text-body-s text-fg-secondary">
        <p>{instanceText(instance)}</p>
        <p>{`Socket: ${status}`}</p>
      </div>
      <ol aria-label="Messages" className="flex flex-col gap-1 text-body-s">
        {messages.map((message) => (
          <li key={message.id}>{`#${message.seq} ${message.body}`}</li>
        ))}
      </ol>
      <form
        aria-label="Send a message"
        className="flex items-end gap-2"
        onSubmit={(event) => {
          void onSubmit(event);
        }}
      >
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
      {sendError ? (
        <p role="alert" className="text-body-s text-danger">
          {sendError}
        </p>
      ) : null}
    </main>
  );
}
