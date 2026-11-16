import { describe, expect, it } from 'vitest';
import { MessageResponse, MessageSeq } from './message.js';

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
      body: 'hello',
      createdAt: '2026-11-16T10:00:00.000Z',
    };
    expect(MessageResponse.safeParse(message).success).toBe(true);
    expect(MessageResponse.safeParse({ ...message, seq: 7 }).success).toBe(false);
  });
});
