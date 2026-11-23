import { HealthResponse } from '@app/contracts';
import { Controller, Get } from '@nestjs/common';
import { HealthCheck } from '@nestjs/terminus';
import { ApiZodResponse } from '../../core/openapi/zod-decorators.js';
import { Public } from '../auth/decorators/public.decorator.js';
import { HealthService } from './health.service.js';

/**
 * HTTP adapter only (STACK §3.1): every check lives in HealthService.
 * GET /api/health is liveness (Phase 4 smoke-checks it); GET /api/health/ready adds the database.
 */
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @Public()
  @HealthCheck({ noCache: true, swaggerDocumentation: false })
  @ApiZodResponse(200, 'API is alive', HealthResponse)
  live() {
    return this.healthService.live();
  }

  @Get('ready')
  @Public()
  @HealthCheck()
  ready() {
    return this.healthService.ready();
  }
}
