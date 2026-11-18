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

async function realtimeWith(
  env: { NODE_ENV?: string; REALTIME_DEBUG?: boolean },
  channelIds: string[] = [],
) {
  const moduleRef = await Test.createTestingModule({
    controllers: [RealtimeDebugController],
    providers: [
      RealtimeGateway,
      RealtimeService,
      channelsWith(channelIds),
      { provide: INSTANCE_ID, useValue: 'test-api-1' },
      { provide: ConfigService, useValue: { get: (key: keyof typeof env) => env[key] } },
    ],
  }).compile();
  const gateway = moduleRef.get(RealtimeGateway);
  const controller = moduleRef.get(RealtimeDebugController);
  const join = vi.fn();
  const disconnect = vi.fn();
  const emit = vi.fn();
  const to = vi.fn(() => ({ emit }));
  gateway.afterInit({ to } as unknown as Server);
  await gateway.handleConnection({ id: 'socket-1', join, disconnect } as unknown as Socket);
  return { moduleRef, controller, join, disconnect, emit, to };
}

describe('Realtime debug access', () => {
  it.each([
    { NODE_ENV: 'production' },
    { NODE_ENV: 'development' },
    {},
    { NODE_ENV: 'production', REALTIME_DEBUG: false },
  ])('does not join, broadcast or answer the trigger with %j', async (env) => {
    const { moduleRef, controller, join, disconnect, to, emit } = await realtimeWith(env);
    try {
      expect(() => controller.ping()).toThrow(NotFoundException);
      expect(join).not.toHaveBeenCalled();
      expect(to).not.toHaveBeenCalled();
      expect(emit).not.toHaveBeenCalled();
      expect(disconnect).not.toHaveBeenCalled();
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

  it('disconnects a socket whose room join fails', async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        RealtimeGateway,
        RealtimeService,
        channelsWith([CHANNEL_A]),
        { provide: INSTANCE_ID, useValue: 'test-api-1' },
        { provide: ConfigService, useValue: { get: () => 'test' } },
      ],
    }).compile();
    try {
      const gateway = moduleRef.get(RealtimeGateway);
      vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
      const disconnect = vi.fn();
      const join = vi.fn().mockRejectedValue(new Error('join failed'));

      await gateway.handleConnection({ id: 's', join, disconnect } as unknown as Socket);

      expect(disconnect).toHaveBeenCalledExactlyOnceWith(true);
    } finally {
      await moduleRef.close();
    }
  });

  it('joins every channel room server-side, without the debug room when debug is off', async () => {
    const { moduleRef, join } = await realtimeWith({ NODE_ENV: 'production' }, [
      CHANNEL_A,
      CHANNEL_B,
    ]);
    try {
      expect(join).toHaveBeenCalledExactlyOnceWith([
        `channel:${CHANNEL_A}`,
        `channel:${CHANNEL_B}`,
      ]);
    } finally {
      await moduleRef.close();
    }
  });

  it('disconnects a socket whose channel lookup fails', async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        RealtimeGateway,
        RealtimeService,
        {
          provide: ChannelsService,
          useValue: { channelIdsForSocket: vi.fn().mockRejectedValue(new Error('db down')) },
        },
        { provide: INSTANCE_ID, useValue: 'test-api-1' },
        { provide: ConfigService, useValue: { get: () => 'test' } },
      ],
    }).compile();
    try {
      const gateway = moduleRef.get(RealtimeGateway);
      vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
      const disconnect = vi.fn();
      const join = vi.fn();

      await gateway.handleConnection({ id: 's', join, disconnect } as unknown as Socket);

      expect(join).not.toHaveBeenCalled();
      expect(disconnect).toHaveBeenCalledExactlyOnceWith(true);
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

  it('drops the event without throwing before the server is bound or when emit throws', async () => {
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
