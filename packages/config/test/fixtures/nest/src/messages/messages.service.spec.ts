import { PrismaClient } from '../generated/prisma/client.js';

export const rows = new PrismaClient().$queryRaw();
