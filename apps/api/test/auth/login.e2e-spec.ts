import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { LoginResponseSchema, ValidationErrorResponse } from '@app/contracts';
import { hash } from 'argon2';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { configureApp } from '../../src/app.setup.js';
import { AuthModule } from '../../src/modules/auth/auth.module.js';
import { AuthRepository } from '../../src/modules/auth/auth.repository.js';
import { LoginAttemptsConnection } from '../../src/modules/auth/login/login-attempts.connection.js';
import type { LoginAttemptsStore } from '../../src/modules/auth/login/login-attempts.store.js';
import { LoginRepository } from '../../src/modules/auth/login/login.repository.js';
import { RegisterRepository } from '../../src/modules/auth/register/register.repository.js';

const secret = 'test-only-access-token-signing-secret';
const request = { email: 'ada@example.com', password: ' example-passphrase ' };
const userId = '019a8f00-0000-7000-8000-000000000004';
const findActiveByEmail = vi.fn<LoginRepository['findActiveByEmail']>();

const attempts = {
  begin: vi.fn<LoginAttemptsStore['begin']>(),
  finish: vi.fn<LoginAttemptsStore['finish']>(),
};
let app: INestApplication | undefined;
let baseUrl: string;
let passwordHash: string;

beforeAll(async () => {
  passwordHash = await hash(request.password);
  const moduleRef = await Test.createTestingModule({ imports: [AuthModule] })
    .overrideProvider(ConfigService)
    .useValue({ get: () => secret })
    .overrideProvider(LoginAttemptsConnection)
    .useValue({
      run: (operation: (store: typeof attempts) => Promise<unknown>) => operation(attempts),
    })
    .overrideProvider(LoginRepository)
    .useValue({ findActiveByEmail })
    .overrideProvider(RegisterRepository)
    .useValue({})
    .overrideProvider(AuthRepository)
    .useValue({})
    .compile();
  app = configureApp(moduleRef.createNestApplication({ logger: false }));
  await app.listen(0, '127.0.0.1');
  baseUrl = await app.getUrl();
});

beforeEach(() => {
  findActiveByEmail.mockReset();
  attempts.begin.mockReset().mockResolvedValue({ id: 'reservation' });
  attempts.finish.mockReset().mockResolvedValue(undefined);
});

afterAll(async () => {
  await app?.close();
});

function login(body: unknown) {
  return fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/auth/login', () => {
  it('returns the wait in seconds with HTTP 429 before checking the credentials', async () => {
    attempts.begin.mockResolvedValue({ retryAfterMs: 1500 });

    const response = await login(request);

    expect(response.status).toBe(429);
    expect(response.headers.get('retry-after')).toBe('2');
    expect(await response.json()).toEqual({
      statusCode: 429,
      message: 'Too many login attempts',
      retryAfterSeconds: 2,
    });
    expect(findActiveByEmail).not.toHaveBeenCalled();
    expect(attempts.finish).not.toHaveBeenCalled();
  });

  it('returns a signed access token valid for 15 minutes', async () => {
    findActiveByEmail.mockResolvedValue({ id: userId, passwordHash });

    const response = await login({ ...request, email: ` ${request.email} ` });

    expect(response.status).toBe(200);
    const body: unknown = await response.json();
    const payload = LoginResponseSchema.parse(body);
    expect(body).toEqual(payload);
    const jwt = new JwtService();
    const claims = jwt.verify<{ iat: number; exp: number }>(payload.accessToken, {
      secret,
      algorithms: ['HS256'],
    });
    expect(claims).toMatchObject({ sub: userId });
    expect(claims.exp - claims.iat).toBe(15 * 60);
    expect(findActiveByEmail).toHaveBeenCalledWith(request.email);
  });

  it('uses the same 401 response for an unknown email and a wrong password', async () => {
    findActiveByEmail
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: userId, passwordHash });

    const unknownEmail = await login({ ...request, email: 'unknown@example.com' });
    const wrongPassword = await login({ ...request, password: request.password.trim() });

    expect(unknownEmail.status).toBe(401);
    expect(wrongPassword.status).toBe(401);
    expect(await unknownEmail.json()).toEqual(await wrongPassword.json());
  });

  it('returns 400 before looking up the user when the request is invalid', async () => {
    const response = await login({ ...request, email: 'invalid' });

    expect(response.status).toBe(400);
    const error = ValidationErrorResponse.parse(await response.json());
    expect(error.issues.map(({ path }) => path)).toEqual(['email']);
    expect(findActiveByEmail).not.toHaveBeenCalled();
  });
});
