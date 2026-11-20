import { ValidationErrorResponse } from '@app/contracts';
import { NestFactory } from '@nestjs/core';
import { expect, it } from 'vitest';
import { configureApp } from '../../app.setup.js';
import { createOpenApiDocument } from '../../core/openapi/swagger.setup.js';
import { OpenApiExampleModule } from './openapi-example.module.js';

it('documents and validates the example POST without application infrastructure', async () => {
  const app = configureApp(await NestFactory.create(OpenApiExampleModule, { logger: false }));
  try {
    const document = createOpenApiDocument(app);
    const operation = document.paths['/api/openapi-example']?.post;
    expect(document.openapi).toMatch(/^3\.0\./);
    expect(operation?.requestBody).toMatchObject({
      required: true,
      content: {
        'application/json': {
          schema: { required: ['name'], properties: { name: { type: 'string', minLength: 1 } } },
        },
      },
    });
    expect(operation?.responses).toMatchObject({
      201: {
        content: {
          'application/json': {
            schema: { required: ['greeting'], properties: { greeting: { type: 'string' } } },
          },
        },
      },
      400: {
        content: {
          'application/json': {
            schema: {
              required: ['statusCode', 'message', 'issues'],
              properties: {
                statusCode: { type: 'number', enum: [400] },
                message: { type: 'string' },
                issues: {
                  type: 'array',
                  items: {
                    required: ['path', 'message'],
                    properties: { path: { type: 'string' }, message: { type: 'string' } },
                  },
                },
              },
            },
          },
        },
      },
    });
    expect(JSON.stringify(operation)).not.toContain('"$schema"');

    await app.listen(0, '127.0.0.1');
    const url = `${await app.getUrl()}/api/openapi-example`;
    const post = (body: unknown) =>
      fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });

    const success = await post({ name: 'Ada' });
    expect(success.status).toBe(201);
    expect(await success.json()).toEqual({ greeting: 'Hello, Ada!' });

    const invalid = await post({ name: '' });
    expect(invalid.status).toBe(400);
    const error = ValidationErrorResponse.parse(await invalid.json());
    expect(error.message).toBe('Validation failed');
    expect(error.issues.map(({ path }) => path)).toEqual(['name']);
  } finally {
    await app.close();
  }
});
