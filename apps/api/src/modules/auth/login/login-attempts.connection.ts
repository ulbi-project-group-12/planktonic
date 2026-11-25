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
      // Bound both the Redis handshake and the command reply with one deadline.
      const deadline = new Promise<never>((_, reject) => {
        timeout = setTimeout(() => {
          reject(new Error('Login rate-limit Redis operation timed out'));
          if (this.client === client) {
            this.client = undefined;
            this.connecting = undefined;
            if (client.isOpen) client.destroy();
          }
        }, REDIS_OPERATION_TIMEOUT_MS);
      });
      return await Promise.race([deadline, this.runOnClient(client, operation)]);
    } catch {
      throw new ServiceUnavailableException('Login is unavailable');
    } finally {
      clearTimeout(timeout);
    }
  }

  private async runOnClient<T>(
    client: RedisClientType,
    operation: (store: LoginAttemptsStore) => Promise<T>,
  ): Promise<T> {
    if (!client.isReady) {
      this.connecting ??= client.connect().finally(() => {
        if (this.client === client) this.connecting = undefined;
      });
      await this.connecting;
    }
    // A handshake may settle after its deadline, by which point a new client can be in use.
    if (this.client !== client) throw new Error('Login rate-limit Redis client was replaced');
    return operation(new LoginAttemptsStore(client));
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
