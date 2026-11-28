// AccessService on real Postgres: the membership query itself, not a mocked repository.
import { describe, expect, it } from 'vitest';
import { AccessService } from '../../src/core/access/access.service.js';
import { WsRole } from '../../src/generated/prisma/client.js';
import { authorization } from './support/http.js';
import { useStand } from './support/stand.js';

const stand = useStand({ instances: ['test-api-1'], realtime: false });

async function createUser(name: string) {
  return stand.prisma.user.create({
    data: { name, email: `${name}@users.invalid`, passwordHash: '!' },
    select: { id: true },
  });
}

async function createWorkspace(slug: string, members: Readonly<Record<string, WsRole>>) {
  return stand.prisma.workspace.create({
    data: {
      name: slug,
      slug,
      members: { create: Object.entries(members).map(([userId, role]) => ({ userId, role })) },
    },
    select: { id: true, slug: true },
  });
}

function deactivate(userId: string) {
  return stand.prisma.user.update({ where: { id: userId }, data: { deactivatedAt: new Date() } });
}

describe('AccessService on the database', () => {
  it('reads the role from the membership of that workspace only', async () => {
    const access = stand.apps[0]!.get(AccessService);
    const [owner, admin, member, outsider] = await Promise.all(
      ['owner', 'admin', 'member', 'outsider'].map(createUser),
    );
    const workspace = await createWorkspace('team', {
      [owner!.id]: WsRole.OWNER,
      [admin!.id]: WsRole.ADMIN,
      [member!.id]: WsRole.MEMBER,
    });
    // Owning another workspace gives nothing in this one.
    const other = await createWorkspace('other-team', { [outsider!.id]: WsRole.OWNER });

    await expect(access.getWorkspaceRole(owner!, workspace.id)).resolves.toBe(WsRole.OWNER);
    await expect(access.getWorkspaceRole(admin!, workspace.id)).resolves.toBe(WsRole.ADMIN);
    await expect(access.getWorkspaceRole(member!, workspace.id)).resolves.toBe(WsRole.MEMBER);
    await expect(access.getWorkspaceRole(outsider!, workspace.id)).resolves.toBeNull();
    await expect(access.getWorkspaceRole(owner!, other.id)).resolves.toBeNull();

    const scope = { workspaceId: workspace.id };
    await expect(access.can(member!, 'workspace.read', scope)).resolves.toBe(true);
    await expect(access.can(member!, 'workspace.update', scope)).resolves.toBe(false);
    await expect(access.can(admin!, 'workspace.update', scope)).resolves.toBe(true);
    await expect(access.can(outsider!, 'workspace.read', scope)).resolves.toBe(false);
    await expect(access.can(outsider!, 'workspace.update', scope)).resolves.toBe(false);
  });

  it('denies every check to a deactivated user who still has a membership row', async () => {
    const access = stand.apps[0]!.get(AccessService);
    const [owner, member] = await Promise.all(['owner', 'member'].map(createUser));
    const workspace = await createWorkspace('team', {
      [owner!.id]: WsRole.OWNER,
      [member!.id]: WsRole.MEMBER,
    });
    const scope = { workspaceId: workspace.id };
    const transfer = { ...scope, targetUserId: member!.id };
    await expect(access.can(owner!, 'workspace.ownership.transfer', transfer)).resolves.toBe(true);

    await deactivate(member!.id);

    await expect(access.getWorkspaceRole(member!, workspace.id)).resolves.toBeNull();
    await expect(access.can(member!, 'workspace.read', scope)).resolves.toBe(false);
    await expect(access.can(member!, 'workspace.create')).resolves.toBe(false);
    // A deactivated member is not a valid target either.
    await expect(access.can(owner!, 'workspace.ownership.transfer', transfer)).resolves.toBe(false);

    await deactivate(owner!.id);
    await expect(access.can(owner!, 'workspace.read', scope)).resolves.toBe(false);
  });
});

describe('GET /api/workspaces/:slug', () => {
  it('opens the workspace for every role and hides it from a removed member', async () => {
    const app = stand.apps[0]!;
    const [owner, admin, member] = await Promise.all(['owner', 'admin', 'member'].map(createUser));
    const workspace = await createWorkspace('team', {
      [owner!.id]: WsRole.OWNER,
      [admin!.id]: WsRole.ADMIN,
      [member!.id]: WsRole.MEMBER,
    });
    const url = `${await app.getUrl()}/api/workspaces/${workspace.slug}`;
    const open = async (userId: string) =>
      fetch(url, { headers: { authorization: await authorization(app, userId) } });

    for (const user of [owner!, admin!, member!]) {
      expect((await open(user.id)).status).toBe(200);
    }

    await stand.prisma.workspaceMember.delete({
      where: { workspaceId_userId: { workspaceId: workspace.id, userId: member!.id } },
    });
    const removed = await open(member!.id);
    expect(removed.status).toBe(404);
    expect(await removed.json()).toMatchObject({ statusCode: 404, message: 'Workspace not found' });
  });
});
