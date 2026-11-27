import type { ExecutionContext, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { MeResponseSchema } from '@app/contracts';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { configureApp } from '../src/app.setup.js';
import type { AuthRequest } from '../src/modules/auth/auth.request.js';
import { UsersModule } from '../src/modules/users/users.module.js';
import { UsersRepository } from '../src/modules/users/users.repository.js';

const profile = {
  id: '019a8f00-0000-7000-8000-000000000004',
  name: 'Ada',
  email: 'ada@example.com',
  tz: 'Europe/Moscow',
};
const updateProfile = vi.fn<UsersRepository['updateProfile']>();

let app: INestApplication | undefined;
let baseUrl: string;

beforeAll(async () => {
  const moduleRef = await Test.createTestingModule({ imports: [UsersModule] })
    .overrideProvider(UsersRepository)
    .useValue({ updateProfile })
    .compile();
  app = configureApp(moduleRef.createNestApplication({ logger: false }));

  // Supply the request user the same way AuthGuard does after authentication: only a request
  // that carries credentials gets one, everything else meets CurrentUser's 401.
  app.useGlobalGuards({
    canActivate(context: ExecutionContext) {
      const request = context.switchToHttp().getRequest<AuthRequest>();
      if (request.headers.authorization) request.user = { ...profile };
      return true;
    },
  });

  await app.listen(0, '127.0.0.1');
  baseUrl = await app.getUrl();
});

beforeEach(() => {
  updateProfile
    .mockReset()
    .mockImplementation((id, patch) => Promise.resolve({ ...profile, ...patch, id }));
});

afterAll(async () => {
  await app?.close();
});

function patchMe(body: unknown, withAuth = true) {
  return fetch(`${baseUrl}/api/users/me`, {
    method: 'PATCH',
    headers: {
      'content-type': 'application/json',
      ...(withAuth ? { authorization: 'Bearer test-token' } : {}),
    },
    body: JSON.stringify(body),
  });
}

describe('PATCH /api/users/me', () => {
  it('updates name and time zone and answers with the stored profile', async () => {
    const response = await patchMe({ name: ' Grace ', tz: 'Asia/Tokyo' });

    expect(response.status).toBe(200);
    expect(updateProfile).toHaveBeenCalledExactlyOnceWith(profile.id, {
      name: 'Grace',
      tz: 'Asia/Tokyo',
    });
    expect(MeResponseSchema.parse(await response.json())).toEqual({
      ...profile,
      name: 'Grace',
      tz: 'Asia/Tokyo',
    });
  });

  it('accepts a patch with a single field', async () => {
    const response = await patchMe({ tz: 'UTC' });

    expect(response.status).toBe(200);
    expect(updateProfile).toHaveBeenCalledExactlyOnceWith(profile.id, { tz: 'UTC' });
  });

  it.each(['Mars/Olympus', 'europe/berlin', '+05:00', 'Europe/Berlin '])(
    'rejects the non-IANA zone %s',
    async (tz) => {
      const response = await patchMe({ tz });

      expect(response.status).toBe(400);
      expect(updateProfile).not.toHaveBeenCalled();
      expect(await response.json()).toMatchObject({
        statusCode: 400,
        issues: [{ path: 'tz' }],
      });
    },
  );

  it('rejects a body without name and time zone', async () => {
    for (const body of [{}, { name: 'A' }, { name: 'A'.repeat(16) }, { tz: 3 }]) {
      const response = await patchMe(body);

      expect(response.status).toBe(400);
    }
    expect(updateProfile).not.toHaveBeenCalled();
  });

  it('requires authentication', async () => {
    const response = await patchMe({ name: 'Grace' }, false);

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ statusCode: 401, message: 'Unauthorized' });
    expect(updateProfile).not.toHaveBeenCalled();
  });
});
