import { PrismaClient } from '@prisma/client';

// A one-off script is package code too: it goes through a repository.
export const db: unknown = PrismaClient;
