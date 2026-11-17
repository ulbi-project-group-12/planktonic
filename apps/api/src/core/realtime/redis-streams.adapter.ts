import type { INestApplicationContext } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-streams-adapter';
import type { RedisClientType } from 'redis';
import type { Server, ServerOptions } from 'socket.io';

/**
 * How long one XREAD blocks. The adapter closes its read connection only after the current
 * XREAD returns, so this bounds how long that connection outlives `app.close()`.
 */
export const STREAM_BLOCK_TIME_MS = 2_000;

export class RedisStreamsAdapter extends IoAdapter {
  private streamsAdapter?: ReturnType<typeof createAdapter>;

  constructor(
    app: INestApplicationContext,
    private readonly redisClient: RedisClientType,
  ) {
    super(app);
  }

  override createIOServer(port: number, options?: Partial<ServerOptions>): Server {
    // Connection State Recovery stays off: reconnect catch-up goes through REST (architecture §4.4).
    const serverOptions = { ...options };
    delete serverOptions.connectionStateRecovery;
    const server = super.createIOServer(port, serverOptions as ServerOptions);

    this.streamsAdapter ??= createAdapter(this.redisClient, {
      blockTimeInMs: STREAM_BLOCK_TIME_MS,
    });
    server.adapter(this.streamsAdapter);
    return server;
  }
}
