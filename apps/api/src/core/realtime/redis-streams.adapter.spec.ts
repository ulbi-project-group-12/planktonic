import type { INestApplicationContext } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-streams-adapter';
import type { RedisClientType } from 'redis';
import type { Server, ServerOptions } from 'socket.io';
import { afterEach, expect, it, vi } from 'vitest';
import { RedisStreamsAdapter, STREAM_BLOCK_TIME_MS } from './redis-streams.adapter.js';

vi.mock('@socket.io/redis-streams-adapter', () => ({ createAdapter: vi.fn(() => vi.fn()) }));
afterEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

it('does not create the Streams factory or duplicate Redis clients in the constructor', () => {
  const redisClient = { duplicate: vi.fn() };

  new RedisStreamsAdapter({} as INestApplicationContext, redisClient as unknown as RedisClientType);

  expect(createAdapter).not.toHaveBeenCalled();
  expect(redisClient.duplicate).not.toHaveBeenCalled();
});

it('creates the factory after the server and reuses it for subsequent servers', () => {
  const firstServer = { adapter: vi.fn() };
  const secondServer = { adapter: vi.fn() };
  const createServer = vi
    .spyOn(IoAdapter.prototype, 'createIOServer')
    .mockImplementationOnce(() => {
      expect(createAdapter).not.toHaveBeenCalled();
      return firstServer as unknown as Server;
    })
    .mockReturnValueOnce(secondServer as unknown as Server);
  const redisClient = {} as RedisClientType;
  const adapter = new RedisStreamsAdapter({} as INestApplicationContext, redisClient);

  expect(adapter.createIOServer(0)).toBe(firstServer);
  expect(createAdapter).toHaveBeenCalledExactlyOnceWith(redisClient, {
    blockTimeInMs: STREAM_BLOCK_TIME_MS,
  });
  const factory: unknown = vi.mocked(createAdapter).mock.results[0]?.value;
  expect(firstServer.adapter).toHaveBeenCalledExactlyOnceWith(factory);
  expect(adapter.createIOServer(0)).toBe(secondServer);
  expect(createServer).toHaveBeenCalledTimes(2);
  expect(createAdapter).toHaveBeenCalledTimes(1);
  expect(secondServer.adapter).toHaveBeenCalledExactlyOnceWith(factory);
});

it('does not create the factory when Socket.IO server creation fails', () => {
  const error = new Error('server creation failed');
  vi.spyOn(IoAdapter.prototype, 'createIOServer').mockImplementationOnce(() => {
    throw error;
  });
  const adapter = new RedisStreamsAdapter({} as INestApplicationContext, {} as RedisClientType);

  expect(() => adapter.createIOServer(0)).toThrow(error);
  expect(createAdapter).not.toHaveBeenCalled();
});

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
