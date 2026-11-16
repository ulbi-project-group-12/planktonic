import { Module } from '@nestjs/common';
import { RedisConnectionLifecycle } from '../../core/realtime/redis-connection.lifecycle.js';
import { HealthModule } from '../health/health.module.js';
import { RealtimeGateway } from './realtime.gateway.js';

@Module({
  imports: [HealthModule],
  providers: [RealtimeGateway, RedisConnectionLifecycle],
  exports: [RedisConnectionLifecycle],
})
export class RealtimeModule {}
