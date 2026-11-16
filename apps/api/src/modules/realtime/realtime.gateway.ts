import { Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WebSocketGateway, WebSocketServer, type OnGatewayConnection } from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import type { Env } from '../../core/config/env.js';
import { INSTANCE_ID } from '../health/instance-id.provider.js';

@WebSocketGateway({
  path: '/socket.io',
})
export class RealtimeGateway implements OnGatewayConnection {
  private readonly logger = new Logger(RealtimeGateway.name);

  private readonly debugEnabled: boolean;

  constructor(
    @Inject(INSTANCE_ID) private readonly instanceId: string,
    config: ConfigService<Env, true>,
  ) {
    this.debugEnabled = config.get('NODE_ENV', { infer: true }) === 'test';
  }

  @WebSocketServer()
  server!: Server;

  async handleConnection(client: Socket): Promise<void> {
    if (!this.debugEnabled) return;

    try {
      await client.join('debug:channel');
      this.logger.debug(`Socket connected: ${client.id}`);
    } catch (error) {
      this.logger.error(
        `Failed to join debug channel: ${client.id}`,
        error instanceof Error ? error.stack : String(error),
      );
      client.disconnect(true);
    }
  }

  emitDebugPing(): void {
    if (!this.debugEnabled) return;

    this.server.to('debug:channel').emit('debug:ping', {
      instanceId: this.instanceId,
    });
  }
}
