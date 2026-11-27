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

it('denies the next admin-only request after demotion with the same access token', async () => {
  const workspace = WorkspaceResponseSchema.parse(await (await createWorkspace(request)).json());
  const admin = await stand.prisma.user.create({
    data: { name: 'Admin', email: 'demoted-admin@users.invalid', passwordHash: '!' },
  });
  await stand.prisma.workspaceMember.create({
    data: { workspaceId: workspace.id, userId: admin.id, role: WsRole.ADMIN },
  });
  const app = stand.apps[0]!;
  const base = `${await app.getUrl()}/api/workspaces/${workspace.slug}`;
  const adminAuthorization = authorization(app, admin.id);
  const createInvite = () =>
    fetch(`${base}/invites`, {
      method: 'POST',
      headers: { authorization: adminAuthorization, 'content-type': 'application/json' },
      body: JSON.stringify({ role: WsRole.MEMBER }),
    });

  expect((await createInvite()).status).toBe(201);

  const changeRole = (
    targetId: string,
    authorizationHeader: string,
    role: WsRole = WsRole.MEMBER,
  ) =>
    fetch(`${base}/members/${targetId}/role`, {
      method: 'PATCH',
      headers: { authorization: authorizationHeader, 'content-type': 'application/json' },
      body: JSON.stringify({ role }),
    });
  const ownerAuthorization = authorization(app);
  expect((await changeRole(admin.id, adminAuthorization)).status).toBe(403);
  expect((await changeRole(DEFAULT_AUTHOR_ID, adminAuthorization)).status).toBe(403);
  expect((await changeRole(DEFAULT_AUTHOR_ID, ownerAuthorization)).status).toBe(403);

  const demotion = await changeRole(admin.id, ownerAuthorization);
  expect(demotion.status).toBe(200);
  expect(await demotion.json()).toEqual({
    userId: admin.id,
    name: admin.name,
    role: WsRole.MEMBER,
  });
  expect((await createInvite()).status).toBe(403);
  const list = await fetch(`${base}/members`, { headers: { authorization: adminAuthorization } });
  expect(list.status).toBe(200);
  expect(await list.json()).toMatchObject([
    { userId: admin.id, name: admin.name, role: WsRole.MEMBER },
    { userId: DEFAULT_AUTHOR_ID, role: WsRole.OWNER },
  ]);
  expect((await changeRole(admin.id, adminAuthorization, WsRole.ADMIN)).status).toBe(403);
  expect(await stand.prisma.invite.count({ where: { workspaceId: workspace.id } })).toBe(1);

  const promotion = await changeRole(admin.id, ownerAuthorization, WsRole.ADMIN);
  expect(promotion.status).toBe(200);
  expect(await promotion.json()).toEqual({
    userId: admin.id,
    name: admin.name,
    role: WsRole.ADMIN,
  });
  expect((await createInvite()).status).toBe(201);
});

describe('workspace members', () => {
  const json = { 'content-type': 'application/json' };

  /** A workspace owned by the fixture user, plus active users added with the given roles. */
  async function setupMembers(roles: Readonly<Record<string, WsRole | null>>) {
    const workspace = WorkspaceResponseSchema.parse(await (await createWorkspace(request)).json());
    const users: Record<string, string> = {};
    for (const [name, role] of Object.entries(roles)) {
      const user = await stand.prisma.user.create({
        data: { name, email: `${name.toLowerCase()}@users.invalid`, passwordHash: '!' },
      });
      users[name] = user.id;
      if (role) {
        await stand.prisma.workspaceMember.create({
          data: { workspaceId: workspace.id, userId: user.id, role },
        });
      }
    }
    const app = stand.apps[0]!;
    const base = `${await app.getUrl()}/api/workspaces/${workspace.slug}/members`;
    const changeRole = (actorId: string, targetId: string, role: string) =>
      fetch(`${base}/${targetId}/role`, {
        method: 'PATCH',
        headers: { ...json, authorization: authorization(app, actorId) },
        body: JSON.stringify({ role }),
      });
    const roleOf = async (userId: string, workspaceId = workspace.id) =>
      (
        await stand.prisma.workspaceMember.findUnique({
          where: { workspaceId_userId: { workspaceId, userId } },
        })
      )?.role;
    return { workspace, users: (name: string) => users[name]!, app, base, changeRole, roleOf };
  }

  it('lists active members by name with only their ID, name and role', async () => {
    const { users, app, base } = await setupMembers({
      Zoe: WsRole.MEMBER,
      Bob: WsRole.ADMIN,
      Gone: WsRole.MEMBER,
      Outsider: null,
    });
    await stand.prisma.user.update({
      where: { id: users('Gone') },
      data: { deactivatedAt: new Date() },
    });
    await stand.prisma.user.update({ where: { id: DEFAULT_AUTHOR_ID }, data: { name: 'Owner' } });

    const expected = [
      { userId: users('Bob'), name: 'Bob', role: WsRole.ADMIN },
      { userId: DEFAULT_AUTHOR_ID, name: 'Owner', role: WsRole.OWNER },
      { userId: users('Zoe'), name: 'Zoe', role: WsRole.MEMBER },
    ];
    for (const reader of [DEFAULT_AUTHOR_ID, users('Bob'), users('Zoe')]) {
      const list = await fetch(base, { headers: { authorization: authorization(app, reader) } });
      expect(list.status).toBe(200);
      // Exact equality: no email, password hash or other user column may reach the list.
      expect(await list.json()).toEqual(expected);
    }

    // A stranger gets the same answer as for an absent workspace; a deactivated member has no session.
    const as = (userId: string) => ({ headers: { authorization: authorization(app, userId) } });
    expect((await fetch(base, as(users('Outsider')))).status).toBe(404);
    expect((await fetch(base, as(users('Gone')))).status).toBe(401);
    expect((await fetch(base)).status).toBe(401);
  });

  it('refuses role changes from anyone but the owner without changing a role', async () => {
    const { users, base, changeRole, roleOf } = await setupMembers({
      Admin: WsRole.ADMIN,
      Peer: WsRole.ADMIN,
      Member: WsRole.MEMBER,
      Other: WsRole.MEMBER,
      Outsider: null,
    });

    // A stranger learns nothing, not even whether the target is a member.
    expect((await changeRole(users('Outsider'), users('Member'), 'ADMIN')).status).toBe(404);
    expect((await changeRole(users('Outsider'), users('Outsider'), 'ADMIN')).status).toBe(404);

    // A member cannot promote themselves or anyone else, nor demote an admin.
    expect((await changeRole(users('Member'), users('Member'), 'ADMIN')).status).toBe(403);
    expect((await changeRole(users('Member'), users('Other'), 'ADMIN')).status).toBe(403);
    expect((await changeRole(users('Member'), users('Admin'), 'MEMBER')).status).toBe(403);

    // An admin cannot promote a member, demote a fellow admin or step down through this route.
    expect((await changeRole(users('Admin'), users('Member'), 'ADMIN')).status).toBe(403);
    expect((await changeRole(users('Admin'), users('Peer'), 'MEMBER')).status).toBe(403);
    expect((await changeRole(users('Admin'), users('Admin'), 'MEMBER')).status).toBe(403);
    expect((await changeRole(users('Admin'), DEFAULT_AUTHOR_ID, 'ADMIN')).status).toBe(403);

    const anonymous = await fetch(`${base}/${users('Member')}/role`, {
      method: 'PATCH',
      headers: json,
      body: JSON.stringify({ role: 'ADMIN' }),
    });
    expect(anonymous.status).toBe(401);

    expect(await roleOf(DEFAULT_AUTHOR_ID)).toBe(WsRole.OWNER);
    expect(await roleOf(users('Admin'))).toBe(WsRole.ADMIN);
    expect(await roleOf(users('Peer'))).toBe(WsRole.ADMIN);
    expect(await roleOf(users('Member'))).toBe(WsRole.MEMBER);
    expect(await roleOf(users('Other'))).toBe(WsRole.MEMBER);
  });

  it('keeps the owner in place and rejects OWNER as a requested role', async () => {
    const { workspace, users, changeRole, roleOf } = await setupMembers({ Admin: WsRole.ADMIN });
    const owner = DEFAULT_AUTHOR_ID;

    // The only owner can be neither demoted nor replaced: ownership moves by a separate action.
    expect((await changeRole(owner, owner, 'ADMIN')).status).toBe(403);
    expect((await changeRole(owner, owner, 'MEMBER')).status).toBe(403);
    for (const target of [owner, users('Admin')]) {
      const refused = await changeRole(owner, target, 'OWNER');
      expect(refused.status).toBe(400);
      expect(ValidationErrorResponse.parse(await refused.json()).issues).toMatchObject([
        { path: 'role' },
      ]);
    }
    expect((await changeRole(owner, 'not-a-uuid', 'ADMIN')).status).toBe(400);
    // The requested role must differ from the current one.
    expect((await changeRole(owner, users('Admin'), 'ADMIN')).status).toBe(403);

    expect(await roleOf(owner)).toBe(WsRole.OWNER);
    expect(await roleOf(users('Admin'))).toBe(WsRole.ADMIN);
    expect(
      await stand.prisma.workspaceMember.count({
        where: { workspaceId: workspace.id, role: WsRole.OWNER },
      }),
    ).toBe(1);
  });

  it('returns 404 for a target outside this workspace and leaves other workspaces alone', async () => {
    const { users, changeRole, roleOf } = await setupMembers({
      Foreign: null,
      Gone: WsRole.MEMBER,
    });
    const owner = DEFAULT_AUTHOR_ID;
    // The fixture owner is only a member of the second workspace, where Foreign is an admin.
    const other = await stand.prisma.workspace.create({
      data: {
        name: 'Other team',
        slug: 'other-team',
        members: {
          create: [
            { userId: users('Foreign'), role: WsRole.ADMIN },
            { userId: owner, role: WsRole.MEMBER },
          ],
        },
      },
    });
    await stand.prisma.user.update({
      where: { id: users('Gone') },
      data: { deactivatedAt: new Date() },
    });

    expect((await changeRole(owner, users('Foreign'), 'MEMBER')).status).toBe(404);
    expect((await changeRole(owner, randomUUID(), 'ADMIN')).status).toBe(404);
    expect((await changeRole(owner, users('Gone'), 'ADMIN')).status).toBe(404);

    expect(await roleOf(users('Foreign'), other.id)).toBe(WsRole.ADMIN);
    expect(await roleOf(owner, other.id)).toBe(WsRole.MEMBER);
    expect(await roleOf(users('Gone'))).toBe(WsRole.MEMBER);
  });

  it('applies one of two concurrent changes of the same member and refuses the other', async () => {
    const { users, changeRole, roleOf } = await setupMembers({ Member: WsRole.MEMBER });
    const owner = DEFAULT_AUTHOR_ID;

    const statuses = (
      await Promise.all([
        changeRole(owner, users('Member'), 'ADMIN'),
        changeRole(owner, users('Member'), 'ADMIN'),
      ])
    ).map((response) => response.status);

    // The loser either lost the conditional update (409) or already saw the new role (403).
    expect(statuses.filter((status) => status === 200)).toHaveLength(1);
    expect(statuses.filter((status) => status === 403 || status === 409)).toHaveLength(1);
    expect(await roleOf(users('Member'))).toBe(WsRole.ADMIN);
    expect(await roleOf(owner)).toBe(WsRole.OWNER);
  });
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
