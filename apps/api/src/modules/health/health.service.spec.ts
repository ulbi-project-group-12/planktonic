import { Test } from '@nestjs/testing';
import { TerminusModule } from '@nestjs/terminus';
import { describe, expect, it } from 'vitest';
import { PrismaHealthIndicator } from '../../core/prisma/prisma.health.js';
import { HealthService } from './health.service.js';

describe('HealthService', () => {
  it('reports liveness ok, built through Nest DI (swc decorator metadata)', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [TerminusModule],
      providers: [HealthService, { provide: PrismaHealthIndicator, useValue: {} }],
    }).compile();

    await expect(moduleRef.get(HealthService).live()).resolves.toMatchObject({ status: 'ok' });
    await moduleRef.close();
  });
});
