import type { RedisClientType } from 'redis';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RedisConnectionLifecycle } from './redis-connection.lifecycle.js';

afterEach(() => vi.useRealTimers());

describe('RedisConnectionLifecycle', () => {
  it('clears the deadline after a fast close without destroying the client', async () => {
    vi.useFakeTimers();
    const lifecycle = new RedisConnectionLifecycle();
    const client = { isOpen: true, close: vi.fn().mockResolvedValue(undefined), destroy: vi.fn() };
    lifecycle.register(client as unknown as RedisClientType);

    await lifecycle.onApplicationShutdown();

    expect(client.close).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
    await vi.advanceTimersByTimeAsync(5_000);
    expect(client.destroy).not.toHaveBeenCalled();
  });

  it.each([true, false])(
    'destroys a stalled close even when isOpen becomes %s and handles a late rejection',
    async (isOpenDuringClose) => {
      vi.useFakeTimers();
      const lifecycle = new RedisConnectionLifecycle();
      let rejectClose!: (error: Error) => void;
      const client = {
        isOpen: true,
        close: vi.fn(() => {
          client.isOpen = isOpenDuringClose;
          return new Promise<void>((_, reject) => {
            rejectClose = reject;
          });
        }),
        destroy: vi.fn(),
      };
      lifecycle.register(client as unknown as RedisClientType);
      const shutdown = lifecycle.onApplicationShutdown();
      const failure = expect(shutdown).rejects.toThrow('Redis shutdown timed out');

      await vi.advanceTimersByTimeAsync(4_999);
      expect(client.destroy).not.toHaveBeenCalled();
      await vi.advanceTimersByTimeAsync(1);
      await failure;

      expect(client.destroy).toHaveBeenCalledTimes(1);
      expect(vi.getTimerCount()).toBe(0);
      rejectClose(new Error('late close failure'));
      await vi.advanceTimersByTimeAsync(0);
      await lifecycle.onApplicationShutdown();
      expect(client.close).toHaveBeenCalledTimes(1);
      expect(client.destroy).toHaveBeenCalledTimes(1);
    },
  );

  it('waits for Redis to close and releases the registered client', async () => {
    const lifecycle = new RedisConnectionLifecycle();
    let finishClose!: () => void;
    const close = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finishClose = resolve;
        }),
    );
    const client = { isOpen: true, close, destroy: vi.fn() };
    lifecycle.register(client as unknown as RedisClientType);

    let completed = false;
    const shutdown = lifecycle.onApplicationShutdown().then(() => {
      completed = true;
    });
    await Promise.resolve();
    expect(completed).toBe(false);
    finishClose();
    await shutdown;
    await lifecycle.onApplicationShutdown();
    expect(close).toHaveBeenCalledTimes(1);
    expect(client.destroy).not.toHaveBeenCalled();
  });

  it('destroys the connection if graceful closing fails', async () => {
    vi.useFakeTimers();
    const lifecycle = new RedisConnectionLifecycle();
    const error = new Error('close failed');
    const client = { isOpen: true, close: vi.fn().mockRejectedValue(error), destroy: vi.fn() };
    lifecycle.register(client as unknown as RedisClientType);

    await expect(lifecycle.onApplicationShutdown()).rejects.toBe(error);
    expect(client.destroy).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
    await expect(lifecycle.onApplicationShutdown()).resolves.toBeUndefined();
  });

  it('does not close an already closed client', async () => {
    const lifecycle = new RedisConnectionLifecycle();
    const client = { isOpen: false, close: vi.fn(), destroy: vi.fn() };
    lifecycle.register(client as unknown as RedisClientType);

    await lifecycle.onApplicationShutdown();
    expect(client.close).not.toHaveBeenCalled();
  });

  it('destroys duplicates still open after the publisher closes, and only those', async () => {
    const lifecycle = new RedisConnectionLifecycle();
    const client = { isOpen: true, close: vi.fn().mockResolvedValue(undefined), destroy: vi.fn() };
    const reading = { isOpen: true, destroy: vi.fn() };
    const closed = { isOpen: false, destroy: vi.fn() };
    lifecycle.register(client as unknown as RedisClientType);
    lifecycle.track(reading);
    lifecycle.track(closed);

    await lifecycle.onApplicationShutdown();

    expect(client.destroy).not.toHaveBeenCalled();
    expect(reading.destroy).toHaveBeenCalledOnce();
    expect(closed.destroy).not.toHaveBeenCalled();
    await lifecycle.onApplicationShutdown();
    expect(reading.destroy).toHaveBeenCalledOnce();
  });

  it('destroys duplicates after a stalled publisher close too', async () => {
    vi.useFakeTimers();
    const lifecycle = new RedisConnectionLifecycle();
    const client = { isOpen: true, close: vi.fn(() => new Promise(() => {})), destroy: vi.fn() };
    const connecting = { isOpen: true, destroy: vi.fn() };
    lifecycle.register(client as unknown as RedisClientType);
    lifecycle.track(connecting);

    const failure = expect(lifecycle.onApplicationShutdown()).rejects.toThrow(
      'Redis shutdown timed out',
    );
    await vi.advanceTimersByTimeAsync(5_000);
    await failure;

    expect(client.destroy).toHaveBeenCalledOnce();
    expect(connecting.destroy).toHaveBeenCalledOnce();
  });

  it('destroys tracked duplicates even when no publisher was registered', async () => {
    const lifecycle = new RedisConnectionLifecycle();
    const orphan = { isOpen: true, destroy: vi.fn() };
    lifecycle.track(orphan);

    await lifecycle.onApplicationShutdown();

    expect(orphan.destroy).toHaveBeenCalledOnce();
  });
});
