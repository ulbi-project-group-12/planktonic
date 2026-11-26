// PATCH /api/users/me on the whole app: the real AuthGuard and AccessGuard, the validation pipe
// and PostgreSQL, not the mocked repository of test/users.e2e-spec.ts.
import { MeResponseSchema } from '@app/contracts';
import { expect, it } from 'vitest';
import { authorization } from './support/http.js';
import { useStand } from './support/stand.js';

const stand = useStand({ instances: ['test-api-1'], realtime: false });

function createUser(name: string) {
  return stand.prisma.user.create({
    data: { name, email: `${name.toLowerCase()}@users.invalid`, passwordHash: '!' },
  });
}

async function patchMe(body: unknown, userId?: string): Promise<Response> {
  const app = stand.apps[0]!;
  return fetch(`${await app.getUrl()}/api/users/me`, {
    method: 'PATCH',
    headers: {
      'content-type': 'application/json',
      ...(userId === undefined ? {} : { authorization: authorization(app, userId) }),
    },
    body: JSON.stringify(body),
  });
}

async function getMe(userId: string): Promise<Response> {
  const app = stand.apps[0]!;
  return fetch(`${await app.getUrl()}/api/auth/me`, {
    headers: { authorization: authorization(app, userId) },
  });
}

it('stores the new name and time zone and serves them from GET /api/auth/me', async () => {
  const ada = await createUser('Ada');
  const other = await createUser('Grace');

  const response = await patchMe({ name: '  Lovelace ', tz: 'Asia/Tokyo' }, ada.id);
  expect(response.status).toBe(200);
  const expected = { id: ada.id, name: 'Lovelace', email: ada.email, tz: 'Asia/Tokyo' };
  const body: unknown = await response.json();
  expect(body).toEqual(expected);
  expect(MeResponseSchema.parse(body)).toEqual(expected);

  const me = await getMe(ada.id);
  expect(me.status).toBe(200);
  expect(await me.json()).toEqual(expected);

  // A patch with one field leaves the other as it was.
  const onlyZone = await patchMe({ tz: 'UTC' }, ada.id);
  expect(onlyZone.status).toBe(200);
  expect(await onlyZone.json()).toEqual({ ...expected, tz: 'UTC' });

  // Nobody else is touched.
  await expect(stand.prisma.user.findUniqueOrThrow({ where: { id: other.id } })).resolves.toEqual(
    other,
  );
});

it('accepts either spelling of a zone that engines list differently', async () => {
  const ada = await createUser('Ada');

  for (const tz of ['Europe/Kiev', 'Europe/Kyiv', 'Asia/Calcutta', 'Asia/Kolkata']) {
    const response = await patchMe({ tz }, ada.id);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ tz });
  }
});

it('changes nothing but name and time zone, whatever else the body carries', async () => {
  const ada = await createUser('Ada');

  const response = await patchMe(
    {
      name: 'Lovelace',
      id: '019a8f00-0000-7000-8000-00000000ffff',
      email: 'taken-over@users.invalid',
      passwordHash: 'x',
      deactivatedAt: '2026-01-01T00:00:00.000Z',
    },
    ada.id,
  );
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({
    id: ada.id,
    name: 'Lovelace',
    email: ada.email,
    tz: ada.tz,
  });

  await expect(stand.prisma.user.findUniqueOrThrow({ where: { id: ada.id } })).resolves.toEqual({
    ...ada,
    name: 'Lovelace',
  });
});

it('refuses invalid fields with a 400 that names the field and stores nothing', async () => {
  const ada = await createUser('Ada');

  for (const [body, path] of [
    [{ tz: 'Mars/Olympus' }, 'tz'],
    [{ tz: '+05:00' }, 'tz'],
    [{ name: 'A' }, 'name'],
    [{ name: 'A'.repeat(16) }, 'name'],
    [{ name: 'Lovelace', tz: 'europe/berlin' }, 'tz'],
    [{}, ''],
  ] as const) {
    const response = await patchMe(body, ada.id);
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ statusCode: 400, issues: [{ path }] });
  }

  await expect(stand.prisma.user.findUniqueOrThrow({ where: { id: ada.id } })).resolves.toEqual(
    ada,
  );
});

it('refuses a request without a token and the token of a deactivated user', async () => {
  const ada = await createUser('Ada');

  const anonymous = await patchMe({ name: 'Lovelace' });
  expect(anonymous.status).toBe(401);
  expect(await anonymous.json()).toEqual({ statusCode: 401, message: 'Unauthorized' });

  const deactivated = await stand.prisma.user.update({
    where: { id: ada.id },
    data: { deactivatedAt: new Date() },
  });
  const rejected = await patchMe({ name: 'Lovelace' }, ada.id);
  expect(rejected.status).toBe(401);
  expect(await rejected.json()).toEqual({ statusCode: 401, message: 'Unauthorized' });

  await expect(stand.prisma.user.findUniqueOrThrow({ where: { id: ada.id } })).resolves.toEqual(
    deactivated,
  );
});
