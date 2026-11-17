import { Injectable, Logger, type OnApplicationShutdown } from '@nestjs/common';
import type { RedisClientType } from 'redis';

const REDIS_SHUTDOWN_TIMEOUT_MS = 5_000;

/** What shutdown needs from a duplicated connection, whatever its module typing. */
export interface DuplicatedConnection {
  readonly isOpen: boolean;
  destroy(): void;
}

/**
 * Closes the publishing client registered by `configureRealtime` within a deadline, destroying it
 * after that. The adapter duplicates that client into a read and a sub connection and closes them
 * itself once Nest closes the Socket.IO server, but the read one only after its current XREAD,
 * and a duplicate still connecting to an unreachable Redis never. So every tracked duplicate that
 * is still open once the publisher is done is destroyed too: shutdown never waits on Redis longer
 * than the deadline. `destroy()` is idempotent, so the adapter's own later disconnect is harmless.
 */
@Injectable()
export class RedisConnectionLifecycle implements OnApplicationShutdown {
  private readonly logger = new Logger(RedisConnectionLifecycle.name);

  private redisClient?: RedisClientType;

  private readonly duplicates = new Set<DuplicatedConnection>();

  register(client: RedisClientType): void {
    if (this.redisClient) {
      throw new Error('Redis client is already registered');
    }

    this.redisClient = client;
  }

  /** A connection the adapter duplicated from the registered client. */
  track(duplicate: DuplicatedConnection): void {
    this.duplicates.add(duplicate);
  }

  async onApplicationShutdown(): Promise<void> {
    const client = this.redisClient;

    if (!client) {
      this.destroyDuplicates();
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
      this.destroyDuplicates();
    }
  }

  private destroyDuplicates(): void {
    for (const duplicate of this.duplicates) {
      if (duplicate.isOpen) duplicate.destroy();
    }
    this.duplicates.clear();
  }
}
