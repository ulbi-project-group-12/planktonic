import { createHash, randomUUID } from 'node:crypto';
import {
  CreateInviteResponseSchema,
  CreateWorkspaceRequestSchema,
  ListWorkspacesResponseSchema,
  ValidationErrorResponse,
  WorkspaceResponseSchema,
  WorkspaceSlugConflictResponseSchema,
} from '@app/contracts';
import { describe, expect, it } from 'vitest';
import { WsRole } from '../../src/generated/prisma/client.js';
import { DEFAULT_AUTHOR_ID } from '../../src/modules/messages/default-author.js';
import { WorkspaceRepository } from '../../src/modules/workspace/workspace.repository.js';
import { authorization } from './support/http.js';
import { useStand } from './support/stand.js';

const stand = useStand({ instances: ['test-api-1'], realtime: false });
const request = { name: 'My team', slug: 'my-team' };

it('preserves existing roles and consumes an invite for only one concurrent joiner', async () => {
  const workspace = WorkspaceResponseSchema.parse(await (await createWorkspace(request)).json());
  const app = stand.apps[0]!;
  const base = `${await app.getUrl()}/api`;
  const created = await fetch(`${base}/workspaces/${workspace.slug}/invites`, {
    method: 'POST',
    headers: { authorization: authorization(app), 'content-type': 'application/json' },
    body: JSON.stringify({ role: 'ADMIN' }),
  });
  expect(created.status).toBe(201);
  const { token } = CreateInviteResponseSchema.parse(await created.json());
  expect(await stand.prisma.invite.findFirstOrThrow()).toMatchObject({
    tokenHash: createHash('sha256').update(token).digest('hex'),
  });
  const accept = (userId: string) =>
    fetch(`${base}/invites/${token}/accept`, {
      method: 'POST',
      headers: { authorization: authorization(app, userId) },
    });

  expect((await accept(DEFAULT_AUTHOR_ID)).status).toBe(200);
  expect(await stand.prisma.invite.findFirstOrThrow()).toMatchObject({ consumedAt: null });

  const users = await stand.prisma.user.createManyAndReturn({
    data: ['1', '2'].map((n) => ({
      name: `Joiner ${n}`,
      email: `joiner${n}@users.invalid`,
      passwordHash: '!',
    })),
  });
  const preview = () =>
    fetch(`${base}/invites/${token}`, {
      headers: { authorization: authorization(app, users[0]!.id) },
    });
  const details = await preview();
  expect(details.status).toBe(200);
  expect(await details.json()).toEqual({
    workspaceName: workspace.name,
    workspaceSlug: workspace.slug,
    role: WsRole.ADMIN,
  });
  const responses = await Promise.all(users.map(({ id }) => accept(id)));
  expect(responses.map(({ status }) => status).sort()).toEqual([200, 410]);
  const winner = responses.findIndex(({ status }) => status === 200);
  expect(await responses[winner]!.json()).toEqual({ workspaceSlug: workspace.slug });
  expect(
    await stand.prisma.workspaceMember.findMany({ where: { workspaceId: workspace.id } }),
  ).toEqual(
    expect.arrayContaining([
      { workspaceId: workspace.id, userId: DEFAULT_AUTHOR_ID, role: WsRole.OWNER },
      { workspaceId: workspace.id, userId: users[winner]!.id, role: WsRole.ADMIN },
    ]),
  );
  expect(await stand.prisma.workspaceMember.count({ where: { workspaceId: workspace.id } })).toBe(
    2,
  );
  expect((await stand.prisma.invite.findFirstOrThrow()).consumedAt).toBeInstanceOf(Date);
  expect((await preview()).status).toBe(404);
});

it('returns 403 when a regular member tries to create an invitation', async () => {
  const workspace = WorkspaceResponseSchema.parse(await (await createWorkspace(request)).json());
  const member = await stand.prisma.user.create({
    data: { name: 'Member', email: 'member@users.invalid', passwordHash: '!' },
  });
  await stand.prisma.workspaceMember.create({
    data: { workspaceId: workspace.id, userId: member.id, role: WsRole.MEMBER },
  });
  const app = stand.apps[0]!;
  const response = await fetch(`${await app.getUrl()}/api/workspaces/${workspace.slug}/invites`, {
    method: 'POST',
    headers: { authorization: authorization(app, member.id), 'content-type': 'application/json' },
    body: JSON.stringify({ role: 'MEMBER' }),
  });
  expect(response.status).toBe(403);
  expect(await stand.prisma.invite.count()).toBe(0);
});

describe('invite refusals', () => {
  async function setupInvite(role: 'MEMBER' | 'ADMIN' = 'MEMBER') {
    const workspace = WorkspaceResponseSchema.parse(await (await createWorkspace(request)).json());
    const app = stand.apps[0]!;
    const base = `${await app.getUrl()}/api`;
    const create = (userId: string, inviteRole: string = role) =>
      fetch(`${base}/workspaces/${workspace.slug}/invites`, {
        method: 'POST',
        headers: { authorization: authorization(app, userId), 'content-type': 'application/json' },
        body: JSON.stringify({ role: inviteRole }),
      });
    const created = await create(DEFAULT_AUTHOR_ID);
    expect(created.status).toBe(201);
    const { token } = CreateInviteResponseSchema.parse(await created.json());
    const joiner = await stand.prisma.user.create({
      data: { name: 'Joiner', email: 'joiner@users.invalid', passwordHash: '!' },
    });
    const headers = { authorization: authorization(app, joiner.id) };
    return {
      workspace,
      joiner,
      create,
      preview: (inviteToken = token) => fetch(`${base}/invites/${inviteToken}`, { headers }),
      accept: (inviteToken = token) =>
        fetch(`${base}/invites/${inviteToken}/accept`, { method: 'POST', headers }),
    };
  }

  it.each([
    ['expired', { expiresAt: new Date(Date.now() - 1_000) }],
    ['revoked', { revokedAt: new Date() }],
  ])('answers 404 on preview and 410 on accept for an %s link', async (_name, data) => {
    const { workspace, preview, accept } = await setupInvite();
    await stand.prisma.invite.updateMany({ data });

    expect((await preview()).status).toBe(404);
    expect((await accept()).status).toBe(410);
    expect(await stand.prisma.workspaceMember.count({ where: { workspaceId: workspace.id } })).toBe(
      1,
    );
    expect(await stand.prisma.invite.findFirstOrThrow()).toMatchObject({ consumedAt: null });
  });

  it('answers an unknown token the same way as a dead one', async () => {
    const { preview, accept } = await setupInvite();

    expect((await preview('unknown-token')).status).toBe(404);
    expect((await accept('unknown-token')).status).toBe(410);
  });

  it('rejects a deactivated user at authentication and keeps the link alive', async () => {
    const { workspace, joiner, accept } = await setupInvite();
    await stand.prisma.user.update({
      where: { id: joiner.id },
      data: { deactivatedAt: new Date() },
    });

    expect((await accept()).status).toBe(401);
    expect(await stand.prisma.workspaceMember.count({ where: { workspaceId: workspace.id } })).toBe(
      1,
    );
    expect(await stand.prisma.invite.findFirstOrThrow()).toMatchObject({ consumedAt: null });
  });

  it('hides the workspace from an outsider and limits an admin to member invites', async () => {
    const { workspace, joiner, create } = await setupInvite();

    expect((await create(joiner.id)).status).toBe(404);

    await stand.prisma.workspaceMember.create({
      data: { workspaceId: workspace.id, userId: joiner.id, role: WsRole.ADMIN },
    });
    expect((await create(joiner.id, 'ADMIN')).status).toBe(403);
    expect((await create(joiner.id, 'OWNER')).status).toBe(400);
    expect(await stand.prisma.invite.count()).toBe(1);
    expect((await create(joiner.id, 'MEMBER')).status).toBe(201);
  });
});

async function createWorkspace(body: unknown, authenticated = true): Promise<Response> {
  const [app] = stand.apps;
  return fetch(`${await app!.getUrl()}/api/workspaces`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(authenticated ? { authorization: authorization(app!) } : {}),
    },
    body: JSON.stringify(body),
  });
}

describe('POST /api/workspaces', () => {
  it('creates a workspace and gives the authenticated creator the OWNER role', async () => {
    const response = await createWorkspace({ ...request, name: '  My team  ' });

    expect(response.status).toBe(201);
    const workspace = WorkspaceResponseSchema.parse(await response.json());
    expect(workspace).toMatchObject(request);
    expect(await stand.prisma.workspaceMember.findMany()).toEqual([
      { workspaceId: workspace.id, userId: DEFAULT_AUTHOR_ID, role: WsRole.OWNER },
    ]);
  });

  it('returns 401 without an access token', async () => {
    const response = await createWorkspace(request, false);

    expect(response.status).toBe(401);
    expect(await stand.prisma.workspace.count()).toBe(0);
  });

  it('returns a field error for a reserved slug', async () => {
    const response = await createWorkspace({ ...request, slug: 'create' });

    expect(response.status).toBe(400);
    const error = ValidationErrorResponse.parse(await response.json());
    expect(error.issues.map(({ path }) => path)).toEqual(['slug']);
    expect(await stand.prisma.workspace.count()).toBe(0);
  });

  it('creates one workspace and one owner when two requests use the same slug', async () => {
    const responses = await Promise.all([createWorkspace(request), createWorkspace(request)]);

    expect(responses.map(({ status }) => status).sort()).toEqual([201, 409]);
    const conflict = responses.find(({ status }) => status === 409)!;
    expect(WorkspaceSlugConflictResponseSchema.parse(await conflict.json()).issues).toEqual([
      { path: 'slug', message: 'This slug is already taken' },
    ]);
    expect(await stand.prisma.workspace.count()).toBe(1);
    expect(await stand.prisma.workspaceMember.count()).toBe(1);
  });

  it('rolls back workspace creation when the owner record cannot be inserted', async () => {
    const repository = stand.apps[0]!.get(WorkspaceRepository);

    await expect(
      repository.createWithOwner(CreateWorkspaceRequestSchema.parse(request), randomUUID()),
    ).rejects.toMatchObject({ code: 'P2003' });
    expect(await stand.prisma.workspace.count()).toBe(0);
  });
});

describe('GET /api/workspaces', () => {
  it('lists only spaces the authenticated user belongs to', async () => {
    const created = await createWorkspace(request);
    expect(created.status).toBe(201);
    const workspace = WorkspaceResponseSchema.parse(await created.json());
    const otherUser = await stand.prisma.user.create({
      data: { name: 'Other user', email: 'other@users.invalid', passwordHash: '!' },
    });
    const app = stand.apps[0]!;
    const url = `${await app.getUrl()}/api/workspaces`;

    const ownerList = await fetch(url, { headers: { authorization: authorization(app) } });
    expect(ownerList.status).toBe(200);
    expect(ListWorkspacesResponseSchema.parse(await ownerList.json())).toEqual([workspace]);

    const otherList = await fetch(url, {
      headers: { authorization: authorization(app, otherUser.id) },
    });
    expect(otherList.status).toBe(200);
    expect(ListWorkspacesResponseSchema.parse(await otherList.json())).toEqual([]);

    expect((await fetch(url)).status).toBe(401);
  });
});

describe('GET /api/workspaces/:slug', () => {
  it('serves members and returns the same 404 for a foreign or missing workspace', async () => {
    const created = await createWorkspace(request);
    expect(created.status).toBe(201);
    const workspace = WorkspaceResponseSchema.parse(await created.json());
    const otherUser = await stand.prisma.user.create({
      data: { name: 'Other user', email: 'other@users.invalid', passwordHash: '!' },
    });
    const app = stand.apps[0]!;
    const baseUrl = `${await app.getUrl()}/api/workspaces`;
    const url = `${baseUrl}/${workspace.slug}`;
    const otherHeaders = { authorization: authorization(app, otherUser.id) };

    const owner = await fetch(url, { headers: { authorization: authorization(app) } });
    expect(owner.status).toBe(200);
    expect(await owner.json()).toEqual({ ...workspace, role: WsRole.OWNER });

    const foreign = await fetch(url, { headers: otherHeaders });
    const missing = await fetch(`${baseUrl}/missing-workspace`, { headers: otherHeaders });
    expect(foreign.status).toBe(404);
    expect(missing.status).toBe(404);
    expect(await foreign.json()).toEqual(await missing.json());

    expect((await fetch(url)).status).toBe(401);
    expect((await fetch(`${baseUrl}/create`, { headers: otherHeaders })).status).toBe(400);

    await stand.prisma.workspaceMember.create({
      data: { workspaceId: workspace.id, userId: otherUser.id, role: WsRole.MEMBER },
    });
    const member = await fetch(url, { headers: otherHeaders });
    expect(member.status).toBe(200);
    expect(await member.json()).toEqual({ ...workspace, role: WsRole.MEMBER });
  });
});
