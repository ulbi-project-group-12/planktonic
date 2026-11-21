// The global StandardSchemaValidationPipe (app.setup.ts) validates the POST body and the GET query
// against the zod schemas from @app/contracts. The service is stubbed: no database is involved.
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { configureApp } from '../src/app.setup.js';
import { MessagesController } from '../src/modules/messages/messages.controller.js';
import { MessagesService } from '../src/modules/messages/messages.service.js';

const CHANNEL = '00000000-0000-7000-8000-000000000001';
const KEY = '019a8f00-0000-7000-8000-000000000004';
const create = vi.fn().mockResolvedValue({ message: { id: 'created' }, created: true });
const list = vi.fn().mockResolvedValue({ messages: [], hasMore: false });

let app: INestApplication;
let baseUrl: string;

beforeAll(async () => {
  const moduleRef = await Test.createTestingModule({
    controllers: [MessagesController],
    providers: [{ provide: MessagesService, useValue: { create, list } }],
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
    const response = await post(`/api/channels/${CHANNEL}/messages`, {
      clientMsgId: KEY,
      body: 'hello',
    });
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ id: 'created' });
    expect(create).toHaveBeenCalledWith(CHANNEL, expect.any(String), KEY, 'hello');
  });

  it.each([
    {},
    { clientMsgId: KEY, body: '' },
    { clientMsgId: KEY, body: 1 },
    { body: 'no key' },
    { clientMsgId: 'not-a-uuid', body: 'hi' },
    // A UUIDv4: the key must be a UUIDv7 (STACK §4.3).
    { clientMsgId: '550e8400-e29b-41d4-a716-446655440000', body: 'hi' },
  ])('returns 400 for body %j', async (body) => {
    const response = await post(`/api/channels/${CHANNEL}/messages`, body);
    expect(response.status).toBe(400);
  });

  it('reports the failing field in `issues`', async () => {
    const response = await post(`/api/channels/${CHANNEL}/messages`, {
      clientMsgId: KEY,
      body: '',
    });
    expect(await response.json()).toMatchObject({
      statusCode: 400,
      message: 'Validation failed',
      issues: [{ path: 'body', message: expect.stringMatching(/.+/) as string }],
    });
  });

  it('returns 400 with the channelId issue for a non-uuid channel id', async () => {
    const response = await post('/api/channels/nope/messages', { clientMsgId: KEY, body: 'hello' });
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      statusCode: 400,
      message: 'Validation failed',
      issues: [{ path: 'channelId', message: expect.stringMatching(/.+/) as string }],
    });
  });

  it('keeps the channel id as sent', async () => {
    create.mockClear();
    const upper = CHANNEL.toUpperCase();
    const response = await post(`/api/channels/${upper}/messages`, {
      clientMsgId: KEY,
      body: 'hi',
    });
    expect(response.status).toBe(201);
    expect(create).toHaveBeenCalledWith(upper, expect.any(String), KEY, 'hi');
  });
});

describe('GET /api/channels/:channelId/messages query validation', () => {
  function get(query: string) {
    return fetch(`${baseUrl}/api/channels/${CHANNEL}/messages${query}`);
  }

  it('passes no afterSeq and the default limit when the query is empty', async () => {
    list.mockClear();
    const response = await get('');
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ messages: [], hasMore: false });
    expect(list).toHaveBeenCalledWith(CHANNEL, { limit: 100 });
  });

  it('parses afterSeq as a string and limit as a number', async () => {
    list.mockClear();
    const response = await get('?afterSeq=41&limit=20');
    expect(response.status).toBe(200);
    expect(list).toHaveBeenCalledWith(CHANNEL, { afterSeq: '41', limit: 20 });
  });

  it('returns 400 for a non-uuid channel id', async () => {
    list.mockClear();
    const response = await fetch(`${baseUrl}/api/channels/nope/messages`);
    expect(response.status).toBe(400);
    expect(list).not.toHaveBeenCalled();
  });

  it.each([
    '?afterSeq=abc',
    '?afterSeq=1e2',
    '?afterSeq=-1',
    '?afterSeq=99999999999999999999',
    '?afterSeq=1&afterSeq=2',
    '?limit=0',
    '?limit=101',
    '?limit=ten',
  ])('returns 400 for %s', async (query) => {
    list.mockClear();
    const response = await get(query);
    expect(response.status).toBe(400);
    expect(list).not.toHaveBeenCalled();
  });
});
