import { ServiceUnavailableException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { TerminusModule } from '@nestjs/terminus';
import { describe, expect, it } from 'vitest';
import { PrismaHealthIndicator } from '../../core/prisma/prisma.health.js';
import { HealthService } from './health.service.js';
import { INSTANCE_ID } from './instance-id.provider.js';

async function serviceWithDatabase(status: 'up' | 'down') {
  const indicator = {
    isHealthy: (key: string) =>
      Promise.resolve({
        [key]: status === 'up' ? { status } : { status, message: 'database unreachable' },
      }),
  };

  const moduleRef = await Test.createTestingModule({
    imports: [TerminusModule],
    providers: [HealthService, { provide: INSTANCE_ID, useValue: 'test-api-1' }],
  })
    .useMocker((token) => (token === PrismaHealthIndicator ? indicator : undefined))
    .compile();

  return { service: moduleRef.get(HealthService), close: () => moduleRef.close() };
}

describe('HealthService', () => {
  it('reports liveness ok with instanceId, built through Nest DI', async () => {
    const { service, close } = await serviceWithDatabase('down');

    await expect(service.live()).resolves.toMatchObject({
      status: 'ok',
      instanceId: 'test-api-1',
    });

    await close();
  });

  it('reports readiness ok when the database indicator is up', async () => {
    const { service, close } = await serviceWithDatabase('up');

    await expect(service.ready()).resolves.toMatchObject({
      status: 'ok',
      info: { database: { status: 'up' } },
    });

    await close();
  });

  it('fails readiness with a 503 when the database indicator is down', async () => {
    const { service, close } = await serviceWithDatabase('down');

    await expect(service.ready()).rejects.toBeInstanceOf(ServiceUnavailableException);

    await close();
  });
});
