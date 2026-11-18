import { Module } from '@nestjs/common';
import { RealtimePublisher } from '../../core/realtime/realtime-publisher.js';
import { RedisConnectionLifecycle } from '../../core/realtime/redis-connection.lifecycle.js';
import { ChannelsModule } from '../channels/channels.module.js';
import { RealtimeDebugController } from './realtime-debug.controller.js';
import { RealtimeGateway } from './realtime.gateway.js';
import { RealtimeService } from './realtime.service.js';

@Module({
  imports: [ChannelsModule],
  controllers: [RealtimeDebugController],
  providers: [
    RealtimeGateway,
    RealtimeService,
    { provide: RealtimePublisher, useExisting: RealtimeService },
    RedisConnectionLifecycle,
  ],
  exports: [RealtimeService, RealtimePublisher, RedisConnectionLifecycle],
})
export class RealtimeModule {}
