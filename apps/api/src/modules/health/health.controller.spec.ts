import { Test } from '@nestjs/testing';
import { describe, expect, it } from 'vitest';
import { HealthController } from './health.controller.js';
import { HealthService } from './health.service.js';

describe('HealthController', () => {
  it('returns exactly what HealthService.live() returns', async () => {
    const result = { status: 'ok', info: {}, error: {}, details: {} };
    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: HealthService, useValue: { live: () => Promise.resolve(result) } }],
    }).compile();

    await expect(moduleRef.get(HealthController).live()).resolves.toBe(result);
    await moduleRef.close();
  });
});
