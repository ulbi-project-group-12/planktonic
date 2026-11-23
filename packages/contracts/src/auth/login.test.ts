import { describe, expect, it } from 'vitest';
import {
  EMAIL_MAX_LENGTH,
  LoginRequestSchema,
  LoginResponseSchema,
  PASSWORD_MAX_LENGTH,
} from '../index.js';

const request = { email: 'Ada@example.com', password: ' pass ' };
const emailDomain = `@${'a'.repeat(63)}.${'b'.repeat(63)}.${'c'.repeat(60)}.com`;
const maxLengthEmail = `${'a'.repeat(EMAIL_MAX_LENGTH - emailDomain.length)}${emailDomain}`;

describe('LoginRequestSchema', () => {
  it('accepts email and password, trimming only the email', () => {
    expect(LoginRequestSchema.parse({ ...request, email: ' Ada@example.com ' })).toEqual(request);
  });

  it('accepts an email at the maximum length', () => {
    const input = { ...request, email: maxLengthEmail };

    expect(LoginRequestSchema.parse(input)).toEqual(input);
  });

  it('accepts a password at the maximum length', () => {
    const input = { ...request, password: 'p'.repeat(PASSWORD_MAX_LENGTH) };

    expect(LoginRequestSchema.parse(input)).toEqual(input);
  });

  it.each([
    ['email', undefined],
    ['email', 'invalid'],
    ['email', `a${maxLengthEmail}`],
    ['password', undefined],
    ['password', ''],
    ['password', 123],
    ['password', 'p'.repeat(PASSWORD_MAX_LENGTH + 1)],
  ] as const)('reports an invalid %s on its field (%j)', (field, value) => {
    const result = LoginRequestSchema.safeParse({ ...request, [field]: value });

    expect(result.error?.issues).toEqual([expect.objectContaining({ path: [field] })]);
  });
});

describe('LoginResponseSchema', () => {
  it('accepts an access token', () => {
    const response = { accessToken: 'example-access-token' };

    expect(LoginResponseSchema.parse(response)).toEqual(response);
  });

  it.each([undefined, '', 123])('rejects an invalid access token (%j)', (accessToken) => {
    const result = LoginResponseSchema.safeParse({ accessToken });

    expect(result.error?.issues).toEqual([expect.objectContaining({ path: ['accessToken'] })]);
  });
});
