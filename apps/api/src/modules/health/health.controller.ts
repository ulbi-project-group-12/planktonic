import { Controller, Get } from '@nestjs/common';
import { HealthCheck } from '@nestjs/terminus';
import { HealthService } from './health.service.js';

/** HTTP adapter only (STACK §3.1): every check lives in HealthService. */
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @HealthCheck()
  live() {
    return this.healthService.live();
  }
}
