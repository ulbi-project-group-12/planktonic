import { Inject, Injectable } from '@nestjs/common';
import { HealthCheckService } from '@nestjs/terminus';
import { PrismaHealthIndicator } from '../../core/prisma/prisma.health.js';
import { INSTANCE_ID } from './instance-id.provider.js';

@Injectable()
export class HealthService {
  constructor(
    private readonly health: HealthCheckService,
    private readonly prismaIndicator: PrismaHealthIndicator,
    @Inject(INSTANCE_ID) private readonly instanceId: string,
  ) {}

  /** Liveness: no indicators, so it never touches the database or another backend (D-12). The
   * `instanceId` names the replica that answered (UL-123). */
  async live() {
    const result = await this.health.check([]);

    return {
      ...result,
      instanceId: this.instanceId,
    };
  }

  /** Readiness: the database answers `SELECT 1`; otherwise terminus responds 503 (D-12). */
  ready() {
    return this.health.check([() => this.prismaIndicator.isHealthy('database')]);
  }
}
