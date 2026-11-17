import { Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import type { Server, Socket } from 'socket.io';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { INSTANCE_ID } from '../../core/instance/instance-id.provider.js';
import { RealtimeDebugController } from './realtime-debug.controller.js';
import { RealtimeGateway } from './realtime.gateway.js';
import { DEBUG_EVENT, DEBUG_ROOM, RealtimeService } from './realtime.service.js';

afterEach(() => {
  vi.restoreAllMocks();
});

async function realtimeWith(env: { NODE_ENV?: string; REALTIME_DEBUG?: boolean }) {
  const moduleRef = await Test.createTestingModule({
    controllers: [RealtimeDebugController],
    providers: [
      RealtimeGateway,
      RealtimeService,
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
        expect(join).toHaveBeenCalledExactlyOnceWith(DEBUG_ROOM);
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
});
