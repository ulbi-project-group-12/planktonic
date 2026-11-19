import { createStore, useStore } from 'zustand';
import type { AppSocket } from './socket';

/**
 * The tab's connection state (STACK §3.3, `useConnectionStore`). Transport state only: no server
 * data goes in here. `syncing` means "connected, but the data on screen may be incomplete while
 * the catch-up runs" (§4.4); no event maps to it yet, UL-130 switches it on.
 */
export type ConnectionState = 'connecting' | 'connected' | 'syncing' | 'offline';

/**
 * Socket.IO lifecycle events, as the listeners below see them.
 *
 * | Emitter                 | Event               | State      |
 * |-------------------------|---------------------|------------|
 * | (initial)               | —                   | connecting |
 * | socket                  | `connect`           | connected  |
 * | socket                  | `disconnect`        | offline    |
 * | socket                  | `connect_error`     | offline    |
 * | manager (`socket.io`)   | `reconnect_attempt` | connecting |
 * | manager                 | `reconnect`         | connecting |
 * | manager                 | `reconnect_error`   | offline    |
 * | manager                 | `reconnect_failed`  | offline    |
 *
 * `disconnect` keeps its reason. `io client disconnect` (our own `disconnect()`) and
 * `io server disconnect` (the server dropped us) are final: Socket.IO does not retry them, and the
 * state stays `offline` until something calls `connect()` again. Every other reason (`transport
 * close`, `transport error`, `ping timeout`, `parse error`) is a network loss: the manager
 * retries with backoff, and each try shows as `reconnect_attempt` → `connecting`. A dead network
 * is often noticed only on the ping timeout (pingInterval + pingTimeout, ~45 s by default), so
 * `offline` is not instant.
 *
 * The manager's `reconnect` is not `connected`: it fires when the transport opens, before the
 * server has accepted the namespace CONNECT (middleware may still reject it). Only the socket's
 * `connect` means connected. `reconnect_failed` fires only with a finite `reconnectionAttempts`
 * (the default is Infinity); it is mapped so a later config change cannot leave a stale state.
 */
export type ConnectionEvent =
  | { type: 'connect' }
  | { type: 'disconnect'; reason: string }
  | { type: 'connect_error' }
  | { type: 'reconnect_attempt'; attempt: number }
  | { type: 'reconnect' }
  | { type: 'reconnect_error' }
  | { type: 'reconnect_failed' };

/** Pure event → state step, so every transition is testable without a socket. */
export function nextConnectionState(
  // Unused today: kept so UL-130 can map `connect` to `syncing` and leave it on catch-up.
  _state: ConnectionState,
  event: ConnectionEvent,
): ConnectionState {
  switch (event.type) {
    case 'connect':
      return 'connected';
    case 'reconnect_attempt':
    case 'reconnect':
      return 'connecting';
    case 'disconnect':
    case 'connect_error':
    case 'reconnect_error':
    case 'reconnect_failed':
      return 'offline';
  }
}

interface ConnectionStoreState {
  state: ConnectionState;
}

const INITIAL: ConnectionStoreState = { state: 'connecting' };

// Module-private: only the listeners in this file write it. Components read it through
// `useConnectionStore`, which has no actions and no `setState`.
const connectionStore = createStore<ConnectionStoreState>()(() => INITIAL);

function apply(event: ConnectionEvent): void {
  connectionStore.setState(({ state }) => ({ state: nextConnectionState(state, event) }));
}

/** Read-only selector hook over the connection store. */
export function useConnectionStore<T>(selector: (store: ConnectionStoreState) => T): T {
  return useStore(connectionStore, selector);
}

/** Current state outside React (tests, future non-React readers). */
export function getConnectionState(): ConnectionState {
  return connectionStore.getState().state;
}

/** Test-only: back to the initial state. Not exported from `@/shared/api`. */
export function resetConnectionStore(): void {
  connectionStore.setState(INITIAL, true);
}

/**
 * Attaches the lifecycle listeners that write the store. Called once per tab, by `getSocket()`
 * when it creates the singleton — never from a component, where `reactStrictMode` would attach
 * them twice. Returns the unbind for tests.
 */
export function bindConnectionListeners(socket: AppSocket): () => void {
  const onConnect = () => {
    apply({ type: 'connect' });
  };
  const onDisconnect = (reason: string) => {
    apply({ type: 'disconnect', reason });
  };
  const onConnectError = () => {
    apply({ type: 'connect_error' });
  };
  const onReconnectAttempt = (attempt: number) => {
    apply({ type: 'reconnect_attempt', attempt });
  };
  const onReconnect = () => {
    apply({ type: 'reconnect' });
  };
  const onReconnectError = () => {
    apply({ type: 'reconnect_error' });
  };
  const onReconnectFailed = () => {
    apply({ type: 'reconnect_failed' });
  };

  socket.on('connect', onConnect);
  socket.on('disconnect', onDisconnect);
  socket.on('connect_error', onConnectError);
  socket.io.on('reconnect_attempt', onReconnectAttempt);
  socket.io.on('reconnect', onReconnect);
  socket.io.on('reconnect_error', onReconnectError);
  socket.io.on('reconnect_failed', onReconnectFailed);

  return () => {
    socket.off('connect', onConnect);
    socket.off('disconnect', onDisconnect);
    socket.off('connect_error', onConnectError);
    socket.io.off('reconnect_attempt', onReconnectAttempt);
    socket.io.off('reconnect', onReconnect);
    socket.io.off('reconnect_error', onReconnectError);
    socket.io.off('reconnect_failed', onReconnectFailed);
  };
}
