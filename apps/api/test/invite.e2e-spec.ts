import { createHash } from 'node:crypto';
import { CreateInviteResponseSchema } from '@app/contracts';
import { type ExecutionContext, StandardSchemaValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { expect, it, vi } from 'vitest';
import { AccessRepository } from '../src/core/access/access.repository.js';
import { AccessService } from '../src/core/access/access.service.js';
import { InviteController } from '../src/modules/workspace/invite.controller.js';
import { WorkspaceController } from '../src/modules/workspace/workspace.controller.js';
import { WorkspaceRepository } from '../src/modules/workspace/workspace.repository.js';
import { WorkspaceService } from '../src/modules/workspace/workspace.service.js';

it('rejects member creation and lets an owner create a link that can be previewed twice', async () => {
  const user = { id: 'user-id' };
  const workspace = { id: 'workspace-id', slug: 'my-team', name: 'My team' };
  const findWorkspaceRole = vi
    .fn<AccessRepository['findWorkspaceRole']>()
    .mockResolvedValue('MEMBER');
  const createInvite = vi.fn<WorkspaceRepository['createInvite']>().mockResolvedValue(undefined);
  const findActiveInvite = vi.fn<WorkspaceRepository['findActiveInvite']>().mockResolvedValue(null);
  const moduleRef = await Test.createTestingModule({
    controllers: [WorkspaceController, InviteController],
    providers: [
      AccessService,
      WorkspaceService,
      { provide: AccessRepository, useValue: { findWorkspaceRole } },
      {
        provide: WorkspaceRepository,
        useValue: {
          findBySlug: vi.fn().mockResolvedValue(workspace),
          createInvite,
          findActiveInvite,
        },
      },
    ],
  }).compile();
  const app = moduleRef.createNestApplication({ logger: false });
  app.useGlobalPipes(new StandardSchemaValidationPipe());
  app.useGlobalGuards({
    canActivate(context: ExecutionContext) {
      context.switchToHttp().getRequest<{ user: typeof user }>().user = user;
      return true;
    },
  });

  try {
    await app.listen(0, '127.0.0.1');
    const url = `${await app.getUrl()}/workspaces/${workspace.slug}/invites`;
    const request = {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ role: 'MEMBER' }),
    };

    expect((await fetch(url, request)).status).toBe(403);
    expect(createInvite).not.toHaveBeenCalled();

    findWorkspaceRole.mockResolvedValue('ADMIN');
    expect((await fetch(url, { ...request, body: JSON.stringify({ role: 'ADMIN' }) })).status).toBe(
      403,
    );
    expect(createInvite).not.toHaveBeenCalled();
    expect((await fetch(url, request)).status).toBe(201);
    createInvite.mockClear();

    findWorkspaceRole.mockResolvedValue('OWNER');
    const response = await fetch(url, request);
    expect(response.status).toBe(201);
    const { token, role } = CreateInviteResponseSchema.parse(await response.json());
    expect(role).toBe('MEMBER');
    expect(createInvite).toHaveBeenCalledOnce();
    const [stored] = createInvite.mock.calls[0]!;
    expect(stored.expiresAt).toBeInstanceOf(Date);
    expect(stored).toEqual({
      workspaceId: workspace.id,
      createdById: user.id,
      role,
      tokenHash: createHash('sha256').update(token).digest('hex'),
      expiresAt: stored.expiresAt,
    });

    const previewUrl = `${await app.getUrl()}/invites/${token}`;
    expect((await fetch(previewUrl)).status).toBe(404);
    findActiveInvite.mockResolvedValue({ role, workspace });
    for (let attempt = 0; attempt < 2; attempt++) {
      const preview = await fetch(previewUrl);
      expect(preview.status).toBe(200);
      expect(await preview.json()).toEqual({
        workspaceName: workspace.name,
        workspaceSlug: workspace.slug,
        role,
      });
    }
    expect(findActiveInvite).toHaveBeenLastCalledWith(
      createHash('sha256').update(token).digest('hex'),
    );
  } finally {
    await app.close();
  }
});
