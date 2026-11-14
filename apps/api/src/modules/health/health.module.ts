import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller.js';
import { HealthService } from './health.service.js';
import { instanceIdProvider } from './instance-id.provider.js';

@Module({
  imports: [TerminusModule],
  controllers: [HealthController],
  providers: [HealthService, instanceIdProvider],
})
export class HealthModule {}
