import type { PrismaService } from './core/prisma/prisma.service.js';

export function reset(db: PrismaService): number {
  return db.$queryRaw();
}
