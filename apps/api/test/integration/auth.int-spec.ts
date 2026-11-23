import {
  LoginResponseSchema,
  MeResponseSchema,
  RegisterConflictResponseSchema,
  RegisterResponseSchema,
  type RegisterRequest,
} from '@app/contracts';
import { verify } from 'argon2';
import { describe, expect, it } from 'vitest';
import { useStand } from './support/stand.js';

const stand = useStand({ instances: ['test-api-1', 'test-api-2'], realtime: false });
const request: RegisterRequest = {
  name: 'Ada',
  email: 'Ada@example.com',
  password: 'example-passphrase',
  confirmPassword: 'example-passphrase',
};

async function register(email: string, instance = 0): Promise<Response> {
  return fetch(`${await stand.apps[instance]!.getUrl()}/api/auth/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ...request, email }),
  });
}

async function expectEmailConflict(response: Response): Promise<void> {
  expect(response.status).toBe(409);
  const body = RegisterConflictResponseSchema.parse(await response.json());
  expect(body.issues.map(({ path }) => path)).toEqual(['email']);
}

describe('registration against PostgreSQL', () => {
  it('persists the user with a verifiable Argon2id hash and rejects duplicate emails', async () => {
    const response = await register(request.email);
    expect(response.status).toBe(201);
    const body: unknown = await response.json();
    const user = RegisterResponseSchema.parse(body);
    expect(body).toEqual({ id: user.id, name: request.name, email: request.email });

    const stored = await stand.prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(stored).toMatchObject(user);
    expect(stored.passwordHash).toMatch(/^\$argon2id\$/);
    await expect(verify(stored.passwordHash, request.password)).resolves.toBe(true);

    await expectEmailConflict(await register(request.email));
    await expectEmailConflict(await register(request.email.toLowerCase()));
    expect(
      await stand.prisma.user.count({
        where: { email: { equals: request.email, mode: 'insensitive' } },
      }),
    ).toBe(1);
  });

  it('creates one user when two API instances register the same email concurrently', async () => {
    const responses = await Promise.all([register(request.email), register(request.email, 1)]);

    expect(responses.map(({ status }) => status).sort()).toEqual([201, 409]);
    const winner = responses.find(({ status }) => status === 201)!;
    const loser = responses.find(({ status }) => status === 409)!;
    const user = RegisterResponseSchema.parse(await winner.json());
    await expectEmailConflict(loser);
    const stored = await stand.prisma.user.findMany({
      where: { email: request.email },
      select: { id: true, name: true, email: true },
    });
    expect(stored).toEqual([user]);
  });
});

it('signs in a registered user across API instances with a case-insensitive email', async () => {
  const registration = await register(request.email);
  expect(registration.status).toBe(201);
  const user = RegisterResponseSchema.parse(await registration.json());

  const response = await fetch(`${await stand.apps[1]!.getUrl()}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: request.email.toLowerCase(), password: request.password }),
  });

  expect(response.status).toBe(200);
  const { accessToken } = LoginResponseSchema.parse(await response.json());

  const me = await fetch(`${await stand.apps[0]!.getUrl()}/api/auth/me`, {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  expect(me.status).toBe(200);
  expect(await me.json()).toEqual(user);
});

it('returns the authenticated profile and rejects the token after account deactivation', async () => {
  const registration = await register(request.email);
  expect(registration.status).toBe(201);
  const user = RegisterResponseSchema.parse(await registration.json());
  const baseUrl = await stand.apps[0]!.getUrl();
  expect((await fetch(`${baseUrl}/api/auth/me`)).status).toBe(401);

  const login = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: request.email, password: request.password }),
  });
  expect(login.status).toBe(200);
  const { accessToken } = LoginResponseSchema.parse(await login.json());

  const me = await fetch(`${baseUrl}/api/auth/me`, {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  expect(me.status).toBe(200);
  const profile: unknown = await me.json();
  expect(MeResponseSchema.parse(profile)).toEqual(user);
  expect(profile).toEqual(user);

  await stand.prisma.user.update({
    where: { id: user.id },
    data: { deactivatedAt: new Date() },
  });
  const rejected = await fetch(`${baseUrl}/api/auth/me`, {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  expect(rejected.status).toBe(401);
  expect(await rejected.json()).toEqual({ statusCode: 401, message: 'Unauthorized' });
});
