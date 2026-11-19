// The integration stand (UL-132): Nest apps in one Vitest process, sharing one Postgres and one
// Redis, each with its own explicit instanceId, plus Socket.IO clients connected to them.
//
//   const stand = useStand({ instances: ['test-api-1', 'test-api-2'] });
//   it('...', async () => {
//     const [one, two] = stand.apps;
//     const b = await stand.connect(two!, 'B');
//     const event = waitForEvent(b, MESSAGE_NEW_EVENT);
//     ...
//   });
//
// `useStand` registers its own hooks. `beforeAll` checks that the stores are test stores, opens
// Prisma and Redis and starts one app per entry of `instances`; `beforeEach` resets all data;
// `afterEach` closes whatever the test itself started (apps, clients); `afterAll` closes the rest.
// Teardown always goes clients → apps → Redis → Prisma and reports every failure together.
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaPg } from '@prisma/adapter-pg';
import { createClient } from 'redis';
import { io, type Socket } from 'socket.io-client';
import { afterAll, afterEach, beforeAll, beforeEach } from 'vitest';
import { AppModule } from '../../../src/app.module.js';
import { configureApp } from '../../../src/app.setup.js';
import { INSTANCE_ID } from '../../../src/core/instance/instance-id.provider.js';
import { configureRealtime } from '../../../src/core/realtime/realtime.setup.js';
import { PrismaClient } from '../../../src/generated/prisma/client.js';
import { cancelWaits, describeAs, EVENT_TIMEOUT_MS } from './events.js';
import {
  assertConnectedToTestStores,
  assertTestDatabase,
  assertTestRedis,
  resetData,
  type TestRedis,
} from './reset.js';

export interface StandOptions {
  /** One app per id, started in `beforeAll` and kept for the whole file. */
  instances: readonly string[];
  /**
   * Install the Redis Streams adapter (`configureRealtime`), as `main.ts` does. Default true;
   * false gives the plain Socket.IO adapter, so apps do not see each other's broadcasts.
   */
  realtime?: boolean;
}

export interface StartOptions {
  realtime?: boolean;
}

export interface Stand {
  /** The apps from `instances`, in the same order. */
  readonly apps: readonly INestApplication[];
  /** A client for test-only checks (CLIENT LIST, ...) on the stand's Redis database. */
  readonly redis: TestRedis;
  /** Direct database access for arranging and checking data. */
  readonly prisma: PrismaClient;
  /** Starts another app on port 0. Inside a test it is closed after that test. */
  startApp(instanceId: string, options?: StartOptions): Promise<INestApplication>;
  /** Closes an app early (the stand forgets it, so teardown does not close it twice). */
  closeApp(app: INestApplication): Promise<void>;
  instanceIdOf(app: INestApplication): string;
  /**
   * Connects a websocket-only client without reconnection and resolves on `connect`. The label
   * names the client in every waitForEvent timeout. Inside a test it is closed after that test.
   */
  connect(app: INestApplication, label: string): Promise<Socket>;
  /** Disconnects a client early and forgets it. */
  disconnect(client: Socket): void;
}

interface Scope {
  apps: INestApplication[];
  clients: Socket[];
}

function required(name: 'DATABASE_URL' | 'REDIS_URL'): string {
  const value = process.env[name];
  if (value === undefined || value === '') throw new Error(`The integration stand needs ${name}`);
  return value;
}

async function settle(label: string, tasks: (() => Promise<unknown>)[]): Promise<void> {
  const results = await Promise.allSettled(tasks.map((task) => task()));
  const failures = results.flatMap((result) =>
    result.status === 'rejected' ? [result.reason as unknown] : [],
  );
  if (failures.length > 0) throw new AggregateError(failures, label);
}

function closeClients(scope: Scope): void {
  for (const client of scope.clients.splice(0)) {
    cancelWaits(client);
    client.removeAllListeners();
    client.disconnect();
  }
}

async function closeApps(scope: Scope): Promise<void> {
  const apps = scope.apps.splice(0);
  await settle(
    'Failed to close test apps',
    apps.map((app) => () => app.close()),
  );
}

const STREAM_NAME = 'socket.io'; // the adapter's default; realtime.setup.ts does not change it
const READER_TIMEOUT_MS = 5_000;

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

/**
 * `app.listen()` returns before the adapter's stream reader polls. That reader starts at `$` and
 * keeps `$` until it has read one entry, so until then every gap between two XREADs drops what
 * other instances emit. So: find the app's reader (its connection blocked in XREAD), watch its
 * commands with MONITOR, and add entries the adapter ignores (no `nsp`) until the reader issues
 * an XREAD from a real entry id. From then on it misses nothing.
 */
async function waitForStreamReader(redis: TestRedis, instanceId: string): Promise<void> {
  const name = `api:${instanceId}`;
  const deadline = Date.now() + READER_TIMEOUT_MS;
  const timedOut = (): Error =>
    new Error(`The Redis Streams reader of ${instanceId} did not start reading in time`);

  let addr: string | undefined;
  while (addr === undefined) {
    addr = (await redis.clientList()).find(
      (entry) => entry.name === name && entry.cmd === 'xread',
    )?.addr;
    if (addr !== undefined) break;
    if (Date.now() > deadline) throw timedOut();
    await sleep(20);
  }

  const monitor = redis.duplicate();
  monitor.on('error', () => {});
  await monitor.connect();
  try {
    const seen = { reading: false };
    // A MONITOR line: `<time> [<db> <addr>] "XREAD" "COUNT" "100" "BLOCK" "2000" "STREAMS" "socket.io" "<offset>"`.
    await monitor.monitor((line: string) => {
      if (line.includes(` ${addr}] "XREAD"`) && !line.endsWith(' "$"')) seen.reading = true;
    });
    while (!seen.reading) {
      if (Date.now() > deadline) throw timedOut();
      await redis.xAdd(STREAM_NAME, '*', { stand: 'reader-ready' });
      await sleep(50);
    }
  } finally {
    monitor.destroy();
  }
}

export function useStand(options: StandOptions): Stand {
  const realtimeDefault = options.realtime ?? true;
  const fileScope: Scope = { apps: [], clients: [] };
  const testScope: Scope = { apps: [], clients: [] };
  let current = fileScope;
  const apps: INestApplication[] = [];
  const instanceIds = new WeakMap<INestApplication, string>();
  let prisma: PrismaClient | undefined;
  let redis: TestRedis | undefined;

  const forget = <T>(list: T[], item: T): void => {
    const index = list.indexOf(item);
    if (index !== -1) list.splice(index, 1);
  };

  const stand: Stand = {
    get apps() {
      return apps;
    },
    get redis() {
      if (!redis) throw new Error('stand.redis is available from beforeAll on');
      return redis;
    },
    get prisma() {
      if (!prisma) throw new Error('stand.prisma is available from beforeAll on');
      return prisma;
    },

    async startApp(instanceId, start = {}) {
      // INSTANCE_ID is a provider, not env: ConfigModule caches one process.env for both apps.
      const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
        .overrideProvider(INSTANCE_ID)
        .useValue(instanceId)
        .compile();
      const app = configureApp(moduleRef.createNestApplication({ logger: false }));
      current.apps.push(app);
      instanceIds.set(app, instanceId);
      const realtime = start.realtime ?? realtimeDefault;
      if (realtime) await configureRealtime(app);
      await app.listen(0, '127.0.0.1');
      if (realtime) await waitForStreamReader(stand.redis, instanceId);
      return app;
    },

    async closeApp(app) {
      forget(fileScope.apps, app);
      forget(testScope.apps, app);
      forget(apps, app);
      await app.close();
    },

    instanceIdOf(app) {
      const id = instanceIds.get(app);
      if (id === undefined) throw new Error('This app was not started by the stand');
      return id;
    },

    async connect(app, label) {
      const client = io(await app.getUrl(), {
        autoConnect: false,
        transports: ['websocket'],
        reconnection: false,
        forceNew: true,
        timeout: EVENT_TIMEOUT_MS,
      });
      describeAs(client, label, stand.instanceIdOf(app));
      current.clients.push(client);
      await new Promise<void>((resolve, reject) => {
        const onConnect = (): void => {
          client.off('connect_error', onError);
          resolve();
        };
        const onError = (error: Error): void => {
          client.off('connect', onConnect);
          reject(new Error(`Client "${label}" could not connect`, { cause: error }));
        };
        client.once('connect', onConnect);
        client.once('connect_error', onError);
        client.connect();
      });
      return client;
    },

    disconnect(client) {
      forget(fileScope.clients, client);
      forget(testScope.clients, client);
      // Disconnect first: its `disconnect` event rejects pending waitForEvent calls, as a test
      // expects. Recorder waits keep their own timers. Teardown cancels instead (closeClients).
      client.disconnect();
      client.removeAllListeners();
    },
  };

  beforeAll(async () => {
    const databaseUrl = required('DATABASE_URL');
    const redisUrl = required('REDIS_URL');
    assertTestDatabase(databaseUrl);
    assertTestRedis(redisUrl);

    prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });
    redis = createClient({
      url: redisUrl,
      socket: { reconnectStrategy: false, connectTimeout: 3_000 },
    });
    redis.on('error', () => {});
    await redis.connect();
    await assertConnectedToTestStores(prisma, redis);
    await resetData(prisma, redis);

    current = fileScope;
    for (const id of options.instances) apps.push(await stand.startApp(id));
  });

  beforeEach(async () => {
    await resetData(stand.prisma, stand.redis);
    current = testScope;
  });

  afterEach(async () => {
    current = fileScope;
    closeClients(testScope);
    await closeApps(testScope);
  });

  afterAll(async () => {
    closeClients(testScope);
    closeClients(fileScope);
    try {
      await settle('Failed to close the stand', [
        () => closeApps(testScope),
        () => closeApps(fileScope),
      ]);
    } finally {
      apps.length = 0;
      redis?.destroy();
      await prisma?.$disconnect();
    }
  });

  return stand;
}
