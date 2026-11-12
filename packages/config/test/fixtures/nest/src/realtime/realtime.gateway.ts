import type { PrismaClient } from '@prisma/client';

export class RealtimeGateway {
  constructor(private readonly db: { $queryRaw(): number }) {}

  count(): number {
    return this.db.$queryRaw();
  }
}

export type Db = PrismaClient;
