import { ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { describe, expect, it, vi } from 'vitest';
import { LoginRepository } from './login.repository.js';
import { LoginService } from './login.service.js';

const request = { email: 'ada@example.com', password: 'example-passphrase' };
const secret = 'test-only-access-token-signing-secret';

async function setup(signingSecret: string | undefined) {
  const findActiveByEmail = vi.fn<LoginRepository['findActiveByEmail']>();
  const signAsync = vi.fn();
  const moduleRef = await Test.createTestingModule({
    providers: [
      LoginService,
      { provide: LoginRepository, useValue: { findActiveByEmail } },
      { provide: JwtService, useValue: { signAsync } },
      { provide: ConfigService, useValue: { get: () => signingSecret } },
    ],
  }).compile();
  return { service: moduleRef.get(LoginService), findActiveByEmail, signAsync };
}

describe('LoginService.login', () => {
  it('fails before looking up the account when the signing secret is missing', async () => {
    const { service, findActiveByEmail, signAsync } = await setup(undefined);

    await expect(service.login(request)).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(findActiveByEmail).not.toHaveBeenCalled();
    expect(signAsync).not.toHaveBeenCalled();
  });

  it('rejects an account with a disabled password without signing a token', async () => {
    const { service, findActiveByEmail, signAsync } = await setup(secret);
    findActiveByEmail.mockResolvedValue({
      id: '019a8f00-0000-7000-8000-000000000004',
      passwordHash: '!',
    });

    await expect(service.login(request)).rejects.toBeInstanceOf(UnauthorizedException);
    expect(signAsync).not.toHaveBeenCalled();
  });

  it('propagates unexpected repository errors without signing a token', async () => {
    const { service, findActiveByEmail, signAsync } = await setup(secret);
    const failure = new Error('connection lost');
    findActiveByEmail.mockRejectedValue(failure);

    await expect(service.login(request)).rejects.toBe(failure);
    expect(signAsync).not.toHaveBeenCalled();
  });
});
