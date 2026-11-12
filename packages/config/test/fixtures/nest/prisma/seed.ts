import type { PrismaClient } from '@prisma/client';

// Seeds run through the Prisma CLI and may use the client directly.
export type Db = PrismaClient;
