import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Server } from 'socket.io';
import type { Env } from '../../core/config/env.js';
import { INSTANCE_ID } from '../../core/instance/instance-id.provider.js';

/** Diagnostic room every socket joins while debug is on. Clients never choose rooms. */
export const DEBUG_ROOM = 'debug:channel';
/** Diagnostic event; its payload names the replica that emitted it. */
export const DEBUG_EVENT = 'debug:ping';

export interface DebugPing {
  instanceId: string;
}

/**
 * Server-side emitter. Services and controllers publish through it, never through the gateway
 * (an adapter in nest() terms); the gateway only binds the Socket.IO server and assigns rooms.
 */
@Injectable()
export class RealtimeService {
  readonly debugEnabled: boolean;

  private server?: Server;

  constructor(
    @Inject(INSTANCE_ID) private readonly instanceId: string,
    config: ConfigService<Env, true>,
  ) {
    this.debugEnabled =
      config.get('NODE_ENV', { infer: true }) === 'test' ||
      config.get('REALTIME_DEBUG', { infer: true });
  }

  bindServer(server: Server): void {
    this.server = server;
  }

  /** Emits to the debug room through the adapter, so every replica's members receive it. */
  emitDebugPing(): DebugPing | undefined {
    if (!this.debugEnabled || !this.server) return undefined;
    const payload: DebugPing = { instanceId: this.instanceId };
    this.server.to(DEBUG_ROOM).emit(DEBUG_EVENT, payload);
    return payload;
  }
}
