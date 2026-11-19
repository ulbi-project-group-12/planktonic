import { describe, expect, it } from 'vitest';
import {
  ClientMsgId,
  CreateMessageBody,
  GetMessagesQuery,
  MessageResponse,
  MessageSeq,
} from './message.js';

describe('MessageSeq', () => {
  it.each(['1', '42', '9007199254740993'])('accepts %s', (value) => {
    expect(MessageSeq.safeParse(value).success).toBe(true);
  });

  it.each(['0', '01', '-1', '1.5', '', 7])('rejects %j', (value) => {
    expect(MessageSeq.safeParse(value).success).toBe(false);
  });
});

describe('MessageResponse', () => {
  it('requires seq as a string', () => {
    const message = {
      id: '00000000-0000-7000-8000-000000000003',
      seq: '7',
      channelId: '00000000-0000-7000-8000-000000000001',
      authorId: '00000000-0000-7000-8000-000000000002',
      clientMsgId: '019a8f00-0000-7000-8000-000000000004',
      body: 'hello',
      createdAt: '2026-11-16T10:00:00.000Z',
    };
    expect(MessageResponse.safeParse(message).success).toBe(true);
    expect(MessageResponse.safeParse({ ...message, seq: 7 }).success).toBe(false);
  });
});

describe('ClientMsgId', () => {
  it('accepts a UUIDv7', () => {
    expect(ClientMsgId.safeParse('019a8f00-0000-7000-8000-000000000004').success).toBe(true);
  });

  it('lowercases the key, as Postgres returns it', () => {
    expect(ClientMsgId.parse('019A8F00-0000-7000-8000-00000000000A')).toBe(
      '019a8f00-0000-7000-8000-00000000000a',
    );
  });

  it.each(['550e8400-e29b-41d4-a716-446655440000', 'not-a-uuid', ''])('rejects %j', (value) => {
    expect(ClientMsgId.safeParse(value).success).toBe(false);
  });
});

describe('CreateMessageBody', () => {
  it('requires clientMsgId', () => {
    expect(CreateMessageBody.safeParse({ body: 'hi' }).success).toBe(false);
    expect(
      CreateMessageBody.safeParse({
        clientMsgId: '019a8f00-0000-7000-8000-000000000004',
        body: 'hi',
      }).success,
    ).toBe(true);
  });
});

describe('GetMessagesQuery', () => {
  it('defaults limit to 100 and leaves afterSeq out', () => {
    expect(GetMessagesQuery.parse({})).toEqual({ limit: 100 });
  });

  it.each(['0', '41', '9223372036854775807'])('accepts afterSeq %s, kept as a string', (value) => {
    expect(GetMessagesQuery.parse({ afterSeq: value }).afterSeq).toBe(value);
  });

  it.each(['abc', '1e2', ' 7', '-1', '01', '', '9223372036854775808', '1'.repeat(40)])(
    'rejects afterSeq %j',
    (value) => {
      expect(GetMessagesQuery.safeParse({ afterSeq: value }).success).toBe(false);
    },
  );

  it.each([
    ['1', 1],
    ['100', 100],
  ])('accepts limit %s as %d', (value, expected) => {
    expect(GetMessagesQuery.parse({ limit: value }).limit).toBe(expected);
  });

  it.each(['0', '101', '1e2', '-5', '5.5', 'all', ''])('rejects limit %j', (value) => {
    expect(GetMessagesQuery.safeParse({ limit: value }).success).toBe(false);
  });

  it('drops unknown keys', () => {
    expect(GetMessagesQuery.parse({ limit: '5', _: '123' })).toEqual({ limit: 5 });
  });
});
