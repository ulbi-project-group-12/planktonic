import { Controller, HttpCode, NotFoundException, Post } from '@nestjs/common';
import { type DebugPing, RealtimeService } from './realtime.service.js';

/**
 * HTTP trigger for the diagnostic broadcast, so the two-replica stand can be checked by hand:
 * the client never gets a socket event that writes to a room. 404 while debug is off.
 */
@Controller('debug/realtime')
export class RealtimeDebugController {
  constructor(private readonly realtime: RealtimeService) {}

  @Post('ping')
  @HttpCode(202)
  ping(): DebugPing {
    const payload = this.realtime.emitDebugPing();
    if (!payload) throw new NotFoundException();
    return payload;
  }
}
