import { ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { afterEach, expect, it, vi } from 'vitest';
import type { Env } from '../../../core/config/env.js';
import { LoginAttemptsConnection } from './login-attempts.connection.js';

const { createClient } = vi.hoisted(() => ({ createClient: vi.fn() }));
vi.mock('redis', () => ({ createClient }));

afterEach(() => {
  createClient.mockReset();
  vi.useRealTimers();
});

it('keeps the connection through idle time and reconnects after a stalled operation', async () => {
  vi.useFakeTimers();
  const client = {
    isOpen: false,
    isReady: false,
    on: vi.fn(),
    connect: vi.fn(() => {
      client.isOpen = true;
      client.isReady = true;
      return Promise.resolve();
    }),
    destroy: vi.fn(() => {
      client.isOpen = false;
      client.isReady = false;
    }),
  };
  createClient.mockReturnValue(client);
  const config = new ConfigService<Env, true>({ REDIS_URL: 'redis://localhost:6379' });
  const connection = new LoginAttemptsConnection(config);
  const operation = () => Promise.resolve('ok');

  await expect(connection.run(operation)).resolves.toBe('ok');
  await vi.advanceTimersByTimeAsync(3_000);
  await expect(connection.run(operation)).resolves.toBe('ok');
  expect(client.connect).toHaveBeenCalledOnce();
  expect(client.destroy).not.toHaveBeenCalled();
  expect(createClient.mock.calls[0]?.[0]).toMatchObject({
    socket: { connectTimeout: 1_000, reconnectStrategy: false },
  });
  expect(createClient.mock.calls[0]?.[0]).not.toHaveProperty('socket.socketTimeout');

  const stalled = expect(connection.run(() => new Promise(() => {}))).rejects.toBeInstanceOf(
    ServiceUnavailableException,
  );
  await vi.advanceTimersByTimeAsync(2_000);
  await stalled;
  expect(client.destroy).toHaveBeenCalledOnce();

  await expect(connection.run(operation)).resolves.toBe('ok');
  expect(client.connect).toHaveBeenCalledTimes(2);
  connection.onApplicationShutdown();
});
