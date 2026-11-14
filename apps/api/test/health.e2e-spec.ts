// Boots the whole AppModule with no database: DATABASE_URL (vitest.config.ts test.env) points
// at 127.0.0.1:1, where nothing listens. Liveness must stay 200 and readiness must be 503
// without leaking the URL.
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';

let app: INestApplication;
let baseUrl: string;

beforeAll(async () => {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = configureApp(moduleRef.createNestApplication({ logger: false }));
  await app.listen(0, '127.0.0.1');
  baseUrl = await app.getUrl();
});

afterAll(async () => {
  await app.close();
});

describe('health endpoints without a database', () => {
  it('GET /api/health returns 200 with status ok and instanceId', async () => {
    const response = await fetch(`${baseUrl}/api/health`);
    const body = z
      .object({ status: z.literal('ok'), instanceId: z.string().min(1) })
      .parse(await response.json());

    expect(response.status).toBe(200);
    expect(body.status).toBe('ok');
    expect(response.headers.get('x-powered-by')).toBeNull();
  });

  it('GET /api/health/ready returns 503 and leaks neither credentials nor host:port', async () => {
    const response = await fetch(`${baseUrl}/api/health/ready`);
    expect(response.status).toBe(503);
    const body = await response.text();
    expect(body).toContain('database unreachable');
    expect(body).not.toContain('probe:probe');
    expect(body).not.toContain('127.0.0.1:1');
  });
});
