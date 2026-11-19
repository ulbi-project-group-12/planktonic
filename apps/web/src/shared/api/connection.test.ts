import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  bindConnectionListeners,
  getConnectionState,
  nextConnectionState,
  resetConnectionStore,
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
  [{ type: 'connect' }, 'connected'],
  [{ type: 'disconnect', reason: 'transport close' }, 'offline'],
  [{ type: 'disconnect', reason: 'ping timeout' }, 'offline'],
  [{ type: 'disconnect', reason: 'io server disconnect' }, 'offline'],
  [{ type: 'disconnect', reason: 'io client disconnect' }, 'offline'],
  [{ type: 'connect_error' }, 'offline'],
  [{ type: 'reconnect_attempt', attempt: 1 }, 'connecting'],
  [{ type: 'reconnect' }, 'connected'],
  [{ type: 'reconnect_error' }, 'offline'],
  [{ type: 'reconnect_failed' }, 'offline'],
];

describe('nextConnectionState', () => {
  it.each(TABLE)('%o → %s from every state', (event, expected) => {
    for (const from of STATES) expect(nextConnectionState(from, event)).toBe(expected);
  });

  it('never enters syncing on its own (UL-130 switches it on)', () => {
    for (const [event] of TABLE) {
      for (const from of STATES) expect(nextConnectionState(from, event)).not.toBe('syncing');
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
    manager.fire('reconnect', 2);
    socket.fire('connect');
    seen.push(getConnectionState());

    expect(seen).toEqual([
      'connected',
      'offline',
      'connecting',
      'offline',
      'connecting',
      'connected',
    ]);
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
