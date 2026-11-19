// Data reset between integration tests. It deletes everything, so it runs only against stores
// that are plainly for tests: a Postgres database whose name ends with `_test` and a Redis
// logical database other than 0. Pointing the suite at the dev database fails before any write:
// first on the URLs, then on what the connected servers report (URL parsers can disagree).
import type { createClient } from 'redis';
import type { PrismaClient } from '../../../src/generated/prisma/client.js';
import { DEFAULT_AUTHOR_ID } from '../../../src/modules/messages/default-author.js';

export type TestRedis = ReturnType<typeof createClient>;

/** `new URL` without its error: Node's ERR_INVALID_URL carries the input, password included. */
function parseUrl(variable: string, url: string): URL {
  try {
    return new URL(url);
  } catch {
    throw new Error(`The integration stand could not parse ${variable} as a URL`);
  }
}

function refuseDatabase(name: string): Error {
  return new Error(
    `The integration stand truncates tables before every test, so it refuses database ` +
      `${JSON.stringify(name)}. Point DATABASE_URL at a database whose name ends with _test, ` +
      `for example .../app_test (pnpm db:migrate creates it).`,
  );
}

function refuseRedis(db: string): Error {
  return new Error(
    `The integration stand flushes its Redis database before every test, so it refuses ` +
      `database ${db}. Add a non-zero database to REDIS_URL, for example ` +
      `redis://127.0.0.1:56379/1.`,
  );
}

/** Throws unless DATABASE_URL names a `*_test` database. The message never carries the URL. */
export function assertTestDatabase(databaseUrl: string): void {
  const url = parseUrl('DATABASE_URL', databaseUrl);
  if (url.protocol !== 'postgres:' && url.protocol !== 'postgresql:') {
    throw new Error('The integration stand needs a postgres:// or postgresql:// DATABASE_URL');
  }
  const name = decodeURIComponent(url.pathname.replace(/^\//, ''));
  // A control character could end the name early in the startup packet (`app%00..._test`).
  // eslint-disable-next-line no-control-regex
  if (!name.endsWith('_test') || /[\u0000-\u001f]/.test(name)) {
    throw refuseDatabase(name);
  }
}

/** Throws unless REDIS_URL selects a logical database other than 0 (`redis://host:port/1`). */
export function assertTestRedis(redisUrl: string): void {
  const url = parseUrl('REDIS_URL', redisUrl);
  if (url.protocol !== 'redis:' && url.protocol !== 'rediss:') {
    throw new Error('The integration stand needs a redis:// or rediss:// REDIS_URL');
  }
  const path = url.pathname.replace(/^\//, '');
  const db = path === '' ? 0 : Number(path);
  if (!Number.isInteger(db) || db <= 0) {
    throw refuseRedis(path === '' ? '0' : JSON.stringify(path));
  }
}

/**
 * The same rules on what the connected servers report, before the first write: the database
 * Postgres says it is in and the logical database of the Redis connection.
 */
export async function assertConnectedToTestStores(
  prisma: PrismaClient,
  redis: TestRedis,
): Promise<void> {
  const [{ name }] = await prisma.$queryRaw<[{ name: string }]>`SELECT current_database() AS name`;
  if (!name.endsWith('_test')) throw refuseDatabase(name);
  const { db } = await redis.clientInfo();
  if (!(db > 0)) throw refuseRedis(String(db));
}

/**
 * Empties every table of the current schema except Prisma's migration history, so tables added
 * by later migrations are covered without touching this file. Then seeds the placeholder author
 * the REST send uses and flushes the test Redis database (the Socket.IO stream).
 */
export async function resetData(prisma: PrismaClient, redis: TestRedis): Promise<void> {
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = current_schema() AND tablename <> '_prisma_migrations'`;
  if (tables.length > 0) {
    // Names come from the catalog, not from input; quoting keeps any odd name a single identifier.
    const list = tables.map(({ tablename }) => `"${tablename.replaceAll('"', '""')}"`).join(', ');
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${list}`);
  }
  await prisma.user.create({ data: { id: DEFAULT_AUTHOR_ID, name: 'test-user' } });
  await redis.flushDb();
}
