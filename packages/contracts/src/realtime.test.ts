import { describe, expect, it } from 'vitest';
import { MESSAGE_NEW_EVENT, MessageNewEvent } from './realtime.js';

const message = {
  id: '00000000-0000-7000-8000-000000000003',
  seq: '7',
  channelId: '00000000-0000-7000-8000-000000000001',
  authorId: '00000000-0000-7000-8000-000000000002',
  clientMsgId: '019a8f00-0000-7000-8000-000000000004',
  body: 'hello',
  createdAt: '2026-11-16T10:00:00.000Z',
};

describe('MessageNewEvent', () => {
  it('is named message:new', () => {
    expect(MESSAGE_NEW_EVENT).toBe('message:new');
  });

  it('carries the full message, as the POST response does', () => {
    expect(MessageNewEvent.parse({ message })).toEqual({ message });
  });

  it('rejects a message without its seq or clientMsgId', () => {
    for (const missing of [{ seq: undefined }, { clientMsgId: undefined }]) {
      expect(MessageNewEvent.safeParse({ message: { ...message, ...missing } }).success).toBe(
        false,
      );
    }
  });
});
