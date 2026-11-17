import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { INSTANCE_ID } from '../instance/instance-id.provider.js';
import { configureRealtime } from './realtime.setup.js';
import { RedisStreamsAdapter } from './redis-streams.adapter.js';
import { RedisConnectionLifecycle } from './redis-connection.lifecycle.js';

const { client, createAdapter, createClient } = vi.hoisted(() => ({
  client: {
    on: vi.fn(),
    connect: vi.fn(),
    destroy: vi.fn(),
    isOpen: true,
  },
  createAdapter: vi.fn(() => vi.fn()),
  createClient: vi.fn(),
}));

vi.mock('redis', () => ({ createClient }));
vi.mock('@socket.io/redis-streams-adapter', () => ({ createAdapter }));

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

beforeEach(() => {
  createClient.mockReturnValue(client);
});

function testApp() {
  const lifecycle = new RedisConnectionLifecycle();
  const register = vi.spyOn(lifecycle, 'register');
  const useWebSocketAdapter = vi.fn();
  const config = new ConfigService({ REDIS_URL: 'redis://127.0.0.1:6379' });
  const app = {
    get: (provider: unknown) =>
      provider === ConfigService ? config : provider === INSTANCE_ID ? 'test-api-1' : lifecycle,
    useWebSocketAdapter,
  } as unknown as INestApplication;
  return { app, register, useWebSocketAdapter };
}

describe('configureRealtime', () => {
  it('installs the adapter and registers cleanup after connecting', async () => {
    vi.useFakeTimers();
    client.connect.mockResolvedValueOnce(undefined);
    const { app, register, useWebSocketAdapter } = testApp();

    await configureRealtime(app);

    expect(createClient).toHaveBeenCalledExactlyOnceWith({
      url: 'redis://127.0.0.1:6379',
      name: 'api:test-api-1',
    });
    expect(client.connect).toHaveBeenCalledOnce();
    expect(createAdapter).not.toHaveBeenCalled();
    expect(useWebSocketAdapter).toHaveBeenCalledOnce();
    expect(useWebSocketAdapter).toHaveBeenCalledWith(expect.any(RedisStreamsAdapter));
    expect(register).toHaveBeenCalledWith(client);
    expect(client.destroy).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('bounds startup retries and destroys the pending connection', async () => {
    vi.useFakeTimers();
    client.connect.mockImplementationOnce(() => new Promise(() => {}));
    const { app, register, useWebSocketAdapter } = testApp();
    const failure = expect(configureRealtime(app)).rejects.toThrow(
      'Redis startup connection timed out',
    );

    await vi.advanceTimersByTimeAsync(10_000);
    await failure;

    expect(client.destroy).toHaveBeenCalledOnce();
    expect(register).not.toHaveBeenCalled();
    expect(useWebSocketAdapter).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('cleans up immediately if connecting rejects', async () => {
    vi.useFakeTimers();
    client.connect.mockRejectedValueOnce(new Error('connection failed'));
    const { app, register } = testApp();

    await expect(configureRealtime(app)).rejects.toThrow('connection failed');

    expect(client.destroy).toHaveBeenCalledOnce();
    expect(register).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
});
