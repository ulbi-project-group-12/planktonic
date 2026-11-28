import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { exportOpenApi } from './openapi.js';

// vitest.config.ts sets NODE_ENV=test and URLs no service listens on, so this also proves the
// export needs neither a database nor Redis.
let directory: string;
let text: string;
let document: {
  openapi: string;
  paths: Record<string, Record<string, Record<string, unknown>>>;
  components?: { schemas?: Record<string, unknown> };
};

beforeAll(async () => {
  directory = await mkdtemp(join(tmpdir(), 'openapi-'));
  await exportOpenApi(join(directory, 'a.json'));
  await exportOpenApi(join(directory, 'b.json'));
  text = await readFile(join(directory, 'a.json'), 'utf8');
  document = JSON.parse(text) as typeof document;
});

afterAll(async () => {
  await rm(directory, { recursive: true, force: true });
});

describe('pnpm openapi:export', () => {
  it('is deterministic', async () => {
    expect(await readFile(join(directory, 'b.json'), 'utf8')).toBe(text);
  });

  it('describes every route of AppModule, debug routes excluded', () => {
    expect(document.openapi).toMatch(/^3\.0\./);
    const operations = Object.entries(document.paths).flatMap(([path, item]) =>
      Object.entries(item).map(
        ([method, operation]) => `${method} ${path} ${String(operation.operationId)}`,
      ),
    );
    expect(operations.sort()).toEqual([
      'get /api/auth/me Auth_me',
      'get /api/channels/{channelId}/messages Messages_list',
      'get /api/health Health_live',
      'get /api/health/ready Health_ready',
      'get /api/invites/{token} Invite_get',
      'get /api/workspaces Workspace_list',
      'get /api/workspaces/{slug} Workspace_getBySlug',
      'get /api/workspaces/{slug}/members Workspace_listMembers',
      'get /api/workspaces/{slug}/projects Project_list',
      'get /api/workspaces/{slug}/projects/{key} Project_getByKey',
      'patch /api/users/me Users_updateMe',
      'patch /api/workspaces/{slug}/members/{userId}/role Workspace_changeMemberRole',
      'post /api/auth/login Auth_login',
      'post /api/auth/refresh Auth_refresh',
      'post /api/auth/register Auth_register',
      'post /api/channels/{channelId}/messages Messages_create',
      'post /api/invites/{token}/accept Invite_accept',
      'post /api/workspaces Workspace_create',
      'post /api/workspaces/{slug}/invites Invite_create',
      'post /api/workspaces/{slug}/projects Project_create',
    ]);
  });

  it('documents the workspace creation contract and bearer authentication', () => {
    expect(document.paths['/api/workspaces']?.post).toMatchObject({
      security: [{ bearer: [] }],
      requestBody: {
        required: true,
        content: { 'application/json': { schema: { required: ['name', 'slug'] } } },
      },
      responses: {
        201: {
          content: { 'application/json': { schema: { required: ['id', 'name', 'slug'] } } },
        },
        400: {},
        401: {},
        409: {},
      },
    });
  });

  it('takes bodies, queries and responses from the contracts', () => {
    const messages = document.paths['/api/channels/{channelId}/messages'];
    expect(messages?.post).toMatchObject({
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              required: ['clientMsgId', 'body'],
              properties: { body: { type: 'string', minLength: 1, maxLength: 4000 } },
            },
          },
        },
      },
      responses: {
        201: {
          content: {
            'application/json': {
              schema: {
                required: [
                  'id',
                  'seq',
                  'channelId',
                  'authorId',
                  'clientMsgId',
                  'body',
                  'createdAt',
                ],
                properties: { createdAt: { type: 'string', format: 'date-time' } },
              },
            },
          },
        },
      },
    });
    expect(messages?.get).toMatchObject({
      parameters: [
        { name: 'channelId', in: 'path', required: true, schema: { format: 'uuid' } },
        { name: 'afterSeq', in: 'query', required: false, schema: { type: 'string' } },
        { name: 'limit', in: 'query', required: false, schema: { type: 'string' } },
      ],
      responses: {
        200: {
          content: {
            'application/json': {
              schema: {
                required: ['messages', 'hasMore'],
                properties: { messages: { type: 'array' } },
              },
            },
          },
        },
      },
    });
    const errorSchema = (operation: unknown, status: number) =>
      (operation as { responses: Record<number, { content: Record<string, { schema: unknown }> }> })
        .responses[status]?.content['application/json']?.schema;
    expect(errorSchema(messages?.post, 400)).toMatchObject({
      required: ['statusCode', 'message', 'issues'],
    });
    expect(errorSchema(messages?.post, 404)).toMatchObject({
      required: ['statusCode', 'message', 'error'],
    });
    expect(errorSchema(messages?.post, 409)).toMatchObject({
      required: ['statusCode', 'message', 'error'],
    });
    expect(errorSchema(messages?.get, 400)).toMatchObject({
      required: ['statusCode', 'message', 'issues'],
    });
    expect(document.paths['/api/health']?.get).toMatchObject({
      responses: {
        200: {
          content: {
            'application/json': {
              schema: { required: ['status', 'info', 'error', 'details', 'instanceId'] },
            },
          },
        },
      },
    });
  });

  it('documents bearer authentication for the current user route', () => {
    expect(document.paths['/api/auth/me']?.get).toMatchObject({
      security: [{ bearer: [] }],
    });
  });

  it('holds only OpenAPI 3.0 schemas with resolvable references', () => {
    expect(text).not.toContain('"$schema"');
    expect(text).not.toContain('"$defs"');
    expect(text).not.toContain('"definitions"');
    expect(text).not.toContain('"const"');
    const refs = [...text.matchAll(/"\$ref": "([^"]+)"/g)].map(([, ref]) => ref ?? '');
    for (const ref of refs) {
      expect(ref).toMatch(/^#\/components\/schemas\//);
      expect(document.components?.schemas).toHaveProperty(ref.split('/').at(-1) ?? '');
    }
  });
});
