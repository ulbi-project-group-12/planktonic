import { Test } from '@nestjs/testing';
import { expect, it } from 'vitest';
import { API_PREFIX } from '../../../app.setup.js';
import { createOpenApiDocument } from '../../../core/openapi/swagger.setup.js';
import { AuthModule } from '../auth.module.js';
import { AuthRepository } from '../auth.repository.js';
import { RegisterRepository } from '../register/register.repository.js';
import { LoginRepository } from './login.repository.js';

it('documents the login request and responses', async () => {
  const moduleRef = await Test.createTestingModule({ imports: [AuthModule] })
    .overrideProvider(RegisterRepository)
    .useValue({})
    .overrideProvider(LoginRepository)
    .useValue({})
    .overrideProvider(AuthRepository)
    .useValue({})
    .compile();
  const app = moduleRef.createNestApplication({ logger: false });
  try {
    app.setGlobalPrefix(API_PREFIX);
    const login = createOpenApiDocument(app).paths['/api/auth/login']?.post;

    expect(login).toMatchObject({
      operationId: 'Auth_login',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              required: ['email', 'password'],
              properties: {
                email: { type: 'string', format: 'email' },
                password: { type: 'string', writeOnly: true },
              },
            },
          },
        },
      },
      responses: {
        200: {
          content: {
            'application/json': {
              schema: {
                required: ['accessToken'],
                properties: { accessToken: { type: 'string' } },
              },
            },
          },
        },
        400: {
          content: {
            'application/json': { schema: { required: ['statusCode', 'message', 'issues'] } },
          },
        },
        401: {
          content: {
            'application/json': { schema: { required: ['statusCode', 'message', 'error'] } },
          },
        },
        503: {
          content: {
            'application/json': { schema: { required: ['statusCode', 'message', 'error'] } },
          },
        },
      },
    });
    expect(Object.keys(login?.responses ?? {}).sort()).toEqual(['200', '400', '401', '503']);
  } finally {
    await app.close();
  }
});
