import { Injectable } from '@nestjs/common';
import { HealthIndicatorService } from '@nestjs/terminus';
import { PrismaService } from './prisma.service.js';

/** Database readiness for terminus: `SELECT 1` through Prisma. */
@Injectable()
export class PrismaHealthIndicator {
  constructor(
    private readonly prisma: PrismaService,
    private readonly indicator: HealthIndicatorService,
  ) {}

  async isHealthy<const Key extends string>(key: Key) {
    const session = this.indicator.check(key);
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return session.up();
    } catch {
      // A fixed message: the driver's error text can carry the host, port or user.
      return session.down({ message: 'database unreachable' });
    }
  }
}
