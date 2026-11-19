import { io } from 'socket.io-client';
import { describe, expect, it, vi } from 'vitest';
import { getSocket } from './socket';

vi.mock('socket.io-client', () => ({ io: vi.fn(() => ({})) }));

describe('getSocket', () => {
  it('creates one client per tab on the page origin, not connected yet', () => {
    const first = getSocket();
    const second = getSocket();
    expect(second).toBe(first);
    expect(io).toHaveBeenCalledTimes(1);
    expect(io).toHaveBeenCalledWith({ path: '/socket.io', autoConnect: false });
  });
});
