import { randomUUID } from 'node:crypto';
import {
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
    expect(await owner.json()).toEqual(workspace);

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
    expect(await member.json()).toEqual(workspace);
  });
});
