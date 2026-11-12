import { Controller, Get } from '@nestjs/common';
import { HealthCheck } from '@nestjs/terminus';
import { HealthService } from './health.service.js';

/**
 * HTTP adapter only (STACK §3.1): every check lives in HealthService.
 * GET /api/health is liveness (Phase 4 smoke-checks it); GET /api/health/ready adds the database.
 */
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @HealthCheck()
  live() {
    return this.healthService.live();
  }

  @Get('ready')
  @HealthCheck()
  ready() {
    return this.healthService.ready();
  }
}
