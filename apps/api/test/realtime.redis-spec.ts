import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { createClient } from 'redis';
import { Server } from 'socket.io';
import { io, type Socket } from 'socket.io-client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';
import { configureRealtime } from '../src/core/realtime/realtime.setup.js';
import { INSTANCE_ID } from '../src/modules/health/instance-id.provider.js';
import { RealtimeGateway } from '../src/modules/realtime/realtime.gateway.js';

const instanceIds = ['test-api-1', 'test-api-2'] as const;
const apps: INestApplication[] = [];
const clients: Socket[] = [];

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
  const probe = createClient({
    url: process.env.REDIS_URL,
    socket: { reconnectStrategy: false, connectTimeout: 3_000 },
  });
  probe.on('error', () => {});
  try {
    await probe.connect();
    expect(await probe.ping()).toBe('PONG');
  } finally {
    probe.destroy();
  }

  const first = await createTestApp(instanceIds[0]);
  const second = await createTestApp(instanceIds[1]);
  await connectClient(first);
  await connectClient(second);
});

afterAll(async () => {
  for (const client of clients) client.disconnect();
  const results = await Promise.allSettled(
    apps.map(async (app) => {
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
                .server.sockets.adapter.rooms.get('debug:channel')
                ?.has(independentClients[index]?.id ?? ''),
            { timeout: 5_000 },
          )
          .toBe(true);
      }

      const instanceId = instanceIds[0];
      const localMessages: unknown[] = [];
      const remoteMessages: unknown[] = [];
      local.on('debug:ping', (payload: unknown) => {
        localMessages.push(payload);
      });
      remote.on('debug:ping', (payload: unknown) => {
        remoteMessages.push(payload);
      });
      remote.on('test:barrier', (value: string, acknowledge: (value: string) => void) => {
        acknowledge(value);
      });

      source.emitDebugPing();
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
        .poll(
          () => target.server.sockets.adapter.rooms.get('debug:channel')?.has(outsider.id ?? ''),
          { timeout: 5_000 },
        )
        .toBe(true);
      await target.server.sockets.sockets.get(outsider.id!)!.leave('debug:channel');
      expect(target.server.sockets.adapter.rooms.get('debug:channel')?.has(outsider.id!)).toBe(
        false,
      );

      outsider.on('debug:ping', onUnexpected);
      outsider.on('test:barrier', onBarrier);
      clients[1]!.on('debug:ping', onMember);
      source.emitDebugPing();
      source.server.to(outsider.id!).emit('test:barrier', instanceId);

      await expect.poll(() => deliveredToMember && barrierReceived, { timeout: 5_000 }).toBe(true);
      expect(unexpected).toEqual([]);
      expect(outsider.connected).toBe(true);
    } finally {
      clients[1]!.off('debug:ping', onMember);
      outsider.off('debug:ping', onUnexpected);
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
              .server.sockets.adapter.rooms.get('debug:channel')
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
      client.on('debug:ping', listener);
      return listener;
    });

    try {
      apps[source]!.get(RealtimeGateway).emitDebugPing();
      await expect
        .poll(() => received, { timeout: 5_000 })
        .toEqual([[{ instanceId }], [{ instanceId }]]);
    } finally {
      clients.forEach((client, index) => client.off('debug:ping', listeners[index]));
    }
  });
});
