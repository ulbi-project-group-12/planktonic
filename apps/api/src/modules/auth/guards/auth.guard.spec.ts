import { type ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { describe, expect, it, vi } from 'vitest';
import { AuthRepository } from '../auth.repository.js';
import type { AuthRequest } from '../auth.request.js';
import { Public } from '../decorators/public.decorator.js';
import { AuthGuard } from './auth.guard.js';

const secret = 'test-only-access-token-signing-secret';
const userId = '019a8f00-0000-7000-8000-000000000004';
const profile = { id: userId, name: 'Ada', email: 'ada@example.com' };

async function setup() {
  const jwt = new JwtService({ secret });
  const findActiveById = vi.fn<AuthRepository['findActiveById']>();
  const moduleRef = await Test.createTestingModule({
    providers: [
      AuthGuard,
      { provide: JwtService, useValue: jwt },
      { provide: ConfigService, useValue: { get: () => secret } },
      { provide: AuthRepository, useValue: { findActiveById } },
    ],
  }).compile();
  return { guard: moduleRef.get(AuthGuard), jwt, findActiveById };
}

class TestController {
  @Public()
  publicRoute() {}

  protectedRoute() {}
}

function requestWithToken(token?: string, route: keyof TestController = 'protectedRoute') {
  const request: AuthRequest = {
    headers: token ? { authorization: `Bearer ${token}` } : {},
  };
  return {
    getHandler: () => TestController.prototype[route],
    getClass: () => TestController,
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as unknown as ExecutionContext;
}

describe('AuthGuard.canActivate', () => {
  it('allows a public route without checking the token or looking up the account', async () => {
    const { guard, jwt, findActiveById } = await setup();
    const verify = vi.spyOn(jwt, 'verifyAsync');

    const context = requestWithToken(undefined, 'publicRoute');
    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(context.switchToHttp().getRequest<AuthRequest>().user).toBeUndefined();
    await expect(guard.canActivate(requestWithToken('invalid', 'publicRoute'))).resolves.toBe(true);
    expect(verify).not.toHaveBeenCalled();
    expect(findActiveById).not.toHaveBeenCalled();
  });

  it('rejects a protected route without a token', async () => {
    const { guard, findActiveById } = await setup();

    await expect(guard.canActivate(requestWithToken())).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(findActiveById).not.toHaveBeenCalled();
  });

  it('attaches the active account profile for a valid token', async () => {
    const { guard, jwt, findActiveById } = await setup();
    findActiveById.mockResolvedValue(profile);
    const token = jwt.sign({ sub: userId }, { expiresIn: '15m' });

    const context = requestWithToken(token);
    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(findActiveById).toHaveBeenCalledExactlyOnceWith(userId);
    expect(context.switchToHttp().getRequest<AuthRequest>().user).toEqual(profile);
  });

  it('rejects the token when no active account matches', async () => {
    const { guard, jwt, findActiveById } = await setup();
    findActiveById.mockResolvedValue(null);
    const token = jwt.sign({ sub: userId }, { expiresIn: '15m' });

    const context = requestWithToken(token);
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException);
    expect(context.switchToHttp().getRequest<AuthRequest>().user).toBeUndefined();
  });

  it.each([
    ['an expired token', { expiresIn: '-1s' }],
    ['a token signed with another secret', { expiresIn: '15m', secret: `${secret}-other` }],
    ['a token signed with another algorithm', { expiresIn: '15m', algorithm: 'HS512' }],
  ] as const)('rejects %s before looking up the account', async (_name, options) => {
    const { guard, jwt, findActiveById } = await setup();
    const token = jwt.sign({ sub: userId }, options);

    await expect(guard.canActivate(requestWithToken(token))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(findActiveById).not.toHaveBeenCalled();
  });

  it('rejects a signed token with no expiry before looking up the account', async () => {
    const { guard, jwt, findActiveById } = await setup();
    const token = jwt.sign({ sub: userId });

    await expect(guard.canActivate(requestWithToken(token))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(findActiveById).not.toHaveBeenCalled();
  });
});
