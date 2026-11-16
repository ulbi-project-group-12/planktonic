import type { INestApplicationContext } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import type { RedisClientType } from 'redis';
import type { Server, ServerOptions } from 'socket.io';
import { afterEach, expect, it, vi } from 'vitest';
import { RedisStreamsAdapter } from './redis-streams.adapter.js';

vi.mock('@socket.io/redis-streams-adapter', () => ({ createAdapter: vi.fn(() => vi.fn()) }));
afterEach(() => vi.restoreAllMocks());

it('removes explicitly requested connection state recovery without mutating caller options', () => {
  const server = { adapter: vi.fn() };
  const create = vi
    .spyOn(IoAdapter.prototype, 'createIOServer')
    .mockReturnValue(server as unknown as Server);
  const adapter = new RedisStreamsAdapter({} as INestApplicationContext, {} as RedisClientType);
  const options: Partial<ServerOptions> = {
    path: '/socket.io',
    connectionStateRecovery: { maxDisconnectionDuration: 60_000 },
  };

  expect(adapter.createIOServer(0, options)).toBe(server);
  expect(create).toHaveBeenCalledWith(0, { path: '/socket.io' });
  expect(options.connectionStateRecovery).toEqual({ maxDisconnectionDuration: 60_000 });
  expect(server.adapter).toHaveBeenCalledOnce();
});
