import { describe, expect, it } from 'vitest';
import { getAuthRegisterMockHandler400, getAuthRegisterMockHandler409 } from '../api-mocks';
import { server } from '../api-mocks-node';
import { getApiIssues, hasApiStatus, isApiError } from './errors';
import { authRegister } from './generated/api';
import { ApiError } from './http-client';

const registration = {
  name: 'Ada',
  email: 'ada@example.com',
  password: 'test-password',
  confirmPassword: 'test-password',
};

async function failure(request: Promise<unknown>): Promise<unknown> {
  return request.then(
    () => {
      throw new Error('Expected the request to fail');
    },
    (error: unknown) => error,
  );
}

describe('isApiError', () => {
  it('accepts an HTTP error with any status', () => {
    expect(isApiError(new ApiError(409, undefined))).toBe(true);
    expect(isApiError(new ApiError(500, 'Bad gateway'))).toBe(true);
  });

  it('rejects network failures, aborts and foreign values', () => {
    expect(isApiError(new TypeError('Failed to fetch'))).toBe(false);
    expect(isApiError(new DOMException('Aborted', 'AbortError'))).toBe(false);
    expect(isApiError({ status: 400, body: {} })).toBe(false);
    expect(isApiError(undefined)).toBe(false);
  });
});

describe('hasApiStatus', () => {
  it('matches one status of an HTTP error and nothing else', () => {
    const error: unknown = new ApiError(409, undefined);

    expect(hasApiStatus(error, 409)).toBe(true);
    expect(hasApiStatus(error, 400)).toBe(false);
    expect(hasApiStatus(new TypeError('Failed to fetch'), 409)).toBe(false);
  });

  it('leaves an already narrowed error usable in the other branch', () => {
    const error = new ApiError(400, undefined);

    // A type predicate here would narrow `error` to never in the else branch.
    const status = hasApiStatus(error, 409) ? 409 : error.status;
    expect(status).toBe(400);
  });
});

describe('getApiIssues', () => {
  it('returns the issues of a validation error (400)', async () => {
    server.use(
      getAuthRegisterMockHandler400({
        statusCode: 400,
        message: 'Validation failed',
        issues: [
          { path: 'password', message: 'Too short' },
          { path: 'confirmPassword', message: 'Passwords do not match' },
        ],
      }),
    );

    expect(getApiIssues(await failure(authRegister(registration)))).toEqual([
      { path: 'password', message: 'Too short' },
      { path: 'confirmPassword', message: 'Passwords do not match' },
    ]);
  });

  it('returns the issues of a field conflict (409)', async () => {
    server.use(
      getAuthRegisterMockHandler409({
        statusCode: 409,
        message: 'Email is taken',
        issues: [{ path: 'email', message: 'Email is taken' }],
      }),
    );

    const error = await failure(authRegister(registration));
    expect(hasApiStatus(error, 409)).toBe(true);
    expect(getApiIssues(error)).toEqual([{ path: 'email', message: 'Email is taken' }]);
  });

  it('accepts issues with any status', () => {
    const issues = [{ path: 'name', message: 'Reserved' }];

    expect(getApiIssues(new ApiError(422, { issues }))).toEqual(issues);
  });

  it.each([
    ['a Nest error without issues', new ApiError(404, { statusCode: 404, message: 'Not found' })],
    ['a malformed issues list', new ApiError(400, { issues: [{ path: 1 }] })],
    ['a non-JSON body', new ApiError(502, 'Bad gateway')],
    ['an empty body', new ApiError(500, undefined)],
    ['a network failure', new TypeError('Failed to fetch')],
  ])('returns no issues for %s', (_, error) => {
    expect(getApiIssues(error)).toEqual([]);
  });
});
