import { Injectable, type OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client.js';
import type { Env } from '../config/env.js';

/**
 * The app's Prisma client (D-11, D-14): the generated client on the PrismaPg driver adapter.
 * Only repositories and src/core/prisma may inject it (nest() enforces this).
 *
 * It never connects at module init: the pool opens on the first query, so the app boots and serves
 * liveness without a database (D-12).
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor(config: ConfigService<Env, true>) {
    super({
      adapter: new PrismaPg({
        connectionString: config.get('DATABASE_URL', { infer: true }),
        // A dead database, or a full pool, fails a query in seconds instead of hanging it. A
        // database that connects but never answers is bounded by the readiness probe's own
        // timeout (prisma.health.ts), not here, so slow product queries are not cut off.
        connectionTimeoutMillis: 5000,
      }),
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
