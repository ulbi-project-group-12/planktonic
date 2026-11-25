import {
  BadRequestException,
  Get,
  Controller,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host.js';
import { Reflector } from '@nestjs/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RequireAccess } from './access.decorator.js';
import { AccessGuard } from './access.guard.js';
import type { AccessService } from './access.service.js';

const user = { id: 'member' };
const workspaceId = '00000000-0000-4000-8000-000000000001';

@Controller()
@RequireAccess({ kind: 'authenticated' })
class ExampleController {
  @Get()
  index() {}

  @Get(':id')
  @RequireAccess({ kind: 'workspace', permission: 'workspace.update', param: 'id' })
  update() {}

  @Get('create')
  @RequireAccess({ kind: 'permission', permission: 'workspace.create' })
  create() {}
}

describe('AccessGuard', () => {
  const access = {
    can: vi.fn<AccessService['can']>(),
    getWorkspaceRole: vi.fn<AccessService['getWorkspaceRole']>(),
  };
  const guard = new AccessGuard(new Reflector(), access as unknown as AccessService);

  function context(route: keyof ExampleController, request: object) {
    return new ExecutionContextHost(
      [request],
      ExampleController,
      ExampleController.prototype[route],
    );
  }

  beforeEach(() => {
    access.can.mockReset().mockResolvedValue(false);
    access.getWorkspaceRole.mockReset().mockResolvedValue(null);
  });

  it('uses controller metadata when the handler has no rule', async () => {
    await expect(guard.canActivate(context('index', { user }))).resolves.toBe(true);
    expect(access.can).not.toHaveBeenCalled();
  });

  it('requires an authenticated user', async () => {
    await expect(guard.canActivate(context('index', {}))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('uses handler metadata and reads the workspace ID from the named route parameter', async () => {
    access.can.mockResolvedValue(true);
    await expect(
      guard.canActivate(context('update', { user, params: { id: workspaceId } })),
    ).resolves.toBe(true);
    expect(access.can).toHaveBeenCalledWith(user, 'workspace.update', { workspaceId });
  });

  it('delegates workspace creation without a workspace ID', async () => {
    access.can.mockResolvedValue(true);
    await expect(guard.canActivate(context('create', { user }))).resolves.toBe(true);
    expect(access.can).toHaveBeenCalledWith(user, 'workspace.create');
  });

  it('rejects an invalid workspace ID before consulting AccessService', async () => {
    await expect(
      guard.canActivate(context('update', { user, params: { id: 'invalid' } })),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(access.can).not.toHaveBeenCalled();
  });

  it('denies a participant without the requested permission', async () => {
    access.getWorkspaceRole.mockResolvedValue('MEMBER');
    await expect(
      guard.canActivate(context('update', { user, params: { id: workspaceId } })),
    ).resolves.toBe(false);
  });

  it('returns 404 when the workspace is not visible to the user', async () => {
    await expect(
      guard.canActivate(context('update', { user, params: { id: workspaceId } })),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
