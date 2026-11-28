import { ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { describe, expect, it, vi } from 'vitest';
import { RefreshController } from './refresh.controller.js';
import { RefreshService } from './refresh.service.js';

async function setup() {
  const refresh = vi.fn<RefreshService['refresh']>();
  const moduleRef = await Test.createTestingModule({
    providers: [RefreshController, { provide: RefreshService, useValue: { refresh } }],
  }).compile();
  return {
    controller: moduleRef.get(RefreshController),
    refresh,
    response: { setHeader: vi.fn() },
  };
}

describe('RefreshController cookie cleanup', () => {
  it('clears the refresh cookie on 401', async () => {
    const { controller, refresh, response } = await setup();
    refresh.mockRejectedValue(new UnauthorizedException());

    await expect(controller.refresh({ headers: {} }, response)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(response.setHeader).toHaveBeenCalledExactlyOnceWith(
      'Set-Cookie',
      expect.stringContaining('Max-Age=0'),
    );
  });

  it('keeps the refresh cookie on 503', async () => {
    const { controller, refresh, response } = await setup();
    refresh.mockRejectedValue(new ServiceUnavailableException('Refresh is unavailable'));

    await expect(controller.refresh({ headers: {} }, response)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    expect(response.setHeader).not.toHaveBeenCalled();
  });
});
