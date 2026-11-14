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

  async live() {
    const result = await this.health.check([]);

    return {
      ...result,
      instanceId: this.instanceId,
    };
  }

  ready() {
    return this.health.check([() => this.prismaIndicator.isHealthy('database')]);
  }
}
