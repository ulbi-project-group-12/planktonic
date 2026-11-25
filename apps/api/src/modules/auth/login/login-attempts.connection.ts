import {
  Injectable,
  Logger,
  ServiceUnavailableException,
  type OnApplicationShutdown,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, type RedisClientType } from 'redis';
import type { Env } from '../../../core/config/env.js';
import { LoginAttemptsStore } from './login-attempts.store.js';

const REDIS_OPERATION_TIMEOUT_MS = 2_000;

@Injectable()
export class LoginAttemptsConnection implements OnApplicationShutdown {
  private readonly logger = new Logger(LoginAttemptsConnection.name);
  private client?: RedisClientType;
  private connecting?: Promise<unknown>;

  constructor(private readonly config: ConfigService<Env, true>) {}

  async run<T>(operation: (store: LoginAttemptsStore) => Promise<T>): Promise<T> {
    let timeout: NodeJS.Timeout | undefined;
    try {
      const client = (this.client ??= this.createClient());
      if (!client.isReady) {
        this.connecting ??= client.connect().finally(() => {
          this.connecting = undefined;
        });
        await this.connecting;
      }
      // The Redis client's command timeout only covers its queue before sending.
      // Bound the reply as well, and close the socket only if an operation stalls.
      return await Promise.race([
        operation(new LoginAttemptsStore(client)),
        new Promise<never>((_, reject) => {
          timeout = setTimeout(() => {
            if (client.isOpen) client.destroy();
            reject(new Error('Login rate-limit Redis operation timed out'));
          }, REDIS_OPERATION_TIMEOUT_MS);
        }),
      ]);
    } catch {
      throw new ServiceUnavailableException('Login is unavailable');
    } finally {
      clearTimeout(timeout);
    }
  }

  onApplicationShutdown(): void {
    if (this.client?.isOpen) this.client.destroy();
  }

  private createClient(): RedisClientType {
    const client: RedisClientType = createClient({
      url: this.config.get('REDIS_URL', { infer: true }),
      disableOfflineQueue: true,
      socket: { connectTimeout: 1_000, reconnectStrategy: false },
    });
    client.on('error', () => {
      this.logger.warn('Login rate-limit Redis connection failed');
    });
    return client;
  }
}
