import {
  LoginResponseSchema,
  MeResponseSchema,
  RefreshResponseSchema,
  RegisterConflictResponseSchema,
  RegisterResponseSchema,
  type RegisterRequest,
} from '@app/contracts';
import { verify } from 'argon2';
import { afterAll, describe, expect, it, vi } from 'vitest';
import { JwtService } from '@nestjs/jwt';
import { LoginRepository } from '../../src/modules/auth/login/login.repository.js';
import { PasswordBreachService } from '../../src/modules/auth/register/password-breach.service.js';
import { useStand } from './support/stand.js';

const passwordBreach = vi
  .spyOn(PasswordBreachService.prototype, 'isBlocked')
  .mockResolvedValue(false);
afterAll(() => {
  passwordBreach.mockRestore();
});

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

async function login(email: string, instance = 0): Promise<Response> {
  return fetch(`${await stand.apps[instance]!.getUrl()}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password: request.password }),
  });
}

function parseSetCookie(response: Response): string | null {
  const setCookie = response.headers.get('set-cookie');
  if (!setCookie) return null;
  const value = /refresh_token=([^;]+)/.exec(setCookie)?.[1];
  return value ? `refresh_token=${value}` : null;
}

async function refresh(instance = 0, cookie?: string): Promise<Response> {
  const headers: Record<string, string> = {};
  if (cookie) headers.cookie = cookie;
  return fetch(`${await stand.apps[instance]!.getUrl()}/api/auth/refresh`, {
    method: 'POST',
    headers,
  });
}

function accessTokenSid(accessToken: string): string {
  const payload = new JwtService().verify<{ sid: string }>(accessToken, {
    secret: process.env.JWT_ACCESS_SECRET!,
    algorithms: ['HS256'],
  });
  return payload.sid;
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
  expect(await me.json()).toEqual({ ...user, tz: 'Europe/Moscow' });
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
  const expected = { ...user, tz: 'Europe/Moscow' };
  expect(MeResponseSchema.parse(profile)).toEqual(expected);
  expect(profile).toEqual(expected);

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

async function failLogin(email: string, instance: number): Promise<Response> {
  return fetch(`${await stand.apps[instance]!.getUrl()}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password: 'incorrect password' }),
  });
}

it.each([true, false])(
  'shares the account cooldown for a registered=%s email',
  async (registered) => {
    if (registered) expect((await register(request.email)).status).toBe(201);

    for (let attempt = 0; attempt < 5; attempt++) {
      const email = attempt % 2 === 0 ? request.email : request.email.toLowerCase();
      const response = await failLogin(email, attempt % 2);
      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({
        statusCode: 401,
        message: 'Invalid email or password',
        error: 'Unauthorized',
      });
    }

    const limited = await failLogin(request.email.toLowerCase(), 1);
    expect(limited.status).toBe(429);
    expect(await limited.json()).toEqual({
      statusCode: 429,
      message: 'Too many login attempts',
      retryAfterSeconds: 1,
    });
  },
);

it('shares the IP cooldown across replicas and different addresses entered as email', async () => {
  for (let attempt = 0; attempt < 20; attempt++) {
    const response = await failLogin(`unknown-${String(attempt)}@example.com`, attempt % 2);
    expect(response.status).toBe(401);
  }

  const limited = await failLogin('another@example.com', 0);
  expect(limited.status).toBe(429);
});

it.each(['email', 'IP'])(
  'denies concurrent login on another replica when the last %s slot is in use',
  async (dimension) => {
    const emailFor = (index: number) =>
      dimension === 'email' ? request.email : `preview-${String(index)}@example.com`;
    const threshold = dimension === 'email' ? 5 : 20;
    for (let attempt = 0; attempt < threshold - 1; attempt++) {
      expect((await failLogin(emailFor(attempt), attempt % 2)).status).toBe(401);
    }

    const enteredLookup = Promise.withResolvers<boolean>();
    const finishLookup = Promise.withResolvers<null>();
    const lookup = vi
      .spyOn(LoginRepository.prototype, 'findActiveByEmail')
      .mockImplementationOnce(() => {
        enteredLookup.resolve(true);
        return finishLookup.promise;
      });
    const first = failLogin(emailFor(threshold - 1), 0);

    try {
      await Promise.race([
        enteredLookup.promise,
        first.then((response) => {
          throw new Error(`The first login returned ${String(response.status)} before the lookup`);
        }),
      ]);
      const second = await failLogin(emailFor(threshold), 1);
      expect(second.status).toBe(429);
      expect(lookup).toHaveBeenCalledTimes(1);
    } finally {
      finishLookup.resolve(null);
      try {
        expect((await first).status).toBe(401);
      } finally {
        lookup.mockRestore();
      }
    }
  },
);

describe('refresh against PostgreSQL', () => {
  it('issues a refresh cookie on login and refreshes on another instance', async () => {
    const registration = await register(request.email);
    expect(registration.status).toBe(201);

    const loginResponse = await login(request.email, 0);
    expect(loginResponse.status).toBe(200);
    const cookie = parseSetCookie(loginResponse);
    expect(cookie).toMatch(/refresh_token=/);

    const refreshResponse = await refresh(1, cookie ?? undefined);
    expect(refreshResponse.status).toBe(200);
    const { accessToken } = RefreshResponseSchema.parse(await refreshResponse.json());
    expect(accessToken).toBeTruthy();
  });

  it('creates two independent sessions for two logins', async () => {
    const registration = await register(request.email);
    const user = RegisterResponseSchema.parse(await registration.json());

    const first = await login(request.email, 0);
    const second = await login(request.email, 1);
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);

    const firstSid = accessTokenSid(LoginResponseSchema.parse(await first.json()).accessToken);
    const secondSid = accessTokenSid(LoginResponseSchema.parse(await second.json()).accessToken);
    expect(firstSid).not.toBe(secondSid);

    const sessions = await stand.prisma.session.findMany({ where: { userId: user.id } });
    expect(sessions.length).toBe(2);
  });

  it('revokes the session when an old refresh is reused and rejects the new refresh too', async () => {
    await register(request.email);

    const loginResponse = await login(request.email, 0);
    const oldCookie = parseSetCookie(loginResponse)!;

    const firstRefresh = await refresh(0, oldCookie);
    expect(firstRefresh.status).toBe(200);
    const newCookie = parseSetCookie(firstRefresh)!;

    const replay = await refresh(1, oldCookie);
    expect(replay.status).toBe(401);

    const afterRevocation = await refresh(0, newCookie);
    expect(afterRevocation.status).toBe(401);
  });

  it('leaves a second session active after the first is revoked by reuse', async () => {
    await register(request.email);

    const firstLogin = await login(request.email, 0);
    const firstCookie = parseSetCookie(firstLogin)!;
    await refresh(0, firstCookie);

    const secondLogin = await login(request.email, 1);
    const secondCookie = parseSetCookie(secondLogin)!;

    const replay = await refresh(1, firstCookie);
    expect(replay.status).toBe(401);

    const secondStillWorks = await refresh(0, secondCookie);
    expect(secondStillWorks.status).toBe(200);
  });

  it('allows only one successful refresh when the same token is spent concurrently', async () => {
    await register(request.email);

    const loginResponse = await login(request.email, 0);
    const cookie = parseSetCookie(loginResponse)!;

    const [a, b] = await Promise.all([refresh(0, cookie), refresh(1, cookie)]);
    const successes = [a, b].filter((r) => r.status === 200).length;
    expect(successes).toBeLessThanOrEqual(1);
  });

  it('updates lastUsedAt only after a successful refresh', async () => {
    await register(request.email);

    const loginResponse = await login(request.email, 0);
    const sid = accessTokenSid(LoginResponseSchema.parse(await loginResponse.json()).accessToken);
    const before = await stand.prisma.session.findUniqueOrThrow({ where: { id: sid } });

    await new Promise((resolve) => setTimeout(resolve, 10));

    const cookie = parseSetCookie(loginResponse)!;
    const refreshed = await refresh(0, cookie);
    expect(refreshed.status).toBe(200);

    const after = await stand.prisma.session.findUniqueOrThrow({ where: { id: sid } });
    expect(after.lastUsedAt.getTime()).toBeGreaterThan(before.lastUsedAt.getTime());
  });
});
