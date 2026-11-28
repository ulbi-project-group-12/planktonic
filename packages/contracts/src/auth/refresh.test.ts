import { describe, expect, it } from 'vitest';
import {
  RefreshResponseSchema,
  RefreshUnauthorizedResponseSchema,
  RefreshUnavailableResponseSchema,
} from './refresh.js';

describe('refresh contract', () => {
  it('accepts an access token response', () => {
    expect(RefreshResponseSchema.parse({ accessToken: 'a.b.c' })).toEqual({
      accessToken: 'a.b.c',
    });
  });

  it('rejects an empty access token', () => {
    expect(RefreshResponseSchema.safeParse({ accessToken: '' }).success).toBe(false);
  });

  it('accepts the expected 401 shape', () => {
    expect(
      RefreshUnauthorizedResponseSchema.parse({
        statusCode: 401,
        message: 'Unauthorized',
        error: 'Unauthorized',
      }),
    ).toBeDefined();
  });

  it('rejects a 401 with a different message', () => {
    expect(
      RefreshUnauthorizedResponseSchema.safeParse({
        statusCode: 401,
        message: 'Session expired',
        error: 'Unauthorized',
      }).success,
    ).toBe(false);
  });

  it('accepts the expected 503 shape', () => {
    expect(
      RefreshUnavailableResponseSchema.parse({
        statusCode: 503,
        message: 'Refresh is unavailable',
        error: 'Service Unavailable',
      }),
    ).toBeDefined();
  });
});
