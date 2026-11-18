import { Logger } from '@nestjs/common';
import {
  WebSocketGateway,
  WebSocketServer,
  type OnGatewayConnection,
  type OnGatewayInit,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { channelRoom } from '../../core/realtime/rooms.js';
import { ChannelsService } from '../channels/channels.service.js';
import { DEBUG_ROOM, RealtimeService } from './realtime.service.js';

/** WS adapter: binds the server for RealtimeService and assigns rooms on the server side only. */
@WebSocketGateway({
  path: '/socket.io',
})
export class RealtimeGateway implements OnGatewayInit, OnGatewayConnection {
  private readonly logger = new Logger(RealtimeGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly realtime: RealtimeService,
    private readonly channels: ChannelsService,
  ) {}

  afterInit(server: Server): void {
    this.realtime.bindServer(server);
  }

  /**
   * Joins the socket to `channel:{id}` for each of its user's channels (STACK §4.1). Until auth
   * lands (phase 3) every socket gets every channel. A socket that cannot get its
   * rooms is disconnected, so it never sits connected while silently missing events.
   */
  async handleConnection(client: Socket): Promise<void> {
    try {
      const channelIds = await this.channels.channelIdsForSocket();
      const rooms: string[] = channelIds.map(channelRoom);
      if (this.realtime.debugEnabled) rooms.push(DEBUG_ROOM);
      if (rooms.length > 0) await client.join(rooms);
      this.logger.debug(
        `Socket connected: ${client.id}, ${String(channelIds.length)} channel rooms`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to join rooms: ${client.id}`,
        error instanceof Error ? error.stack : String(error),
      );
      client.disconnect(true);
    }
  }
}
