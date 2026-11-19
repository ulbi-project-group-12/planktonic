'use client';

import { useEffect, useReducer, useState } from 'react';
import { getSocket } from '@/shared/api';
import { fetchInstanceId, fetchMessages } from '../api/prototype-api';
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

    // Listeners first, so nothing the socket emits after connect() is missed.
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);

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
      // No disconnect(): the singleton lives as long as the tab.
    };
  }, []);

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
    </main>
  );
}
