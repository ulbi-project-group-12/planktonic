import { HealthResponse } from '@app/contracts';
import { Test } from '@nestjs/testing';
import { expect, it } from 'vitest';
import { configureApp } from '../../app.setup.js';
import { HealthModule } from '../../modules/health/health.module.js';
import { OpenApiExampleModule } from '../../modules/openapi-example/openapi-example.module.js';
import { InstanceModule } from '../instance/instance.module.js';
import { PrismaHealthIndicator } from '../prisma/prisma.health.js';
import { configureSwagger } from './swagger.setup.js';

it.each(['development', 'production'] as const)(
  'serves API documentation only in development (%s)',
  async (environment) => {
    const module = await Test.createTestingModule({
      imports: [InstanceModule, HealthModule, OpenApiExampleModule],
    })
      .useMocker((token) => {
        if (token === PrismaHealthIndicator) {
          return {
            isHealthy() {
              throw new Error('Liveness must not check the database');
            },
          };
        }
      })
      .compile();

    const app = configureApp(module.createNestApplication({ logger: false }));
    try {
      configureSwagger(app, environment);
      await app.listen(0, '127.0.0.1');
      const base = await app.getUrl();
      const ui = await fetch(`${base}/api/docs`);
      const json = await fetch(`${base}/api/docs-json`);

      if (environment === 'production') {
        expect(ui.status).toBe(404);
        expect(json.status).toBe(404);
        return;
      }

      expect(ui.status).toBe(200);
      expect(await ui.text()).toContain('Swagger UI');
      expect(json.status).toBe(200);
      expect(await json.json()).toMatchObject({
        paths: {
          '/api/health': {
            get: {
              responses: {
                200: {
                  content: {
                    'application/json': {
                      schema: {
                        required: ['status', 'info', 'error', 'details', 'instanceId'],
                        properties: {
                          status: { enum: ['ok'] },
                          info: { type: 'object', additionalProperties: false },
                          error: { type: 'object', additionalProperties: false },
                          details: { type: 'object', additionalProperties: false },
                          instanceId: { type: 'string' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          '/api/openapi-example': {
            post: {
              requestBody: {
                required: true,
                content: { 'application/json': { schema: { required: ['name'] } } },
              },
              responses: {
                201: { content: { 'application/json': { schema: { required: ['greeting'] } } } },
                400: {
                  content: {
                    'application/json': {
                      schema: { required: ['statusCode', 'message', 'issues'] },
                    },
                  },
                },
              },
            },
          },
        },
      });

      const health = await fetch(`${base}/api/health`);
      expect(health.status).toBe(200);
      expect(health.headers.get('cache-control')).toBe('no-cache, no-store, must-revalidate');
      const body = HealthResponse.parse(await health.json());
      expect(body.instanceId).not.toBe('');
    } finally {
      await app.close();
    }
  },
);
