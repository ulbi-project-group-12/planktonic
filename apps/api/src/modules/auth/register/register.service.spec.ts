import { ConflictException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { RegisterConflictResponseSchema, type RegisterRequest } from '@app/contracts';
import { verify } from 'argon2';
import { describe, expect, it, vi } from 'vitest';
import { RegisterRepository } from './register.repository.js';
import { RegisterService } from './register.service.js';

const request: RegisterRequest = {
  name: 'Ada',
  email: 'ada@example.com',
  password: 'example-passphrase',
  confirmPassword: 'example-passphrase',
};
const user = {
  id: '019a8f00-0000-7000-8000-000000000004',
  name: request.name,
  email: request.email,
};

async function setup() {
  const create = vi.fn<RegisterRepository['create']>();
  const moduleRef = await Test.createTestingModule({
    providers: [RegisterService, { provide: RegisterRepository, useValue: { create } }],
  }).compile();
  return { service: moduleRef.get(RegisterService), create };
}

describe('RegisterService.register', () => {
  it('stores an Argon2id hash and returns only public user fields', async () => {
    const { service, create } = await setup();
    create.mockImplementation((_name, _email, passwordHash) =>
      Promise.resolve({ ...user, password: request.password, passwordHash }),
    );

    await expect(service.register(request)).resolves.toEqual(user);
    expect(create).toHaveBeenCalledTimes(1);
    const [name, email, passwordHash] = create.mock.calls[0]!;
    expect(name).toBe(request.name);
    expect(email).toBe(request.email);
    expect(passwordHash).toMatch(/^\$argon2id\$/);
    await expect(verify(passwordHash, request.password)).resolves.toBe(true);
  });

  it('returns HTTP 409 with an email issue on conflict', async () => {
    const { service, create } = await setup();
    create.mockResolvedValue(null);

    const registration = service.register(request);
    await expect(registration).rejects.toBeInstanceOf(ConflictException);
    const error = (await registration.catch((failure: unknown) => failure)) as ConflictException;
    expect(error.getStatus()).toBe(409);
    expect(RegisterConflictResponseSchema.parse(error.getResponse()).issues).toEqual([
      { path: 'email', message: 'Email is already in use' },
    ]);
  });

  it('propagates unexpected repository errors', async () => {
    const { service, create } = await setup();
    const failure = new Error('connection lost');
    create.mockRejectedValue(failure);

    await expect(service.register(request)).rejects.toBe(failure);
  });
});
