import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import type { Server, Socket } from 'socket.io';
import { describe, expect, it, vi } from 'vitest';
import { INSTANCE_ID } from '../health/instance-id.provider.js';
import { RealtimeGateway } from './realtime.gateway.js';

describe('RealtimeGateway debug access', () => {
  it.each(['production', 'development', undefined])(
    'does not join or broadcast diagnostic events when NODE_ENV is %s',
    async (environment) => {
      const moduleRef = await Test.createTestingModule({
        providers: [
          RealtimeGateway,
          { provide: INSTANCE_ID, useValue: 'private-instance' },
          { provide: ConfigService, useValue: { get: () => environment } },
        ],
      }).compile();
      try {
        const gateway = moduleRef.get(RealtimeGateway);
        const join = vi.fn();
        const disconnect = vi.fn();
        const emit = vi.fn();
        const to = vi.fn(() => ({ emit }));
        gateway.server = { to } as unknown as Server;

        await gateway.handleConnection({ join, disconnect } as unknown as Socket);
        gateway.emitDebugPing();

        expect(join).not.toHaveBeenCalled();
        expect(to).not.toHaveBeenCalled();
        expect(emit).not.toHaveBeenCalled();
        expect(disconnect).not.toHaveBeenCalled();
      } finally {
        await moduleRef.close();
      }
    },
  );
});
