import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { exportOpenApi } from './openapi-export.js';

it('writes OpenAPI 3.0 with health and example POST contracts', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'openapi-'));
  try {
    const output = join(directory, 'openapi.json');
    await exportOpenApi(output);
    const document: unknown = JSON.parse(await readFile(output, 'utf8'));

    expect(document).toMatchObject({
      openapi: '3.0.0',
      paths: {
        '/api/health': {
          get: {
            responses: {
              200: {
                content: {
                  'application/json': {
                    schema: {
                      required: ['status', 'info', 'error', 'details', 'instanceId'],
                      properties: { status: { enum: ['ok'] }, instanceId: { type: 'string' } },
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
              content: {
                'application/json': {
                  schema: {
                    required: ['name'],
                    properties: { name: { type: 'string', minLength: 1 } },
                  },
                },
              },
            },
            responses: {
              201: {
                content: {
                  'application/json': {
                    schema: {
                      required: ['greeting'],
                      properties: { greeting: { type: 'string' } },
                    },
                  },
                },
              },
              400: {
                content: {
                  'application/json': {
                    schema: {
                      required: ['statusCode', 'message', 'issues'],
                      properties: {
                        statusCode: { enum: [400] },
                        issues: { type: 'array', items: { required: ['path', 'message'] } },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
