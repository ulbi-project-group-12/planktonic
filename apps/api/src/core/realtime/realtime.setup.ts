import { Logger, type INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from 'redis';
import type { Env } from '../config/env.js';
import { INSTANCE_ID } from '../instance/instance-id.provider.js';
import { RedisStreamsAdapter } from './redis-streams.adapter.js';
import { RedisConnectionLifecycle } from './redis-connection.lifecycle.js';

const REDIS_STARTUP_TIMEOUT_MS = 10_000;

export async function configureRealtime(app: INestApplication): Promise<void> {
  const logger = new Logger('Realtime');

  const config = app.get<ConfigService<Env, true>>(ConfigService);
  const lifecycle = app.get(RedisConnectionLifecycle);

  const redisUrl = config.get('REDIS_URL', { infer: true });
  const instanceId = app.get<string>(INSTANCE_ID);

  // The name (CLIENT SETNAME) carries over to the adapter's duplicated read and sub connections,
  // so `CLIENT LIST` shows which replica holds which connection. The offline queue keeps its
  // default: commands sent during a Redis outage wait in memory until it reconnects.
  const redisClient = createClient({
    url: redisUrl,
    name: `api:${instanceId}`,
  });

  redisClient.on('error', (error: Error) => {
    logger.error('Redis error', error.stack);
  });

  let startupTimer: NodeJS.Timeout | undefined;
  try {
    await Promise.race([
      redisClient.connect(),
      new Promise<never>((_, reject) => {
        startupTimer = setTimeout(() => {
          reject(new Error('Redis startup connection timed out'));
        }, REDIS_STARTUP_TIMEOUT_MS);
      }),
    ]);

    // The adapter duplicates the client for its read and sub connections; route every copy
    // through the lifecycle so shutdown bounds them as well.
    const duplicate = redisClient.duplicate.bind(redisClient);
    redisClient.duplicate = ((...args: Parameters<typeof duplicate>) => {
      const copy = duplicate(...args);
      lifecycle.track(copy);
      return copy;
    }) as typeof redisClient.duplicate;

    const adapter = new RedisStreamsAdapter(app, redisClient);

    app.useWebSocketAdapter(adapter);

    lifecycle.register(redisClient);

    logger.log('Redis Streams adapter configured');
  } catch (error) {
    if (redisClient.isOpen) {
      redisClient.destroy();
    }

    throw error;
  } finally {
    clearTimeout(startupTimer);
  }
}
