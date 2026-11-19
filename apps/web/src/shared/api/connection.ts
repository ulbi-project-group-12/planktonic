import { createStore, useStore } from 'zustand';
import type { AppSocket } from './socket';

/**
 * The tab's connection state (STACK §3.3, `useConnectionStore`). Transport state only: no server
 * data goes in here. `syncing` means "connected, but the data on screen may be incomplete while
 * the catch-up runs" (§4.4, UL-130): from a `connect` while a catch-up is registered
 * (`registerCatchUp`) until every catch-up started for it has settled, and around a catch-up started
 * on a live connection (`syncWith`, a seq gap).
 */
export type ConnectionState = 'connecting' | 'connected' | 'syncing' | 'offline';

/**
 * Socket.IO lifecycle events, as the listeners below see them.
 *
 * | Emitter                 | Event               | State      |
 * |-------------------------|---------------------|------------|
 * | (initial)               | —                   | connecting |
 * | socket                  | `connect`           | syncing if a catch-up is registered, else connected |
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
 *
 * Two events come from the catch-up bookkeeping below, not from Socket.IO:
 * - `sync_start` (`syncWith`): `connected` → `syncing`; any other state is kept (a catch-up while
 *   offline or connecting does not claim the connection is up);
 * - `sync_done` (the last running catch-up settled): `syncing` → `connected`; any other state is
 *   kept, so a catch-up that ends after a disconnect leaves `offline`, not `connected`.
 */
export type ConnectionEvent =
  | { type: 'connect'; sync: boolean }
  | { type: 'disconnect'; reason: string }
  | { type: 'connect_error' }
  | { type: 'reconnect_attempt'; attempt: number }
  | { type: 'reconnect' }
  | { type: 'reconnect_error' }
  | { type: 'reconnect_failed' }
  | { type: 'sync_start' }
  | { type: 'sync_done' };

/** Pure event → state step, so every transition is testable without a socket. */
export function nextConnectionState(
  state: ConnectionState,
  event: ConnectionEvent,
): ConnectionState {
  switch (event.type) {
    case 'connect':
      return event.sync ? 'syncing' : 'connected';
    case 'sync_start':
      return state === 'connected' ? 'syncing' : state;
    case 'sync_done':
      return state === 'syncing' ? 'connected' : state;
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

/** A catch-up: brings the data on screen up to date after a (re)connect (UL-130). */
export type CatchUpTask = () => Promise<void>;

// Run on every `connect`. Module state like the store: the transport owns it, a feed registers.
const catchUps = new Set<CatchUpTask>();
// Catch-ups started and not yet settled. `syncing` ends when the last one does, so a catch-up from
// an earlier connection that ends late does not cut the current one short.
let running = 0;

/** Runs `task`, counted as a running catch-up; never rejects (the task reports its own errors). */
async function track(task: () => Promise<unknown>): Promise<void> {
  running += 1;
  try {
    await task();
  } catch (error) {
    console.warn('connection: a catch-up failed', error);
  } finally {
    running -= 1;
    if (running === 0) apply({ type: 'sync_done' });
  }
}

/**
 * Registers a catch-up to run on every `connect` (the first and each reconnect) and returns the
 * unregister. While any is registered, `connect` shows `syncing` until all of them settle. The
 * transport, not the caller, writes the state: a feed only says what to run (STACK §3.3).
 */
export function registerCatchUp(task: CatchUpTask): () => void {
  catchUps.add(task);
  return () => {
    catchUps.delete(task);
  };
}

/**
 * Runs a catch-up on a live connection (a seq gap in a live event, a remount on an already
 * connected socket) and shows `syncing` while it runs. Resolves when it settles; never rejects.
 */
export function syncWith(task: CatchUpTask): Promise<void> {
  apply({ type: 'sync_start' });
  return track(task);
}

/** Test-only: back to the initial state, no catch-ups. Not exported from `@/shared/api`. */
export function resetConnectionStore(): void {
  catchUps.clear();
  running = 0;
  connectionStore.setState(INITIAL, true);
}

/**
 * Attaches the lifecycle listeners that write the store. Called once per tab, by `getSocket()`
 * when it creates the singleton — never from a component, where `reactStrictMode` would attach
 * them twice. Returns the unbind for tests.
 */
export function bindConnectionListeners(socket: AppSocket): () => void {
  const onConnect = () => {
    const tasks = [...catchUps];
    apply({ type: 'connect', sync: tasks.length > 0 });
    if (tasks.length === 0) return;
    void track(() => Promise.allSettled(tasks.map((task) => task())));
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
