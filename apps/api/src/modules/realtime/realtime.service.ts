import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ServerToClientEvents } from '@app/contracts';
import type { Server } from 'socket.io';
import type { Env } from '../../core/config/env.js';
import { INSTANCE_ID } from '../../core/instance/instance-id.provider.js';
import { RealtimePublisher } from '../../core/realtime/realtime-publisher.js';

/**
 * Diagnostic room every socket joins while debug is on. Clients never choose rooms. Not a
 * `channel:{id}` room (core/realtime/rooms.ts), so it never receives channel events.
 */
export const DEBUG_ROOM = 'debug';
/** Diagnostic event; its payload names the replica that emitted it. */
export const DEBUG_EVENT = 'debug:ping';

export interface DebugPing {
  instanceId: string;
}

/**
 * The api's RealtimePublisher: emits through the Socket.IO server the gateway binds, and so
 * through the Redis Streams adapter to every replica. Services inject `RealtimePublisher`, never
 * this class or the gateway (an adapter in nest() terms).
 */
@Injectable()
export class RealtimeService extends RealtimePublisher {
  readonly debugEnabled: boolean;

  private readonly logger = new Logger(RealtimeService.name);
  private server?: Server;

  constructor(
    @Inject(INSTANCE_ID) private readonly instanceId: string,
    config: ConfigService<Env, true>,
  ) {
    super();
    this.debugEnabled =
      config.get('NODE_ENV', { infer: true }) === 'test' ||
      config.get('REALTIME_DEBUG', { infer: true });
  }

  bindServer(server: Server): void {
    this.server = server;
  }

  publish<E extends keyof ServerToClientEvents>(
    room: string,
    event: E,
    ...args: Parameters<ServerToClientEvents[E]>
  ): void {
    if (!this.server) {
      this.logger.warn(`Dropped ${event} to ${room}: the Socket.IO server is not bound yet`);
      return;
    }
    // At most once by design (STACK §4.3): the data is committed and the client heals a gap.
    // The Redis Streams adapter broadcasts asynchronously and swallows an XADD failure itself
    // (socket.io-adapter ClusterAdapter), so the catch below only sees synchronous throws, such
    // as a payload that fails to encode. During a Redis outage the XADD waits in the client's
    // offline queue, and delivery, local sockets included, waits with it.
    try {
      this.server.to(room).emit(event, ...args);
    } catch (error) {
      this.logger.error(
        `Failed to publish ${event} to ${room}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  /** Emits to the debug room through the adapter, so every replica's members receive it. */
  emitDebugPing(): DebugPing | undefined {
    if (!this.debugEnabled || !this.server) return undefined;
    const payload: DebugPing = { instanceId: this.instanceId };
    this.server.to(DEBUG_ROOM).emit(DEBUG_EVENT, payload);
    return payload;
  }
}
