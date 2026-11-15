// The global StandardSchemaValidationPipe (app.setup.ts) validates the POST body against the
// zod schema from @app/contracts. The service is stubbed: no database is involved.
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { configureApp } from '../src/app.setup.js';
import { MessagesController } from '../src/modules/messages/messages.controller.js';
import { MessagesService } from '../src/modules/messages/messages.service.js';

const CHANNEL = '00000000-0000-7000-8000-000000000001';
const create = vi.fn().mockResolvedValue({ id: 'created' });

let app: INestApplication;
let baseUrl: string;

beforeAll(async () => {
  const moduleRef = await Test.createTestingModule({
    controllers: [MessagesController],
    providers: [{ provide: MessagesService, useValue: { create } }],
  }).compile();
  app = configureApp(moduleRef.createNestApplication({ logger: false }));
  await app.listen(0, '127.0.0.1');
  baseUrl = await app.getUrl();
});

afterAll(async () => {
  await app.close();
});

function post(path: string, body: unknown) {
  return fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/channels/:channelId/messages validation', () => {
  it('returns 201 for a valid body', async () => {
    const response = await post(`/api/channels/${CHANNEL}/messages`, { body: 'hello' });
    expect(response.status).toBe(201);
    expect(create).toHaveBeenCalledWith(CHANNEL, expect.any(String), 'hello');
  });

  it.each([{}, { body: '' }, { body: 1 }])('returns 400 for body %j', async (body) => {
    const response = await post(`/api/channels/${CHANNEL}/messages`, body);
    expect(response.status).toBe(400);
  });

  it('reports the failing field in `issues`', async () => {
    const response = await post(`/api/channels/${CHANNEL}/messages`, { body: '' });
    expect(await response.json()).toMatchObject({
      statusCode: 400,
      message: 'Validation failed',
      issues: [{ path: 'body', message: expect.stringMatching(/.+/) as string }],
    });
  });

  it('returns 400 for a non-uuid channel id', async () => {
    const response = await post('/api/channels/nope/messages', { body: 'hello' });
    expect(response.status).toBe(400);
  });
});
