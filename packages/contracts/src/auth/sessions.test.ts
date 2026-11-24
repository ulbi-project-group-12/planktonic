import { describe, expect, it } from 'vitest';
import {
  AuthSessionParamsSchema,
  AuthSessionSchema,
  AuthSessionsResponseSchema,
} from '../index.js';

const session = {
  id: '019a8f00-0000-7000-8000-0000000000c1',
  browser: 'Chrome 130',
  os: 'Windows 11',
  signedInAt: '2026-11-20T10:00:00.000Z',
  lastActiveAt: '2026-11-24T11:58:00.000Z',
  isCurrent: true,
};

describe('AuthSessionSchema', () => {
  it('accepts a session and a list of sessions', () => {
    expect(AuthSessionSchema.parse(session)).toEqual(session);
    expect(AuthSessionsResponseSchema.parse([session])).toEqual([session]);
  });

  it('accepts a session whose User-Agent could not be parsed', () => {
    const unknown = { ...session, browser: null, os: null };

    expect(AuthSessionSchema.parse(unknown)).toEqual(unknown);
  });

  it.each([
    ['a local time without an offset', { signedInAt: '2026-11-20T10:00:00' }],
    ['a date without a time', { lastActiveAt: '2026-11-24' }],
    ['an id that is not a UUID', { id: 'session-1' }],
  ])('rejects %s', (_name, patch) => {
    expect(AuthSessionSchema.safeParse({ ...session, ...patch }).success).toBe(false);
  });
});

describe('AuthSessionParamsSchema', () => {
  it('accepts a UUID and rejects anything else', () => {
    expect(AuthSessionParamsSchema.safeParse({ sessionId: session.id }).success).toBe(true);
    expect(AuthSessionParamsSchema.safeParse({ sessionId: '../me' }).success).toBe(false);
  });
});
