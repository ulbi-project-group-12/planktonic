import { Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import type { Server, Socket } from 'socket.io';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { INSTANCE_ID } from '../../core/instance/instance-id.provider.js';
import { ChannelsService } from '../channels/channels.service.js';
import { RealtimeDebugController } from './realtime-debug.controller.js';
import { RealtimeGateway } from './realtime.gateway.js';
import { DEBUG_EVENT, DEBUG_ROOM, RealtimeService } from './realtime.service.js';

afterEach(() => {
  vi.restoreAllMocks();
});

const CHANNEL_A = '00000000-0000-7000-8000-00000000000a';
const CHANNEL_B = '00000000-0000-7000-8000-00000000000b';

function channelsWith(ids: string[]) {
  return {
    provide: ChannelsService,
    useValue: { channelIdsForSocket: vi.fn().mockResolvedValue(ids) },
  };
}

type Middleware = (socket: Socket, next: (error?: Error) => void) => void;

/** Runs the gateway's connection middleware for one fake socket; resolves with what next got. */
function connectThrough(middleware: Middleware, join: (rooms: string[]) => unknown) {
  return new Promise<Error | undefined>((resolve) => {
    middleware({ id: 'socket-1', join } as unknown as Socket, resolve);
  });
}

async function realtimeWith(
  env: { NODE_ENV?: string; REALTIME_DEBUG?: boolean },
  channels: ReturnType<typeof channelsWith> = channelsWith([]),
  join: (rooms: string[]) => unknown = vi.fn(),
) {
  const moduleRef = await Test.createTestingModule({
    controllers: [RealtimeDebugController],
    providers: [
      RealtimeGateway,
      RealtimeService,
      channels,
      { provide: INSTANCE_ID, useValue: 'test-api-1' },
      { provide: ConfigService, useValue: { get: (key: keyof typeof env) => env[key] } },
    ],
  }).compile();
  const gateway = moduleRef.get(RealtimeGateway);
  const controller = moduleRef.get(RealtimeDebugController);
  const emit = vi.fn();
  const to = vi.fn(() => ({ emit }));
  const use = vi.fn();
  gateway.afterInit({ to, use } as unknown as Server);
  expect(use).toHaveBeenCalledOnce();
  const nextError = await connectThrough(use.mock.calls[0]![0] as Middleware, join);
  return { moduleRef, controller, join, nextError, emit, to };
}

describe('Realtime debug access', () => {
  it.each([
    { NODE_ENV: 'production' },
    { NODE_ENV: 'development' },
    {},
    { NODE_ENV: 'production', REALTIME_DEBUG: false },
  ])('does not join the debug room, broadcast or answer the trigger with %j', async (env) => {
    const { moduleRef, controller, join, nextError, to, emit } = await realtimeWith(env);
    try {
      expect(() => controller.ping()).toThrow(NotFoundException);
      expect(join).toHaveBeenCalledExactlyOnceWith([]);
      expect(nextError).toBeUndefined();
      expect(to).not.toHaveBeenCalled();
      expect(emit).not.toHaveBeenCalled();
    } finally {
      await moduleRef.close();
    }
  });

  it.each([{ NODE_ENV: 'test' }, { NODE_ENV: 'production', REALTIME_DEBUG: true }])(
    'joins the debug room server-side and broadcasts the sender instanceId with %j',
    async (env) => {
      const { moduleRef, controller, join, to, emit } = await realtimeWith(env);
      try {
        expect(join).toHaveBeenCalledExactlyOnceWith([DEBUG_ROOM]);
        expect(controller.ping()).toEqual({ instanceId: 'test-api-1' });
        expect(to).toHaveBeenCalledExactlyOnceWith(DEBUG_ROOM);
        expect(emit).toHaveBeenCalledExactlyOnceWith(DEBUG_EVENT, { instanceId: 'test-api-1' });
      } finally {
        await moduleRef.close();
      }
    },
  );
});

describe('Channel rooms on connect', () => {
  it('joins every channel room before the connection completes', async () => {
    const { moduleRef, join, nextError } = await realtimeWith(
      { NODE_ENV: 'production' },
      channelsWith([CHANNEL_A, CHANNEL_B]),
    );
    try {
      expect(join).toHaveBeenCalledExactlyOnceWith([
        `channel:${CHANNEL_A}`,
        `channel:${CHANNEL_B}`,
      ]);
      expect(nextError).toBeUndefined();
    } finally {
      await moduleRef.close();
    }
  });

  it('refuses the connection when the room join fails', async () => {
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const join = vi.fn().mockRejectedValue(new Error('join failed'));
    const { moduleRef, nextError } = await realtimeWith(
      { NODE_ENV: 'test' },
      channelsWith([CHANNEL_A]),
      join,
    );
    try {
      expect(nextError).toBeInstanceOf(Error);
    } finally {
      await moduleRef.close();
    }
  });

  it('refuses the connection without joining when the channel lookup fails', async () => {
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const failing = {
      provide: ChannelsService,
      useValue: { channelIdsForSocket: vi.fn().mockRejectedValue(new Error('db down')) },
    };
    const { moduleRef, join, nextError } = await realtimeWith({ NODE_ENV: 'test' }, failing);
    try {
      expect(join).not.toHaveBeenCalled();
      expect(nextError).toBeInstanceOf(Error);
    } finally {
      await moduleRef.close();
    }
  });
});

describe('RealtimeService as RealtimePublisher', () => {
  async function publisher() {
    const moduleRef = await Test.createTestingModule({
      providers: [
        RealtimeService,
        { provide: INSTANCE_ID, useValue: 'test-api-1' },
        { provide: ConfigService, useValue: { get: () => undefined } },
      ],
    }).compile();
    return { moduleRef, realtime: moduleRef.get(RealtimeService) };
  }

  const event = {
    message: {
      id: '00000000-0000-7000-8000-000000000003',
      seq: '1',
      channelId: CHANNEL_A,
      authorId: '00000000-0000-7000-8000-000000000002',
      clientMsgId: '019a8f00-0000-7000-8000-000000000004',
      body: 'hi',
      createdAt: '2026-11-18T10:00:00.000Z',
    },
  };

  it('emits the event to the given room', async () => {
    const { moduleRef, realtime } = await publisher();
    try {
      const emit = vi.fn();
      const to = vi.fn(() => ({ emit }));
      realtime.bindServer({ to } as unknown as Server);

      realtime.publish(`channel:${CHANNEL_A}`, 'message:new', event);

      expect(to).toHaveBeenCalledExactlyOnceWith(`channel:${CHANNEL_A}`);
      expect(emit).toHaveBeenCalledExactlyOnceWith('message:new', event);
    } finally {
      await moduleRef.close();
    }
  });

  it('drops the event without throwing before the server is bound or when emit throws synchronously', async () => {
    const { moduleRef, realtime } = await publisher();
    try {
      vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
      vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
      expect(() => {
        realtime.publish('channel:x', 'message:new', event);
      }).not.toThrow();

      const to = vi.fn(() => ({
        emit: () => {
          throw new Error('adapter down');
        },
      }));
      realtime.bindServer({ to } as unknown as Server);
      expect(() => {
        realtime.publish('channel:x', 'message:new', event);
      }).not.toThrow();
    } finally {
      await moduleRef.close();
    }
  });
});
