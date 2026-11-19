import type { MessageResponse } from '@app/contracts';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PROTOTYPE_CHANNEL_ID } from '../model/feed';
import {
  classifySendError,
  type SendErrorKind,
  SendMessageError,
  sendMessage,
} from './prototype-api';

const MESSAGE: MessageResponse = {
  id: '01900000-0000-7000-8000-000000000001',
  seq: '1',
  channelId: PROTOTYPE_CHANNEL_ID,
  authorId: '00000000-0000-7000-8000-0000000000aa',
  clientMsgId: '01900000-0000-7000-9000-000000000001',
  body: 'hello',
  createdAt: '2026-11-18T12:00:00.000Z',
};

const PAYLOAD = { clientMsgId: MESSAGE.clientMsgId, body: 'hello' };
const MESSAGES_URL = `/api/channels/${PROTOTYPE_CHANNEL_ID}/messages`;

function stubFetch(answer: () => Promise<Response>) {
  const fetchMock = vi.fn<typeof fetch>(() => answer());
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function raw(text: string, status: number): Response {
  return new Response(text, { status, headers: { 'content-type': 'application/json' } });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('sendMessage', () => {
  it('resolves a valid 201 to the parsed message with one JSON POST', async () => {
    const fetchMock = stubFetch(() => Promise.resolve(raw(JSON.stringify(MESSAGE), 201)));
    await expect(sendMessage(PROTOTYPE_CHANNEL_ID, PAYLOAD)).resolves.toEqual(MESSAGE);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe(MESSAGES_URL);
    expect(init?.method).toBe('POST');
    expect(init?.headers).toEqual({ 'content-type': 'application/json' });
    expect(init?.body).toBe(JSON.stringify(PAYLOAD));
  });

  it.each<{ name: string; error: Error; kind: SendErrorKind }>([
    { name: 'a network TypeError', error: new TypeError('Failed to fetch'), kind: 'network' },
    {
      name: 'a TimeoutError DOMException',
      error: new DOMException('The operation timed out.', 'TimeoutError'),
      kind: 'timeout',
    },
  ])('turns $name into a retryable $kind error', async ({ error, kind }) => {
    stubFetch(() => Promise.reject(error));
    const sending = sendMessage(PROTOTYPE_CHANNEL_ID, PAYLOAD);
    await expect(sending).rejects.toBeInstanceOf(SendMessageError);
    await expect(sending).rejects.toMatchObject({ kind, status: undefined, retryable: true });
  });

  it('rethrows any other fetch rejection unchanged', async () => {
    const error = new DOMException('Aborted', 'AbortError');
    stubFetch(() => Promise.reject(error));
    await expect(sendMessage(PROTOTYPE_CHANNEL_ID, PAYLOAD)).rejects.toBe(error);
  });

  it.each<{ status: number; kind: SendErrorKind; retryable: boolean }>([
    { status: 500, kind: 'server', retryable: true },
    { status: 503, kind: 'server', retryable: true },
    { status: 408, kind: 'server', retryable: true },
    { status: 429, kind: 'server', retryable: true },
    { status: 400, kind: 'rejected', retryable: false },
    { status: 404, kind: 'rejected', retryable: false },
    { status: 409, kind: 'rejected', retryable: false },
    { status: 413, kind: 'rejected', retryable: false },
    { status: 422, kind: 'rejected', retryable: false },
    { status: 200, kind: 'invalid-response', retryable: true },
    { status: 204, kind: 'invalid-response', retryable: true },
  ])('turns a $status into $kind (retryable: $retryable)', async ({ status, kind, retryable }) => {
    const body =
      status === 204 ? null : JSON.stringify(status === 200 ? MESSAGE : { message: 'x' });
    stubFetch(() => Promise.resolve(new Response(body, { status })));
    const sending = sendMessage(PROTOTYPE_CHANNEL_ID, PAYLOAD);
    await expect(sending).rejects.toBeInstanceOf(SendMessageError);
    await expect(sending).rejects.toMatchObject({ kind, status, retryable });
  });

  it('turns a 201 with an invalid message into a retryable invalid-response', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    stubFetch(() => Promise.resolve(raw(JSON.stringify({ id: 'nope' }), 201)));
    const sending = sendMessage(PROTOTYPE_CHANNEL_ID, PAYLOAD);
    await expect(sending).rejects.toBeInstanceOf(SendMessageError);
    await expect(sending).rejects.toMatchObject({
      kind: 'invalid-response',
      status: 201,
      retryable: true,
    });
    expect(warn).toHaveBeenCalledWith(
      'prototype: invalid POST message response',
      expect.anything(),
    );
  });

  it.each([
    { name: 'another clientMsgId', patch: { clientMsgId: '01900000-0000-7000-9000-0000000000ff' } },
    { name: 'another channel', patch: { channelId: '01900000-0000-7000-8000-0000000000ff' } },
  ])('turns a 201 for $name into a retryable invalid-response', async ({ patch }) => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    stubFetch(() => Promise.resolve(raw(JSON.stringify({ ...MESSAGE, ...patch }), 201)));
    const error: unknown = await sendMessage(PROTOTYPE_CHANNEL_ID, PAYLOAD).catch(
      (e: unknown) => e,
    );
    expect(error).toBeInstanceOf(SendMessageError);
    expect(error).toMatchObject({ kind: 'invalid-response', status: 201, retryable: true });
  });

  it('accepts a 201 whose ids differ only in case', async () => {
    const upper = { ...PAYLOAD, clientMsgId: PAYLOAD.clientMsgId.toUpperCase() };
    stubFetch(() => Promise.resolve(raw(JSON.stringify(MESSAGE), 201)));
    await expect(sendMessage(PROTOTYPE_CHANNEL_ID.toUpperCase(), upper)).resolves.toEqual(MESSAGE);
  });

  it('turns a 201 with unparseable JSON into a retryable invalid-response', async () => {
    stubFetch(() => Promise.resolve(raw('not json', 201)));
    const sending = sendMessage(PROTOTYPE_CHANNEL_ID, PAYLOAD);
    await expect(sending).rejects.toBeInstanceOf(SendMessageError);
    await expect(sending).rejects.toMatchObject({
      kind: 'invalid-response',
      status: 201,
      retryable: true,
    });
  });
});

describe('classifySendError', () => {
  it.each<{ kind: SendErrorKind; status?: number; retryable: boolean; reason: string }>([
    { kind: 'network', retryable: true, reason: 'no connection to the server' },
    { kind: 'timeout', retryable: true, reason: 'the server did not answer in time' },
    {
      kind: 'server',
      status: 500,
      retryable: true,
      reason: 'the server is unavailable right now (500)',
    },
    {
      kind: 'server',
      status: 503,
      retryable: true,
      reason: 'the server is unavailable right now (503)',
    },
    {
      kind: 'server',
      status: 408,
      retryable: true,
      reason: 'the server is unavailable right now (408)',
    },
    {
      kind: 'server',
      status: 429,
      retryable: true,
      reason: 'the server is unavailable right now (429)',
    },
    { kind: 'server', retryable: true, reason: 'the server is unavailable right now' },
    {
      kind: 'rejected',
      status: 400,
      retryable: false,
      reason: 'the server rejected the message (400)',
    },
    { kind: 'rejected', status: 404, retryable: false, reason: 'the channel was not found (404)' },
    {
      kind: 'rejected',
      status: 409,
      retryable: false,
      reason: 'this message key was already used in another channel (409)',
    },
    { kind: 'rejected', status: 413, retryable: false, reason: 'the message is too large (413)' },
    {
      kind: 'rejected',
      status: 403,
      retryable: false,
      reason: 'the server rejected the message (403)',
    },
    {
      kind: 'invalid-response',
      status: 201,
      retryable: true,
      reason: 'the server sent an unexpected response',
    },
  ])('maps $kind $status to "$reason"', ({ kind, status, retryable, reason }) => {
    const error = new SendMessageError(kind, status === undefined ? {} : { status });
    expect(classifySendError(error)).toEqual({ retryable, reason });
  });

  it.each([
    { name: 'a plain Error', error: new Error('server said: secret detail') },
    { name: 'a thrown string', error: 'boom' },
  ])('maps $name to a retryable generic reason', ({ error }) => {
    expect(classifySendError(error)).toEqual({ retryable: true, reason: 'something went wrong' });
  });
});
