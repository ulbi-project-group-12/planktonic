import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ValidationErrorResponse, type RegisterRequest } from '@app/contracts';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { configureApp } from '../../src/app.setup.js';
import { AuthModule } from '../../src/modules/auth/auth.module.js';
import { RegisterRepository } from '../../src/modules/auth/register/register.repository.js';

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
const create = vi.fn<RegisterRepository['create']>();

let app: INestApplication | undefined;
let baseUrl: string;

beforeAll(async () => {
  const moduleRef = await Test.createTestingModule({ imports: [AuthModule] })
    .overrideProvider(RegisterRepository)
    .useValue({ create })
    .compile();
  app = configureApp(moduleRef.createNestApplication({ logger: false }));
  await app.listen(0, '127.0.0.1');
  baseUrl = await app.getUrl();
});

beforeEach(() => {
  create.mockReset();
});

afterAll(async () => {
  await app?.close();
});

function register(body: unknown) {
  return fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/auth/register', () => {
  it('returns 201 with exactly the public user fields', async () => {
    create.mockImplementation((_name, _email, passwordHash) =>
      Promise.resolve({ ...user, password: request.password, passwordHash }),
    );

    const response = await register(request);

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual(user);
    expect(create).toHaveBeenCalledOnce();
  });

  it.each([
    { body: {}, paths: ['name', 'email', 'password', 'confirmPassword'] },
    { body: { ...request, name: ' ', email: 'invalid' }, paths: ['name', 'email'] },
    { body: { ...request, name: 'A\u0000da' }, paths: ['name'] },
    {
      body: { ...request, password: 'bad-pass', confirmPassword: 'bad-pass' },
      paths: ['password'],
    },
    { body: { ...request, confirmPassword: 'different-passphrase' }, paths: ['confirmPassword'] },
    // Longer than the btree row limit of the lower(email) index: a 400 here, not a database error.
    { body: { ...request, email: `${'a'.repeat(3000)}@example.com` }, paths: ['email'] },
  ])(
    'returns 400 for invalid fields $paths without calling the repository',
    async ({ body, paths }) => {
      const response = await register(body);
      const payload: unknown = await response.json();

      expect(response.status).toBe(400);
      const error = ValidationErrorResponse.parse(payload);
      expect(error.issues.map(({ path }) => path)).toEqual(paths);
      expect(payload).toEqual(error);
      expect(JSON.stringify(payload)).not.toMatch(
        /example-passphrase|different-passphrase|bad-pass/,
      );
      expect(create).not.toHaveBeenCalled();
    },
  );

  it('returns 409 with only the email conflict details', async () => {
    create.mockResolvedValue(null);

    const response = await register(request);

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      statusCode: 409,
      message: 'Email is already in use',
      issues: [{ path: 'email', message: 'Email is already in use' }],
    });
    expect(create).toHaveBeenCalledOnce();
  });

  it('returns a generic 500 when the repository fails unexpectedly', async () => {
    create.mockRejectedValue(new Error('Database driver detail: synthetic test marker'));

    const response = await register(request);

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      statusCode: 500,
      message: 'Internal server error',
    });
    expect(create).toHaveBeenCalledOnce();
  });
});
