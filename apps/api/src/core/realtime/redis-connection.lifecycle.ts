import { Injectable, Logger, type OnApplicationShutdown } from '@nestjs/common';
import type { RedisClientType } from 'redis';

const REDIS_SHUTDOWN_TIMEOUT_MS = 5_000;

/**
 * Closes the publishing client registered by `configureRealtime`, with a deadline. The adapter
 * duplicates it into a read and a sub connection; those it closes itself when Nest closes the
 * Socket.IO server, which happens before `onApplicationShutdown`. The read connection goes away
 * once its current XREAD returns (`STREAM_BLOCK_TIME_MS`), so the deadline here is not the upper
 * bound of the whole shutdown.
 */
@Injectable()
export class RedisConnectionLifecycle implements OnApplicationShutdown {
  private readonly logger = new Logger(RedisConnectionLifecycle.name);

  private redisClient?: RedisClientType;

  register(client: RedisClientType): void {
    if (this.redisClient) {
      throw new Error('Redis client is already registered');
    }

    this.redisClient = client;
  }

  async onApplicationShutdown(): Promise<void> {
    const client = this.redisClient;

    if (!client) {
      return;
    }

    let shutdownTimer: NodeJS.Timeout | undefined;
    try {
      if (client.isOpen) {
        await Promise.race([
          client.close(),
          new Promise<never>((_, reject) => {
            shutdownTimer = setTimeout(() => {
              reject(new Error('Redis shutdown timed out'));
            }, REDIS_SHUTDOWN_TIMEOUT_MS);
          }),
        ]);
      }

      this.logger.log('Redis connection closed');
    } catch (error) {
      client.destroy();
      throw error;
    } finally {
      clearTimeout(shutdownTimer);
      this.redisClient = undefined;
    }
  }
}
