import { Module } from '@nestjs/common';
import { RedisConnectionLifecycle } from '../../core/realtime/redis-connection.lifecycle.js';
import { RealtimeDebugController } from './realtime-debug.controller.js';
import { RealtimeGateway } from './realtime.gateway.js';
import { RealtimeService } from './realtime.service.js';

@Module({
  controllers: [RealtimeDebugController],
  providers: [RealtimeGateway, RealtimeService, RedisConnectionLifecycle],
  exports: [RealtimeService, RedisConnectionLifecycle],
})
export class RealtimeModule {}
