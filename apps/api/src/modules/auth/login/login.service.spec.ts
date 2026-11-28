import { createHash } from 'node:crypto';
import { ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { hash } from 'argon2';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { LoginAttemptsConnection } from './login-attempts.connection.js';
import { LoginAttemptsStore } from './login-attempts.store.js';
import { LoginRepository } from './login.repository.js';
import { LoginService } from './login.service.js';
import { SessionRepository } from '../session/session.repository.js';

const request = { email: 'ada@example.com', password: 'example-passphrase' };
const accessSecret = 'test-only-access-token-signing-secret';
const refreshSecret = 'test-only-refresh-token-signing-secret';
let passwordHash: string;

beforeAll(async () => {
  passwordHash = await hash(request.password);
});

async function setup(
  options: { accessSecret?: string | null; refreshSecret?: string | null } = {},
) {
  const findActiveByEmail = vi.fn<LoginRepository['findActiveByEmail']>();
  const createSession = vi.fn<SessionRepository['create']>();
  const signAsync = vi.fn();
  const store = {
    begin: vi.fn().mockResolvedValue({ id: 'reservation' }),
    finish: vi.fn().mockResolvedValue(undefined),
  } as unknown as LoginAttemptsStore;
  const config = {
    get: (key: 'JWT_ACCESS_SECRET' | 'JWT_REFRESH_SECRET') =>
      key === 'JWT_ACCESS_SECRET'
        ? Object.hasOwn(options, 'accessSecret')
          ? options.accessSecret
          : accessSecret
        : Object.hasOwn(options, 'refreshSecret')
          ? options.refreshSecret
          : refreshSecret,
  };
  const moduleRef = await Test.createTestingModule({
    providers: [
      LoginService,
      {
        provide: LoginAttemptsConnection,
        useValue: {
          run: (operation: (store: LoginAttemptsStore) => Promise<unknown>) => operation(store),
        },
      },
      { provide: LoginRepository, useValue: { findActiveByEmail } },
      { provide: SessionRepository, useValue: { create: createSession } },
      { provide: JwtService, useValue: { signAsync } },
      { provide: ConfigService, useValue: { get: config.get } },
    ],
  }).compile();
  return {
    service: moduleRef.get(LoginService),
    findActiveByEmail,
    createSession,
    signAsync,
    store,
  };
}

describe('LoginService.login', () => {
  it('fails before looking up the account when the access secret is missing', async () => {
    const { service, findActiveByEmail, signAsync } = await setup({ accessSecret: undefined });

    await expect(service.login(request, '127.0.0.1')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    expect(findActiveByEmail).not.toHaveBeenCalled();
    expect(signAsync).not.toHaveBeenCalled();
  });

  it('fails before looking up the account when the refresh secret is missing', async () => {
    const { service, findActiveByEmail, signAsync } = await setup({ refreshSecret: undefined });

    await expect(service.login(request, '127.0.0.1')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    expect(findActiveByEmail).not.toHaveBeenCalled();
    expect(signAsync).not.toHaveBeenCalled();
  });

  it('rejects an account with a disabled password without signing a token', async () => {
    const { service, findActiveByEmail, signAsync } = await setup();
    findActiveByEmail.mockResolvedValue({
      id: '019a8f00-0000-7000-8000-000000000004',
      passwordHash: '!',
    });

    await expect(service.login(request, '127.0.0.1')).rejects.toBeInstanceOf(UnauthorizedException);
    expect(signAsync).not.toHaveBeenCalled();
  });

  it('propagates unexpected repository errors without signing a token', async () => {
    const { service, findActiveByEmail, signAsync, store } = await setup();
    const failure = new Error('connection lost');
    findActiveByEmail.mockRejectedValue(failure);

    await expect(service.login(request, '127.0.0.1')).rejects.toBe(failure);
    expect(store.finish).toHaveBeenCalledWith(
      request.email,
      '127.0.0.1',
      'reservation',
      'cancelled',
    );
    expect(signAsync).not.toHaveBeenCalled();
  });

  it('creates a session and returns both tokens for valid credentials', async () => {
    const userId = '019a8f00-0000-7000-8000-000000000004';
    const { service, findActiveByEmail, createSession, signAsync } = await setup();
    findActiveByEmail.mockResolvedValue({ id: userId, passwordHash });
    signAsync.mockImplementation((payload: { sub: string; sid: string }) =>
      Promise.resolve(`signed-${payload.sub}-${payload.sid}`),
    );

    const result = await service.login(request, '127.0.0.1', 'TestAgent/1.0');

    expect(result.accessToken).toMatch(/^signed-/);
    expect(result.refreshToken).toMatch(/^signed-/);
    expect(createSession).toHaveBeenCalledTimes(1);
    const sessionCall = createSession.mock.calls[0]![0];
    expect(sessionCall.userId).toBe(userId);
    expect(sessionCall.refreshTokenHash).toBe(
      createHash('sha256').update(result.refreshToken).digest('hex'),
    );
    expect(sessionCall.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });
});

describe('LoginService browser detection', () => {
  it.each([
    ['Edge', 'Mozilla/5.0 Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0', 'Edge 131'],
    ['Opera', 'Mozilla/5.0 Chrome/120.0.0.0 Safari/537.36 OPR/106.0.0.0', 'Opera 106'],
    [
      'Yandex Browser',
      'Mozilla/5.0 Chrome/128.0.0.0 Safari/537.36 YaBrowser/24.10.0.0',
      'YaBrowser 24',
    ],
    ['Chrome', 'Mozilla/5.0 Chrome/131.0.0.0 Safari/537.36', 'Chrome 131'],
    ['Firefox', 'Mozilla/5.0 Firefox/133.0', 'Firefox 133'],
    ['Safari', 'Mozilla/5.0 Safari/17.0', 'Safari 17'],
  ])('records %s without falling back to Chrome', async (_name, userAgent, browser) => {
    const { service, findActiveByEmail, createSession, signAsync } = await setup();
    findActiveByEmail.mockResolvedValue({
      id: '019a8f00-0000-7000-8000-000000000004',
      passwordHash,
    });
    signAsync.mockResolvedValue('signed-token');

    await service.login(request, '127.0.0.1', userAgent);

    expect(createSession).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ browser }));
  });
});
