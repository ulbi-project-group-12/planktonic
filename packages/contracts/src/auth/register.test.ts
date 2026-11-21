import { describe, expect, it } from 'vitest';
import {
  EMAIL_MAX_LENGTH,
  PASSWORD_MAX_LENGTH,
  RegisterConflictResponseSchema,
  RegisterRequestSchema,
  RegisterResponseSchema,
  ValidationErrorResponse,
} from '../index.js';

const request = {
  name: 'Ada',
  email: 'Ada@example.com',
  password: '123456789012',
  confirmPassword: '123456789012',
};

describe('RegisterRequestSchema', () => {
  it('accepts a 12-character password and trims name and email', () => {
    expect(
      RegisterRequestSchema.parse({ ...request, name: ' Ada ', email: ' Ada@example.com ' }),
    ).toEqual(request);
  });

  it.each([
    ['name', '   '],
    ['name', 'A\u0000da'],
    ['email', 'invalid'],
    ['password', undefined],
    ['confirmPassword', undefined],
    ['name', undefined],
    ['email', undefined],
    ['confirmPassword', 123456789012],
    ['confirmPassword', '123456789012 '],
  ] as const)('reports invalid %s on its field', (field, value) => {
    const result = RegisterRequestSchema.safeParse({ ...request, [field]: value });

    expect(result.error?.issues).toEqual(
      expect.arrayContaining([expect.objectContaining({ path: [field] })]),
    );
  });

  it('reports an 11-character password on the password field', () => {
    const password = '12345678901';
    const result = RegisterRequestSchema.safeParse({
      ...request,
      password,
      confirmPassword: password,
    });

    expect(result.error?.issues).toEqual([expect.objectContaining({ path: ['password'] })]);
  });
});

describe('RegisterRequestSchema length limits', () => {
  const emailOfLength = (length: number) =>
    `${'a'.repeat(length - '@example.com'.length)}@example.com`;

  it('accepts an email and a password at their upper bounds', () => {
    const password = 'p'.repeat(PASSWORD_MAX_LENGTH);
    const result = RegisterRequestSchema.safeParse({
      ...request,
      email: emailOfLength(EMAIL_MAX_LENGTH),
      password,
      confirmPassword: password,
    });

    expect(result.success).toBe(true);
  });

  it('reports an email over the limit on the email field', () => {
    const result = RegisterRequestSchema.safeParse({
      ...request,
      email: emailOfLength(EMAIL_MAX_LENGTH + 1),
    });

    expect(result.error?.issues).toEqual([expect.objectContaining({ path: ['email'] })]);
  });

  it('reports a password over the limit on the password field', () => {
    const password = 'p'.repeat(PASSWORD_MAX_LENGTH + 1);
    const result = RegisterRequestSchema.safeParse({
      ...request,
      password,
      confirmPassword: password,
    });

    expect(result.error?.issues).toEqual([expect.objectContaining({ path: ['password'] })]);
  });
});

describe('RegisterResponseSchema', () => {
  it('returns only public user fields', () => {
    const response = {
      id: '019a8f00-0000-7000-8000-000000000004',
      name: request.name,
      email: request.email,
    };

    expect(RegisterResponseSchema.parse({ ...request, ...response, passwordHash: 'hash' })).toEqual(
      response,
    );
  });
});

describe('registration error responses', () => {
  it('shares the HTTP 400 field issue format', () => {
    const response = {
      statusCode: 400,
      message: 'Validation failed',
      issues: [{ path: 'password', message: 'Password is too short' }],
    };

    expect(ValidationErrorResponse.parse(response)).toEqual(response);
  });

  it('requires HTTP 409 and an issue on email for an existing account', () => {
    const response = {
      statusCode: 409,
      message: 'Email is already in use',
      issues: [{ path: 'email', message: 'Email is already in use' }],
    };

    expect(RegisterConflictResponseSchema.parse(response)).toEqual(response);
    expect(RegisterConflictResponseSchema.safeParse({ ...response, statusCode: 400 }).success).toBe(
      false,
    );
    expect(
      RegisterConflictResponseSchema.safeParse({
        ...response,
        issues: [{ path: 'password', message: 'Password is too short' }],
      }).success,
    ).toBe(false);
  });

  it.each([undefined, []])('rejects a conflict with missing or empty issues (%j)', (issues) => {
    const result = RegisterConflictResponseSchema.safeParse({
      statusCode: 409,
      message: 'Email is already in use',
      issues,
    });

    expect(result.error?.issues).toEqual([expect.objectContaining({ path: ['issues'] })]);
  });
});
