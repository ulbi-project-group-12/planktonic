import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { createClient } from 'redis';
import { Server } from 'socket.io';
import { io, type Socket } from 'socket.io-client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../../src/app.module.js';
import { configureApp } from '../../src/app.setup.js';
import { configureRealtime } from '../../src/core/realtime/realtime.setup.js';
import { STREAM_BLOCK_TIME_MS } from '../../src/core/realtime/redis-streams.adapter.js';
import { INSTANCE_ID } from '../../src/core/instance/instance-id.provider.js';
import { RealtimeGateway } from '../../src/modules/realtime/realtime.gateway.js';
import {
  DEBUG_EVENT,
  DEBUG_ROOM,
  RealtimeService,
} from '../../src/modules/realtime/realtime.service.js';

const instanceIds = ['test-api-1', 'test-api-2'] as const;
const apps: INestApplication[] = [];
const clients: Socket[] = [];
const redis = createClient({
  url: process.env.REDIS_URL,
  socket: { reconnectStrategy: false, connectTimeout: 3_000 },
});

async function createTestApp(instanceId: string): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(INSTANCE_ID)
    .useValue(instanceId)
    .compile();
  const app = configureApp(moduleRef.createNestApplication({ logger: false }));
  apps.push(app);
  await configureRealtime(app);
  await app.listen(0, '127.0.0.1');
  return app;
}

async function connectClient(app: INestApplication, registry: Socket[] = clients): Promise<Socket> {
  const client = io(await app.getUrl(), {
    autoConnect: false,
    transports: ['websocket'],
    reconnection: false,
    forceNew: true,
    timeout: 5_000,
  });
  registry.push(client);
  await new Promise<void>((resolve, reject) => {
    const onConnect = (): void => {
      cleanup();
      resolve();
    };
    const onError = (error: Error): void => {
      cleanup();
      reject(error);
    };
    const cleanup = (): void => {
      client.off('connect', onConnect);
      client.off('connect_error', onError);
    };
    client.once('connect', onConnect);
    client.once('connect_error', onError);
    client.connect();
  });

  return client;
}

async function closeApplications(applications: INestApplication[]): Promise<void> {
  const results = await Promise.allSettled(
    applications.map(async (app) => {
      await app.close();
    }),
  );
  const failures = results.filter((result) => result.status === 'rejected');
  if (failures.length) {
    throw new AggregateError(
      failures.map((result): unknown => result.reason),
      'Failed to close test apps',
    );
  }
}

beforeAll(async () => {
  redis.on('error', () => {});
  await redis.connect();
  expect(await redis.ping()).toBe('PONG');

  const first = await createTestApp(instanceIds[0]);
  const second = await createTestApp(instanceIds[1]);
  await connectClient(first);
  await connectClient(second);
});

afterAll(async () => {
  for (const client of clients) client.disconnect();
  try {
    await closeApplications(apps);
  } finally {
    redis.destroy();
  }
});

describe('Redis Streams realtime delivery', () => {
  it('does not broadcast between independent apps using the default Socket.IO adapter', async () => {
    const independentApps: INestApplication[] = [];
    const independentClients: Socket[] = [];
    try {
      for (let index = 0; index < 2; index++) {
        const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
          .overrideProvider(INSTANCE_ID)
          .useValue(instanceIds[index])
          .compile();
        const app = configureApp(moduleRef.createNestApplication({ logger: false }));
        independentApps.push(app);
        await app.listen(0, '127.0.0.1');
        await connectClient(app, independentClients);
      }

      const source = independentApps[0]!.get(RealtimeGateway);
      const sourceRealtime = independentApps[0]!.get(RealtimeService);
      const target = independentApps[1]!.get(RealtimeGateway);
      const local = independentClients[0]!;
      const remote = independentClients[1]!;
      const defaultAdapter = new Server().adapter();
      expect(source.server.adapter()).toBe(defaultAdapter);
      expect(target.server.adapter()).toBe(defaultAdapter);
      expect(source.server.sockets.adapter).not.toBe(target.server.sockets.adapter);

      for (const [index, app] of independentApps.entries()) {
        await expect
          .poll(
            () =>
              app
                .get(RealtimeGateway)
                .server.sockets.adapter.rooms.get(DEBUG_ROOM)
                ?.has(independentClients[index]?.id ?? ''),
            { timeout: 5_000 },
          )
          .toBe(true);
      }

      const instanceId = instanceIds[0];
      const localMessages: unknown[] = [];
      const remoteMessages: unknown[] = [];
      local.on(DEBUG_EVENT, (payload: unknown) => {
        localMessages.push(payload);
      });
      remote.on(DEBUG_EVENT, (payload: unknown) => {
        remoteMessages.push(payload);
      });
      remote.on('test:barrier', (value: string, acknowledge: (value: string) => void) => {
        acknowledge(value);
      });

      sourceRealtime.emitDebugPing();
      await expect.poll(() => localMessages, { timeout: 5_000 }).toEqual([{ instanceId }]);
      const acknowledgements: unknown = await target.server
        .timeout(5_000)
        .to(remote.id!)
        .emitWithAck('test:barrier', instanceId);
      expect(acknowledgements).toEqual([instanceId]);
      expect(remoteMessages).toEqual([]);
      expect(remote.connected).toBe(true);
    } finally {
      for (const client of independentClients) {
        client.removeAllListeners();
        client.disconnect();
      }
      await closeApplications(independentApps);
    }
  });

  it('does not deliver room broadcasts to a connected client outside the room', async () => {
    const source = apps[0]!.get(RealtimeGateway);
    const sourceRealtime = apps[0]!.get(RealtimeService);
    const target = apps[1]!.get(RealtimeGateway);
    const outsider = await connectClient(apps[1]!);
    const instanceId = instanceIds[0];
    const unexpected: unknown[] = [];
    let deliveredToMember = false;
    let barrierReceived = false;
    const onUnexpected = (payload: unknown): void => {
      unexpected.push(payload);
    };
    const onMember = (payload: { instanceId: string }): void => {
      if (payload.instanceId === instanceId) deliveredToMember = true;
    };
    const onBarrier = (value: string): void => {
      if (value === instanceId) barrierReceived = true;
    };

    try {
      await expect
        .poll(() => target.server.sockets.adapter.rooms.get(DEBUG_ROOM)?.has(outsider.id ?? ''), {
          timeout: 5_000,
        })
        .toBe(true);
      await target.server.sockets.sockets.get(outsider.id!)!.leave(DEBUG_ROOM);
      expect(target.server.sockets.adapter.rooms.get(DEBUG_ROOM)?.has(outsider.id!)).toBe(false);

      outsider.on(DEBUG_EVENT, onUnexpected);
      outsider.on('test:barrier', onBarrier);
      clients[1]!.on(DEBUG_EVENT, onMember);
      sourceRealtime.emitDebugPing();
      source.server.to(outsider.id!).emit('test:barrier', instanceId);

      await expect.poll(() => deliveredToMember && barrierReceived, { timeout: 5_000 }).toBe(true);
      expect(unexpected).toEqual([]);
      expect(outsider.connected).toBe(true);
    } finally {
      clients[1]!.off(DEBUG_EVENT, onMember);
      outsider.off(DEBUG_EVENT, onUnexpected);
      outsider.off('test:barrier', onBarrier);
      outsider.disconnect();
      clients.splice(clients.indexOf(outsider), 1);
    }
  });

  it.each([0, 1])('broadcasts from instance %i to clients on both instances', async (source) => {
    for (const [index, app] of apps.entries()) {
      await expect
        .poll(
          () =>
            app
              .get(RealtimeGateway)
              .server.sockets.adapter.rooms.get(DEBUG_ROOM)
              ?.has(clients[index]?.id ?? ''),
          { timeout: 5_000 },
        )
        .toBe(true);
    }
    const instanceId = instanceIds[source]!;
    const received: unknown[][] = clients.map(() => []);
    const listeners = clients.map((client, index) => {
      const listener = (payload: unknown): void => {
        received[index]!.push(payload);
      };
      client.on(DEBUG_EVENT, listener);
      return listener;
    });

    try {
      apps[source]!.get(RealtimeService).emitDebugPing();
      await expect
        .poll(() => received, { timeout: 5_000 })
        .toEqual([[{ instanceId }], [{ instanceId }]]);
    } finally {
      clients.forEach((client, index) => client.off(DEBUG_EVENT, listeners[index]));
    }
  });

  it('delivers a ping triggered over HTTP on instance 1 to the client on instance 2', async () => {
    const [first] = apps;
    const remote = clients[1]!;
    const received: unknown[] = [];
    const listener = (payload: unknown): void => {
      received.push(payload);
    };
    remote.on(DEBUG_EVENT, listener);
    try {
      const response = await fetch(`${await first!.getUrl()}/api/debug/realtime/ping`, {
        method: 'POST',
      });
      expect(response.status).toBe(202);
      expect(await response.json()).toEqual({ instanceId: instanceIds[0] });
      await expect
        .poll(() => received, { timeout: 5_000 })
        .toEqual([{ instanceId: instanceIds[0] }]);
    } finally {
      remote.off(DEBUG_EVENT, listener);
    }
  });

  it('leaves no Redis connection of the app behind after app.close()', async () => {
    const instanceId = 'test-api-closing';
    const connectionsOf = async (): Promise<number> => {
      const list = await redis.clientList();
      return list.filter((entry) => entry.name === `api:${instanceId}`).length;
    };
    const app = await createTestApp(instanceId);
    apps.splice(apps.indexOf(app), 1);
    // Publisher plus the adapter's read and sub duplicates.
    await expect.poll(connectionsOf, { timeout: 5_000 }).toBe(3);

    await app.close();

    await expect.poll(connectionsOf, { timeout: STREAM_BLOCK_TIME_MS + 3_000 }).toBe(0);
  });
});
