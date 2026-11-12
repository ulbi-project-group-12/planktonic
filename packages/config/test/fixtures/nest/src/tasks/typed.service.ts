import type { PrismaClient } from '@prisma/client';
import type { PrismaService } from '../core/prisma/prisma.service.js';

// Types only: no database access, so a service may name Prisma models.
export type Client = PrismaClient;
export type Generated = import('../generated/prisma/client.js').PrismaClient;
export type Db = PrismaService;
