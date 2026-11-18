import { Logger } from '@nestjs/common';
import { WebSocketGateway, WebSocketServer, type OnGatewayInit } from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { channelRoom } from '../../core/realtime/rooms.js';
import { ChannelsService } from '../channels/channels.service.js';
import { DEBUG_ROOM, RealtimeService } from './realtime.service.js';

/** WS adapter: binds the server for RealtimeService and assigns rooms on the server side only. */
@WebSocketGateway({
  path: '/socket.io',
})
export class RealtimeGateway implements OnGatewayInit {
  private readonly logger = new Logger(RealtimeGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly realtime: RealtimeService,
    private readonly channels: ChannelsService,
  ) {}

  afterInit(server: Server): void {
    this.realtime.bindServer(server);
    // Middleware, not handleConnection: socket.io sends CONNECT only after every middleware has
    // called next(), so a client that sees `connect` is already in its rooms. Its reconnect
    // catch-up (GET ?afterSeq on `connect`, STACK §4.4) then cannot miss a message committed
    // between the GET and the join. If the client drops meanwhile, socket.io's cleanup leaves the
    // rooms again.
    server.use((socket, next) => {
      this.joinRooms(socket).then(
        () => {
          next();
        },
        (error: unknown) => {
          this.logger.error(
            `Failed to join rooms: ${socket.id}`,
            error instanceof Error ? error.stack : String(error),
          );
          // The client gets connect_error instead of a connection that silently misses events.
          next(new Error('Failed to join rooms'));
        },
      );
    });
  }

  /**
   * Joins `channel:{id}` for each channel the socket may see (STACK §4.1). Until auth lands
   * (phase 3) that is every channel, and phase 3 authenticates in an earlier middleware.
   */
  async joinRooms(socket: Socket): Promise<void> {
    const channelIds = await this.channels.channelIdsForSocket();
    const rooms: string[] = channelIds.map(channelRoom);
    if (this.realtime.debugEnabled) rooms.push(DEBUG_ROOM);
    await socket.join(rooms);
    this.logger.debug(`Socket ${socket.id} joined ${String(channelIds.length)} channel rooms`);
  }
}
