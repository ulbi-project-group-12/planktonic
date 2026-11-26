import { createHash, randomUUID } from 'node:crypto';
import {
  CreateInviteResponseSchema,
  CreateWorkspaceRequestSchema,
  ListWorkspacesResponseSchema,
  LoginResponseSchema,
  ValidationErrorResponse,
  WorkspaceResponseSchema,
  WorkspaceSlugConflictResponseSchema,
} from '@app/contracts';
import { afterAll, describe, expect, it, vi } from 'vitest';
import { WsRole } from '../../src/generated/prisma/client.js';
import { PasswordBreachService } from '../../src/modules/auth/register/password-breach.service.js';
import { DEFAULT_AUTHOR_ID } from '../../src/modules/messages/default-author.js';
import { WorkspaceRepository } from '../../src/modules/workspace/workspace.repository.js';
import { authorization } from './support/http.js';
import { useStand } from './support/stand.js';

const stand = useStand({ instances: ['test-api-1'], realtime: false });
const request = { name: 'My team', slug: 'my-team' };

// Registration asks an outside service whether the password is known to be leaked.
const passwordBreach = vi
  .spyOn(PasswordBreachService.prototype, 'isBlocked')
  .mockResolvedValue(false);
afterAll(() => {
  passwordBreach.mockRestore();
});

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

  const alreadyMember = await accept(DEFAULT_AUTHOR_ID);
  expect(alreadyMember.status).toBe(200);
  expect(await alreadyMember.json()).toEqual({
    workspaceSlug: workspace.slug,
    outcome: 'already_member',
  });
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
  expect(await responses[winner]!.json()).toEqual({
    workspaceSlug: workspace.slug,
    outcome: 'joined',
  });
  expect(await responses[1 - winner]!.json()).toMatchObject({ code: 'invite_consumed' });
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
  const consumed = await preview();
  expect(consumed.status).toBe(410);
  expect(await consumed.json()).toMatchObject({ code: 'invite_consumed' });
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

it('lets a guest register, sign in and join through the link, which then reads as used', async () => {
  const workspace = WorkspaceResponseSchema.parse(await (await createWorkspace(request)).json());
  const app = stand.apps[0]!;
  const base = `${await app.getUrl()}/api`;
  const json = { 'content-type': 'application/json' };
  const created = await fetch(`${base}/workspaces/${workspace.slug}/invites`, {
    method: 'POST',
    headers: { ...json, authorization: authorization(app) },
    body: JSON.stringify({ role: 'MEMBER' }),
  });
  const { token } = CreateInviteResponseSchema.parse(await created.json());
  const inviteUrl = `${base}/invites/${token}`;

  // The guest sees nothing about the invitation until they have an account and a session.
  expect((await fetch(inviteUrl)).status).toBe(401);
  const credentials = { email: 'guest@example.com', password: 'example-passphrase' };
  const registration = await fetch(`${base}/auth/register`, {
    method: 'POST',
    headers: json,
    body: JSON.stringify({ ...credentials, name: 'Guest', confirmPassword: credentials.password }),
  });
  expect(registration.status).toBe(201);
  // Registering alone neither signs the guest in nor joins the workspace.
  expect(await stand.prisma.workspaceMember.count({ where: { workspaceId: workspace.id } })).toBe(
    1,
  );
  const login = await fetch(`${base}/auth/login`, {
    method: 'POST',
    headers: json,
    body: JSON.stringify(credentials),
  });
  expect(login.status).toBe(200);
  const { accessToken } = LoginResponseSchema.parse(await login.json());
  const headers = { authorization: `Bearer ${accessToken}` };

  const preview = await fetch(inviteUrl, { headers });
  expect(preview.status).toBe(200);
  expect(await preview.json()).toEqual({
    workspaceName: workspace.name,
    workspaceSlug: workspace.slug,
    role: 'MEMBER',
  });
  const accept = () => fetch(`${inviteUrl}/accept`, { method: 'POST', headers });
  const joined = await accept();
  expect(joined.status).toBe(200);
  expect(await joined.json()).toEqual({ workspaceSlug: workspace.slug, outcome: 'joined' });
  expect(
    await stand.prisma.workspaceMember.findFirstOrThrow({
      where: { workspaceId: workspace.id, user: { email: credentials.email } },
    }),
  ).toMatchObject({ role: WsRole.MEMBER });

  // The same person reopening the spent link is told it was used, not let in a second time.
  for (const response of [await fetch(inviteUrl, { headers }), await accept()]) {
    expect(response.status).toBe(410);
    expect(await response.json()).toMatchObject({ code: 'invite_consumed' });
  }
  expect(await stand.prisma.workspaceMember.count({ where: { workspaceId: workspace.id } })).toBe(
    2,
  );
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
      inviteUrl: `${base}/invites/${token}`,
      preview: (inviteToken = token) => fetch(`${base}/invites/${inviteToken}`, { headers }),
      accept: (inviteToken = token) =>
        fetch(`${base}/invites/${inviteToken}/accept`, { method: 'POST', headers }),
    };
  }

  it.each([
    ['invite_expired', { expiresAt: new Date(Date.now() - 1_000) }],
    ['invite_revoked', { revokedAt: new Date() }],
  ])('answers 410 with %s on preview and accept', async (code, data) => {
    const { workspace, preview, accept } = await setupInvite();
    await stand.prisma.invite.updateMany({ data });

    for (const response of [await preview(), await accept()]) {
      expect(response.status).toBe(410);
      expect(await response.json()).toMatchObject({ code });
    }
    expect(await stand.prisma.workspaceMember.count({ where: { workspaceId: workspace.id } })).toBe(
      1,
    );
    expect(await stand.prisma.invite.findFirstOrThrow()).toMatchObject({ consumedAt: null });
  });

  it('answers 404 for an unknown token on preview and accept', async () => {
    const { preview, accept } = await setupInvite();

    for (const response of [await preview('unknown-token'), await accept('unknown-token')]) {
      expect(response.status).toBe(404);
      expect(await response.json()).toMatchObject({ code: 'invite_not_found' });
    }
  });

  it('requires authentication for preview and acceptance without changing the invite', async () => {
    const { workspace, inviteUrl, preview } = await setupInvite();

    expect((await fetch(inviteUrl)).status).toBe(401);
    expect((await fetch(`${inviteUrl}/accept`, { method: 'POST' })).status).toBe(401);
    expect((await preview()).status).toBe(200);
    expect(await stand.prisma.invite.findFirstOrThrow()).toMatchObject({ consumedAt: null });
    expect(await stand.prisma.workspaceMember.count({ where: { workspaceId: workspace.id } })).toBe(
      1,
    );
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
