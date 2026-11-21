import { Test } from '@nestjs/testing';
import { expect, it } from 'vitest';
import { API_PREFIX } from '../../../app.setup.js';
import { createOpenApiDocument } from '../../../core/openapi/swagger.setup.js';
import { AuthModule } from '../auth.module.js';
import { RegisterRepository } from './register.repository.js';

it('documents the registration request and current responses', async () => {
  const moduleRef = await Test.createTestingModule({ imports: [AuthModule] })
    .overrideProvider(RegisterRepository)
    .useValue({})
    .compile();
  const app = moduleRef.createNestApplication({ logger: false });
  try {
    app.setGlobalPrefix(API_PREFIX);
    const document = createOpenApiDocument(app);
    const register = document.paths['/api/auth/register']?.post;

    expect(register).toMatchObject({
      summary: 'Register a user',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['name', 'email', 'password', 'confirmPassword'],
              properties: {
                name: { type: 'string', minLength: 2, maxLength: 15, example: 'Ada' },
                email: {
                  type: 'string',
                  maxLength: 254,
                  format: 'email',
                  example: 'ada@example.com',
                },
                password: {
                  type: 'string',
                  minLength: 12,
                  maxLength: 128,
                  format: 'password',
                  writeOnly: true,
                  example: 'example-passphrase',
                },
                confirmPassword: {
                  type: 'string',
                  format: 'password',
                  writeOnly: true,
                  description: 'Must exactly match password.',
                  example: 'example-passphrase',
                },
              },
            },
          },
        },
      },
      responses: {
        201: {
          content: {
            'application/json': { schema: { required: ['id', 'name', 'email'] } },
          },
        },
        400: {
          content: {
            'application/json': { schema: { required: ['statusCode', 'message', 'issues'] } },
          },
        },
        409: {
          content: {
            'application/json': { schema: { required: ['statusCode', 'message', 'issues'] } },
          },
        },
      },
    });
    expect(Object.keys(register?.responses ?? {}).sort()).toEqual(['201', '400', '409']);
  } finally {
    await app.close();
  }
});
