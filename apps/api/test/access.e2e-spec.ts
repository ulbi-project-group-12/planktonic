import { Controller, Get, type ExecutionContext } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { expect, it, vi } from 'vitest';
import { RequireAccess } from '../src/core/access/access.decorator.js';
import { AccessRepository } from '../src/core/access/access.repository.js';
import { AccessService } from '../src/core/access/access.service.js';

const workspaceId = '00000000-0000-4000-8000-000000000001';
const user = { id: 'member' };
const handler = vi.fn(() => ({ allowed: true }));

@Controller('workspaces')
class TestWorkspaceController {
  @Get(':workspaceId/settings')
  @RequireAccess({ kind: 'workspace', permission: 'workspace.update' })
  settings() {
    return handler();
  }
}

it('returns HTTP 403 before the handler runs when a workspace member lacks permission', async () => {
  const findWorkspaceRole = vi
    .fn<AccessRepository['findWorkspaceRole']>()
    .mockResolvedValue('MEMBER');
  const moduleRef = await Test.createTestingModule({
    controllers: [TestWorkspaceController],
    providers: [AccessService, { provide: AccessRepository, useValue: { findWorkspaceRole } }],
  }).compile();
  const app = moduleRef.createNestApplication({ logger: false });

  // Supply the request user the same way AuthGuard does after authentication.
  app.useGlobalGuards({
    canActivate(context: ExecutionContext) {
      context.switchToHttp().getRequest<{ user: typeof user }>().user = user;
      return true;
    },
  });

  try {
    await app.listen(0, '127.0.0.1');
    const url = `${await app.getUrl()}/workspaces/${workspaceId}/settings`;
    const forbidden = await fetch(url);
    expect(forbidden.status).toBe(403);
    expect(await forbidden.json()).toMatchObject({ statusCode: 403 });
    expect(findWorkspaceRole).toHaveBeenCalledWith(user.id, workspaceId);
    expect(handler).not.toHaveBeenCalled();

    findWorkspaceRole.mockResolvedValue('ADMIN');
    const allowed = await fetch(url);
    expect(allowed.status).toBe(200);
    expect(await allowed.json()).toEqual({ allowed: true });
    expect(handler).toHaveBeenCalledOnce();
  } finally {
    await app.close();
  }
});
