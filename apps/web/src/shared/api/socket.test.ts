import { io } from 'socket.io-client';
import { describe, expect, it, vi } from 'vitest';
import { bindConnectionListeners } from './connection';
import { getSocket } from './socket';

vi.mock('socket.io-client', () => ({ io: vi.fn(() => ({})) }));
vi.mock('./connection', () => ({ bindConnectionListeners: vi.fn() }));

describe('getSocket', () => {
  it('creates one client per tab on the page origin, not connected yet, with listeners bound once', () => {
    const first = getSocket();
    const second = getSocket();
    expect(second).toBe(first);
    expect(io).toHaveBeenCalledTimes(1);
    expect(io).toHaveBeenCalledWith({ path: '/socket.io', autoConnect: false });
    // The connection-state listeners go on the singleton exactly once.
    expect(bindConnectionListeners).toHaveBeenCalledTimes(1);
    expect(bindConnectionListeners).toHaveBeenCalledWith(first);
  });
});
