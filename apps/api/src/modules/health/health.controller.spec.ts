import { Test } from '@nestjs/testing';
import { describe, expect, it } from 'vitest';
import { HealthController } from './health.controller.js';
import { HealthService } from './health.service.js';

const live = { status: 'ok', info: {}, error: {}, details: {} };
const ready = { status: 'ok', info: { database: { status: 'up' } }, error: {}, details: {} };

async function controller() {
  const moduleRef = await Test.createTestingModule({
    controllers: [HealthController],
    providers: [
      {
        provide: HealthService,
        useValue: { live: () => Promise.resolve(live), ready: () => Promise.resolve(ready) },
      },
    ],
  }).compile();
  return { controller: moduleRef.get(HealthController), close: () => moduleRef.close() };
}

describe('HealthController', () => {
  it('returns exactly what HealthService.live() returns', async () => {
    const { controller: health, close } = await controller();
    await expect(health.live()).resolves.toBe(live);
    await close();
  });

  it('returns exactly what HealthService.ready() returns', async () => {
    const { controller: health, close } = await controller();
    await expect(health.ready()).resolves.toBe(ready);
    await close();
  });
});
