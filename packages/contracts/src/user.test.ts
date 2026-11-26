import { describe, expect, it } from 'vitest';
import {
  MeResponseSchema,
  TimeZone,
  UpdateMeRequestSchema,
  UserName,
  USER_NAME_MAX_LENGTH,
  USER_NAME_MIN_LENGTH,
} from './index.js';

describe('UserName', () => {
  it('accepts a trimmed display name', () => {
    expect(UserName.parse('  Ada  ')).toBe('Ada');
  });

  it('rejects names outside the length bounds', () => {
    expect(UserName.safeParse('a'.repeat(USER_NAME_MIN_LENGTH - 1)).success).toBe(false);
    expect(UserName.safeParse('a'.repeat(USER_NAME_MAX_LENGTH + 1)).success).toBe(false);
  });

  it('rejects a name with a null character', () => {
    expect(UserName.safeParse('Ada\u0000').success).toBe(false);
  });
});

describe('TimeZone', () => {
  it.each(['Europe/Moscow', 'Europe/Berlin', 'America/New_York', 'Asia/Vladivostok'])(
    'accepts the canonical zone %s',
    (tz) => {
      expect(TimeZone.parse(tz)).toBe(tz);
    },
  );

  it('accepts UTC, which V8 does not list in supportedValuesOf', () => {
    expect(TimeZone.parse('UTC')).toBe('UTC');
  });

  // Engines disagree on the listed spelling: Node and Chrome list the first of each pair,
  // Firefox the second. A picker built in either browser must be able to save its value.
  it.each([
    'Europe/Kiev',
    'Europe/Kyiv',
    'Asia/Calcutta',
    'Asia/Kolkata',
    'Asia/Saigon',
    'Asia/Ho_Chi_Minh',
    'America/Argentina/Buenos_Aires',
  ])('accepts %s whichever spelling the runtime lists', (tz) => {
    expect(TimeZone.parse(tz)).toBe(tz);
  });

  it.each([
    'Mars/Olympus_Mons',
    'Europe/Berlin!',
    'Europe/Berlin ',
    'europe/berlin',
    'Europe/BERLIN',
    '+05:00',
    'GMT+3',
    'EST',
    '',
  ])('rejects %j', (tz) => {
    expect(TimeZone.safeParse(tz).success).toBe(false);
  });
});

describe('UpdateMeRequestSchema', () => {
  it.each([{ name: 'Ada' }, { tz: 'Europe/Berlin' }, { name: 'Ada', tz: 'Europe/Berlin' }])(
    'accepts %j',
    (body) => {
      expect(UpdateMeRequestSchema.parse(body)).toEqual(body);
    },
  );

  it('requires at least one field', () => {
    const result = UpdateMeRequestSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects a field that fails its own schema', () => {
    expect(UpdateMeRequestSchema.safeParse({ tz: 'Mars/Olympus_Mons' }).success).toBe(false);
    expect(UpdateMeRequestSchema.safeParse({ name: 'a' }).success).toBe(false);
  });
});

describe('MeResponseSchema', () => {
  const me = {
    id: '019aeeda-6f30-7c68-9f1f-0ac8b21e7f50',
    name: 'Ada',
    email: 'ada@example.com',
    tz: 'Europe/Berlin',
  };

  it('accepts a profile with an IANA zone', () => {
    expect(MeResponseSchema.parse(me)).toEqual(me);
  });

  it('rejects a profile without a zone or with an invalid one', () => {
    const withoutTz = { id: me.id, name: me.name, email: me.email };
    expect(MeResponseSchema.safeParse(withoutTz).success).toBe(false);
    expect(MeResponseSchema.safeParse({ ...me, tz: 'GMT+3' }).success).toBe(false);
  });
});
