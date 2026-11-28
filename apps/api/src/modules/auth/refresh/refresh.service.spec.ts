import { createHash, randomUUID } from 'node:crypto';
import { ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { describe, expect, it, vi } from 'vitest';
import { AuthRepository } from '../auth.repository.js';
import { SessionRepository } from '../session/session.repository.js';
import { RefreshService } from './refresh.service.js';

const accessSecret = 'test-only-access-token-signing-secret';
const refreshSecret = 'test-only-refresh-token-signing-secret';
const userId = '019a8f00-0000-7000-8000-000000000001';
const sessionId = '019a8f00-0000-7000-8000-000000000002';

async function setup(
  options: { accessSecret?: string | null; refreshSecret?: string | null } = {},
) {
  const jwt = new JwtService();
  const findActiveByIdWithUser = vi.fn<SessionRepository['findActiveByIdWithUser']>();
  const findActiveById = vi.fn<AuthRepository['findActiveById']>();
  const rotateRefreshToken = vi.fn<SessionRepository['rotateRefreshToken']>();
  const revoke = vi.fn<SessionRepository['revoke']>();
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
      RefreshService,
      { provide: JwtService, useValue: jwt },
      { provide: ConfigService, useValue: { get: config.get } },
      {
        provide: SessionRepository,
        useValue: { findActiveByIdWithUser, rotateRefreshToken, revoke },
      },
      { provide: AuthRepository, useValue: { findActiveById } },
    ],
  }).compile();
  return {
    service: moduleRef.get(RefreshService),
    jwt,
    findActiveByIdWithUser,
    findActiveById,
    rotateRefreshToken,
    revoke,
  };
}

function makeRefreshToken(
  jwt: JwtService,
  overrides: { sid?: string; sub?: string; exp?: string } = {},
): string {
  const payload: { sub: string; sid: string; jti: string } = {
    sub: overrides.sub ?? userId,
    sid: overrides.sid ?? sessionId,
    jti: randomUUID(),
  };
  const options = {
    secret: refreshSecret,
    algorithm: 'HS256',
    expiresIn: overrides.exp ?? '7d',
  } as const;
  return jwt.sign(payload, options as Parameters<JwtService['sign']>[1]);
}

describe('RefreshService.refresh', () => {
  it('rejects when the access secret is missing', async () => {
    const { service } = await setup({ accessSecret: undefined });
    await expect(service.refresh('token')).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('rejects when the refresh secret is missing', async () => {
    const { service } = await setup({ refreshSecret: undefined });
    await expect(service.refresh('token')).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('rejects a missing token', async () => {
    const { service } = await setup();
    await expect(service.refresh(undefined)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects a malformed token', async () => {
    const { service } = await setup();
    await expect(service.refresh('not-a-jwt')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects an expired token', async () => {
    const { service, jwt } = await setup();
    const token = makeRefreshToken(jwt, { exp: '-1s' });
    await expect(service.refresh(token)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects a token signed with another secret', async () => {
    const { service, jwt } = await setup();
    const token = jwt.sign(
      { sub: userId, sid: sessionId },
      { secret: `${refreshSecret}-other`, expiresIn: '7d' },
    );
    await expect(service.refresh(token)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects when the session is unknown', async () => {
    const { service, jwt, findActiveByIdWithUser } = await setup();
    findActiveByIdWithUser.mockResolvedValue(null);
    const token = makeRefreshToken(jwt);
    await expect(service.refresh(token)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects when the session user does not match the token sub', async () => {
    const { service, jwt, findActiveByIdWithUser } = await setup();
    findActiveByIdWithUser.mockResolvedValue({
      id: sessionId,
      userId: '019a8f00-0000-7000-8000-000000000003',
      refreshTokenHash: 'hash',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      createdAt: new Date(),
      lastUsedAt: new Date(),
      revokedAt: null,
      browser: null,
      os: null,
      user: {
        id: '019a8f00-0000-7000-8000-000000000003',
        name: 'Eve',
        email: 'eve@example.com',
        tz: 'Europe/Moscow',
        passwordHash: '!',
        deactivatedAt: null,
      },
    });
    const token = makeRefreshToken(jwt);
    await expect(service.refresh(token)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects when the account is deactivated', async () => {
    const { service, jwt, findActiveByIdWithUser, findActiveById } = await setup();
    findActiveByIdWithUser.mockResolvedValue({
      id: sessionId,
      userId,
      refreshTokenHash: 'hash',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      createdAt: new Date(),
      lastUsedAt: new Date(),
      revokedAt: null,
      browser: null,
      os: null,
      user: {
        id: userId,
        name: 'Ada',
        email: 'ada@example.com',
        tz: 'Europe/Moscow',
        passwordHash: '!',
        deactivatedAt: new Date(),
      },
    });
    findActiveById.mockResolvedValue(null);
    const token = makeRefreshToken(jwt);
    await expect(service.refresh(token)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('revokes the session and rejects when the token hash does not match', async () => {
    const { service, jwt, findActiveByIdWithUser, findActiveById, revoke } = await setup();
    findActiveByIdWithUser.mockResolvedValue({
      id: sessionId,
      userId,
      refreshTokenHash: 'different-hash',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      createdAt: new Date(),
      lastUsedAt: new Date(),
      revokedAt: null,
      browser: null,
      os: null,
      user: {
        id: userId,
        name: 'Ada',
        email: 'ada@example.com',
        tz: 'Europe/Moscow',
        passwordHash: '!',
        deactivatedAt: null,
      },
    });
    findActiveById.mockResolvedValue({
      id: userId,
      name: 'Ada',
      email: 'ada@example.com',
      tz: 'Europe/Moscow',
    });
    const token = makeRefreshToken(jwt);
    await expect(service.refresh(token)).rejects.toBeInstanceOf(UnauthorizedException);
    expect(revoke).toHaveBeenCalledWith(sessionId, expect.any(Date));
  });

  it('returns new tokens and rotates the stored hash', async () => {
    const { service, jwt, findActiveByIdWithUser, findActiveById, rotateRefreshToken } =
      await setup();
    const token = makeRefreshToken(jwt);
    const tokenHash = createHash('sha256').update(token).digest('hex');
    findActiveByIdWithUser.mockResolvedValue({
      id: sessionId,
      userId,
      refreshTokenHash: tokenHash,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      createdAt: new Date(),
      lastUsedAt: new Date(),
      revokedAt: null,
      browser: null,
      os: null,
      user: {
        id: userId,
        name: 'Ada',
        email: 'ada@example.com',
        tz: 'Europe/Moscow',
        passwordHash: '!',
        deactivatedAt: null,
      },
    });
    findActiveById.mockResolvedValue({
      id: userId,
      name: 'Ada',
      email: 'ada@example.com',
      tz: 'Europe/Moscow',
    });
    rotateRefreshToken.mockResolvedValue(true);

    const result = await service.refresh(token);

    expect(result.accessToken).toBeTruthy();
    expect(result.refreshToken).toBeTruthy();
    expect(result.sessionId).toBe(sessionId);
    expect(rotateRefreshToken).toHaveBeenCalledWith(
      sessionId,
      expect.any(String),
      expect.any(String),
      expect.any(Date),
    );
  });

  it('revokes the session when rotation reports no change', async () => {
    const { service, jwt, findActiveByIdWithUser, findActiveById, rotateRefreshToken, revoke } =
      await setup();
    const token = makeRefreshToken(jwt);
    const tokenHash = createHash('sha256').update(token).digest('hex');
    findActiveByIdWithUser.mockResolvedValue({
      id: sessionId,
      userId,
      refreshTokenHash: tokenHash,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      createdAt: new Date(),
      lastUsedAt: new Date(),
      revokedAt: null,
      browser: null,
      os: null,
      user: {
        id: userId,
        name: 'Ada',
        email: 'ada@example.com',
        tz: 'Europe/Moscow',
        passwordHash: '!',
        deactivatedAt: null,
      },
    });
    findActiveById.mockResolvedValue({
      id: userId,
      name: 'Ada',
      email: 'ada@example.com',
      tz: 'Europe/Moscow',
    });
    rotateRefreshToken.mockResolvedValue(false);

    await expect(service.refresh(token)).rejects.toBeInstanceOf(UnauthorizedException);
    expect(revoke).toHaveBeenCalledWith(sessionId, expect.any(Date));
  });
});
