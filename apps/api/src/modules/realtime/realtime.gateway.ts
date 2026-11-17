import { Logger } from '@nestjs/common';
import {
  WebSocketGateway,
  WebSocketServer,
  type OnGatewayConnection,
  type OnGatewayInit,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { DEBUG_ROOM, RealtimeService } from './realtime.service.js';

/** WS adapter: binds the server for RealtimeService and assigns rooms on the server side only. */
@WebSocketGateway({
  path: '/socket.io',
})
export class RealtimeGateway implements OnGatewayInit, OnGatewayConnection {
  private readonly logger = new Logger(RealtimeGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(private readonly realtime: RealtimeService) {}

  afterInit(server: Server): void {
    this.realtime.bindServer(server);
  }

  async handleConnection(client: Socket): Promise<void> {
    if (!this.realtime.debugEnabled) return;

    try {
      await client.join(DEBUG_ROOM);
      this.logger.debug(`Socket connected: ${client.id}`);
    } catch (error) {
      this.logger.error(
        `Failed to join debug channel: ${client.id}`,
        error instanceof Error ? error.stack : String(error),
      );
      client.disconnect(true);
    }
  }
}
