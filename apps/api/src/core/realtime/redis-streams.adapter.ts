import type { INestApplicationContext } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-streams-adapter';
import type { RedisClientType } from 'redis';
import type { Server, ServerOptions } from 'socket.io';

export class RedisStreamsAdapter extends IoAdapter {
  private readonly streamsAdapter: ReturnType<typeof createAdapter>;

  constructor(app: INestApplicationContext, redisClient: RedisClientType) {
    super(app);
    this.streamsAdapter = createAdapter(redisClient);
  }

  override createIOServer(port: number, options?: Partial<ServerOptions>): Server {
    // UL-124: reconnect catch-up belongs to REST, never Socket.IO session recovery.
    const serverOptions = { ...options };
    delete serverOptions.connectionStateRecovery;
    const server = super.createIOServer(port, serverOptions as ServerOptions);

    server.adapter(this.streamsAdapter);
    return server;
  }
}
