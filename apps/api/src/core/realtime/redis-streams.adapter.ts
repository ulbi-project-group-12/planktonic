import type { INestApplicationContext } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-streams-adapter';
import type { RedisClientType } from 'redis';
import type { Server, ServerOptions } from 'socket.io';

export class RedisStreamsAdapter extends IoAdapter {
  private streamsAdapter?: ReturnType<typeof createAdapter>;

  constructor(
    app: INestApplicationContext,
    private readonly redisClient: RedisClientType,
  ) {
    super(app);
  }

  override createIOServer(port: number, options?: Partial<ServerOptions>): Server {
    // UL-124: reconnect catch-up belongs to REST, never Socket.IO session recovery.
    const serverOptions = { ...options };
    delete serverOptions.connectionStateRecovery;
    const server = super.createIOServer(port, serverOptions as ServerOptions);

    this.streamsAdapter ??= createAdapter(this.redisClient);
    server.adapter(this.streamsAdapter);
    return server;
  }
}
