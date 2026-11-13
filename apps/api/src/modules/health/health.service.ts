import { Injectable } from '@nestjs/common';
import { HealthCheckService } from '@nestjs/terminus';
import { PrismaHealthIndicator } from '../../core/prisma/prisma.health.js';

@Injectable()
export class HealthService {
  constructor(
    private readonly health: HealthCheckService,
    private readonly prismaIndicator: PrismaHealthIndicator,
  ) {}

  /** Liveness: no indicators, so it never touches the database or another backend (D-12). */
  live() {
    return this.health.check([]);
  }

  /** Readiness: the database answers `SELECT 1`; otherwise terminus responds 503 (D-12). */
  ready() {
    return this.health.check([() => this.prismaIndicator.isHealthy('database')]);
  }
}
