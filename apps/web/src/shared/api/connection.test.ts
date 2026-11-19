import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  bindConnectionListeners,
  getConnectionState,
  nextConnectionState,
  registerCatchUp,
  resetConnectionStore,
  syncWith,
  useConnectionStore,
  type ConnectionEvent,
  type ConnectionState,
} from './connection';
import type { AppSocket } from './socket';

type Handler = (...args: unknown[]) => void;

/** A minimal emitter with the `on`/`off` shape of a Socket.IO socket or manager. */
function fakeEmitter() {
  const handlers = new Map<string, Set<Handler>>();
  return {
    on(event: string, fn: Handler) {
      let set = handlers.get(event);
      if (!set) {
        set = new Set();
        handlers.set(event, set);
      }
      set.add(fn);
    },
    off(event: string, fn: Handler) {
      handlers.get(event)?.delete(fn);
    },
    fire(event: string, ...args: unknown[]) {
      for (const fn of [...(handlers.get(event) ?? [])]) fn(...args);
    },
    count(event: string) {
      return handlers.get(event)?.size ?? 0;
    },
    total() {
      return [...handlers.values()].reduce((sum, set) => sum + set.size, 0);
    },
  };
}

function fakeSocket() {
  const socket = fakeEmitter();
  const manager = fakeEmitter();
  return { socket, manager, asSocket: { ...socket, io: manager } as unknown as AppSocket };
}

const STATES: ConnectionState[] = ['connecting', 'connected', 'syncing', 'offline'];

const TABLE: [ConnectionEvent, ConnectionState][] = [
  [{ type: 'connect', sync: false }, 'connected'],
  [{ type: 'connect', sync: true }, 'syncing'],
  [{ type: 'disconnect', reason: 'transport close' }, 'offline'],
  [{ type: 'disconnect', reason: 'ping timeout' }, 'offline'],
  [{ type: 'disconnect', reason: 'io server disconnect' }, 'offline'],
  [{ type: 'disconnect', reason: 'io client disconnect' }, 'offline'],
  [{ type: 'connect_error' }, 'offline'],
  [{ type: 'reconnect_attempt', attempt: 1 }, 'connecting'],
  [{ type: 'reconnect' }, 'connecting'],
  [{ type: 'reconnect_error' }, 'offline'],
  [{ type: 'reconnect_failed' }, 'offline'],
];

describe('nextConnectionState', () => {
  it.each(TABLE)('%o → %s from every state', (event, expected) => {
    for (const from of STATES) expect(nextConnectionState(from, event)).toBe(expected);
  });

  it('sync_start enters syncing only from connected', () => {
    expect(nextConnectionState('connected', { type: 'sync_start' })).toBe('syncing');
    for (const from of ['connecting', 'syncing', 'offline'] as const) {
      expect(nextConnectionState(from, { type: 'sync_start' })).toBe(from);
    }
  });

  it('sync_done leaves syncing only, so a late one after a disconnect stays offline', () => {
    expect(nextConnectionState('syncing', { type: 'sync_done' })).toBe('connected');
    for (const from of ['connecting', 'connected', 'offline'] as const) {
      expect(nextConnectionState(from, { type: 'sync_done' })).toBe(from);
    }
  });
});

describe('connection store + lifecycle listeners', () => {
  let unbind: (() => void) | undefined;

  beforeEach(() => {
    unbind?.();
    unbind = undefined;
    resetConnectionStore();
  });

  it('starts in connecting', () => {
    expect(getConnectionState()).toBe('connecting');
  });

  it('follows a network drop and recovery: connected → offline → connecting → connected', () => {
    const { socket, manager, asSocket } = fakeSocket();
    unbind = bindConnectionListeners(asSocket);
    const seen: ConnectionState[] = [];

    socket.fire('connect');
    seen.push(getConnectionState());
    socket.fire('disconnect', 'transport close');
    seen.push(getConnectionState());
    manager.fire('reconnect_attempt', 1);
    seen.push(getConnectionState());
    socket.fire('connect_error', new Error('xhr poll error'));
    manager.fire('reconnect_error', new Error('xhr poll error'));
    seen.push(getConnectionState());
    manager.fire('reconnect_attempt', 2);
    seen.push(getConnectionState());
    // socket.io-client order: the manager's reconnect (transport open) comes before the socket's
    // connect (namespace accepted), possibly much later if the server middleware is slow.
    manager.fire('reconnect', 2);
    seen.push(getConnectionState());
    socket.fire('connect');
    seen.push(getConnectionState());

    expect(seen).toEqual([
      'connected',
      'offline',
      'connecting',
      'offline',
      'connecting',
      'connecting',
      'connected',
    ]);
  });

  it('a reconnect rejected by the server middleware never shows connected', () => {
    const { socket, manager, asSocket } = fakeSocket();
    unbind = bindConnectionListeners(asSocket);
    socket.fire('disconnect', 'transport close');
    manager.fire('reconnect_attempt', 1);
    manager.fire('reconnect', 1);
    expect(getConnectionState()).toBe('connecting');
    socket.fire('connect_error', new Error('unauthorized'));
    expect(getConnectionState()).toBe('offline');
  });

  it('stays offline after a server-side disconnect (no automatic retry)', () => {
    const { socket, asSocket } = fakeSocket();
    unbind = bindConnectionListeners(asSocket);
    socket.fire('connect');
    socket.fire('disconnect', 'io server disconnect');
    expect(getConnectionState()).toBe('offline');
  });

  it('listens for reconnect_* on the manager, not on the socket', () => {
    const { socket, manager, asSocket } = fakeSocket();
    unbind = bindConnectionListeners(asSocket);
    for (const event of ['reconnect_attempt', 'reconnect', 'reconnect_error', 'reconnect_failed']) {
      expect(manager.count(event)).toBe(1);
      expect(socket.count(event)).toBe(0);
    }
    for (const event of ['connect', 'disconnect', 'connect_error']) {
      expect(socket.count(event)).toBe(1);
    }
    socket.fire('connect');
    socket.fire('reconnect_attempt', 1);
    expect(getConnectionState()).toBe('connected');
  });

  it('unbind removes every listener', () => {
    const { socket, manager, asSocket } = fakeSocket();
    bindConnectionListeners(asSocket)();
    expect(socket.total() + manager.total()).toBe(0);
    socket.fire('connect');
    expect(getConnectionState()).toBe('connecting');
  });

  it('the hook re-renders readers on each transition', () => {
    const { socket, asSocket } = fakeSocket();
    unbind = bindConnectionListeners(asSocket);
    const { result } = renderHook(() => useConnectionStore((s) => s.state));
    expect(result.current).toBe('connecting');
    act(() => {
      socket.fire('connect');
    });
    expect(result.current).toBe('connected');
    act(() => {
      socket.fire('disconnect', 'transport close');
    });
    expect(result.current).toBe('offline');
  });

  it('exposes no way to write the store from a reader', () => {
    const { result } = renderHook(() => useConnectionStore((s) => s));
    expect(Object.keys(result.current)).toEqual(['state']);
  });
});

/** A promise and its resolve/reject, to hold a catch-up open. */
function deferred() {
  let resolve!: () => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('catch-up and syncing (UL-130)', () => {
  let unbind: (() => void) | undefined;

  beforeEach(() => {
    unbind?.();
    unbind = undefined;
    resetConnectionStore();
  });

  it('connect with a registered catch-up shows syncing until it settles, then connected', async () => {
    const { socket, asSocket } = fakeSocket();
    unbind = bindConnectionListeners(asSocket);
    const held = deferred();
    const task = vi.fn(() => held.promise);
    registerCatchUp(task);

    socket.fire('connect');
    expect(getConnectionState()).toBe('syncing');
    expect(task).toHaveBeenCalledTimes(1);

    held.resolve();
    await vi.waitFor(() => {
      expect(getConnectionState()).toBe('connected');
    });
  });

  it('every reconnect runs the catch-up again and shows syncing again', async () => {
    const { socket, asSocket } = fakeSocket();
    unbind = bindConnectionListeners(asSocket);
    const task = vi.fn(() => Promise.resolve());
    registerCatchUp(task);

    socket.fire('connect');
    await vi.waitFor(() => {
      expect(getConnectionState()).toBe('connected');
    });
    socket.fire('disconnect', 'transport close');
    socket.fire('connect');
    expect(getConnectionState()).toBe('syncing');
    await vi.waitFor(() => {
      expect(getConnectionState()).toBe('connected');
    });
    expect(task).toHaveBeenCalledTimes(2);
  });

  it('a failed catch-up still ends syncing (the feed shows its own error)', async () => {
    const { socket, asSocket } = fakeSocket();
    unbind = bindConnectionListeners(asSocket);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    registerCatchUp(() => Promise.reject(new Error('offline')));

    socket.fire('connect');
    await vi.waitFor(() => {
      expect(getConnectionState()).toBe('connected');
    });
    warn.mockRestore();
  });

  it('a disconnect during the catch-up shows offline, and its late end does not say connected', async () => {
    const { socket, asSocket } = fakeSocket();
    unbind = bindConnectionListeners(asSocket);
    const held = deferred();
    registerCatchUp(() => held.promise);

    socket.fire('connect');
    socket.fire('disconnect', 'transport close');
    expect(getConnectionState()).toBe('offline');
    held.resolve();
    await held.promise;
    await Promise.resolve();
    expect(getConnectionState()).toBe('offline');
  });

  it('an older catch-up ending late does not cut the current one short', async () => {
    const { socket, asSocket } = fakeSocket();
    unbind = bindConnectionListeners(asSocket);
    const first = deferred();
    const second = deferred();
    const task = vi.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    registerCatchUp(task);

    socket.fire('connect');
    socket.fire('disconnect', 'transport close');
    socket.fire('connect');
    first.resolve();
    await first.promise;
    await Promise.resolve();
    expect(getConnectionState()).toBe('syncing');

    second.resolve();
    await vi.waitFor(() => {
      expect(getConnectionState()).toBe('connected');
    });
  });

  it('connect with nothing registered goes straight to connected', () => {
    const { socket, asSocket } = fakeSocket();
    unbind = bindConnectionListeners(asSocket);
    const off = registerCatchUp(() => Promise.resolve());
    off();

    socket.fire('connect');
    expect(getConnectionState()).toBe('connected');
  });

  it('syncWith on a live connection shows syncing while the task runs', async () => {
    const { socket, asSocket } = fakeSocket();
    unbind = bindConnectionListeners(asSocket);
    socket.fire('connect');
    const held = deferred();

    const done = syncWith(() => held.promise);
    expect(getConnectionState()).toBe('syncing');
    held.resolve();
    await done;
    expect(getConnectionState()).toBe('connected');
  });

  it('syncWith while offline keeps offline', async () => {
    const { socket, asSocket } = fakeSocket();
    unbind = bindConnectionListeners(asSocket);
    socket.fire('disconnect', 'transport close');

    const done = syncWith(() => Promise.resolve());
    expect(getConnectionState()).toBe('offline');
    await done;
    expect(getConnectionState()).toBe('offline');
  });
});
