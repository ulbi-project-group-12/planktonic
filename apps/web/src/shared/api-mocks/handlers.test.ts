import { MessageSeq, RegisterResponseSchema } from '@app/contracts';
import { expect, it } from 'vitest';
import { getAuthRegisterMockHandler409, getMessagesListResponseMock } from '.';
import { ApiError, authRegister, messagesList } from '../api';
import { server } from '../api-mocks-node';

const registration = {
  name: 'Ada',
  email: 'ada@example.com',
  password: 'test-password',
  confirmPassword: 'test-password',
};

it('mocks registration through the default handler set without a backend', async () => {
  // Vitest starts the server with createApiHandlers() and errors on unhandled requests.
  const response = await fetch('http://api.example.invalid/api/auth/register', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(registration),
  });

  expect(response.status).toBe(201);
  const body: unknown = await response.json();
  expect(RegisterResponseSchema.parse(body)).toEqual({
    id: '019a8f00-0000-7000-8000-000000000004',
    name: 'Ada',
    email: 'ada@example.com',
  });
});

it('lets one test replace a response with a generated error handler', async () => {
  const body = {
    statusCode: 409 as const,
    message: 'Email is taken',
    issues: [{ path: 'email' as const, message: 'Email is taken' }],
  };
  server.use(getAuthRegisterMockHandler409(body));

  const request = authRegister(registration);
  await expect(request).rejects.toBeInstanceOf(ApiError);
  await expect(request).rejects.toMatchObject({ status: 409, body });
});

it('restores the default response after a test that overrode it', async () => {
  await expect(authRegister(registration)).resolves.toMatchObject({ name: 'Ada' });
});

it('generates message sequence numbers the contract accepts', async () => {
  for (const message of getMessagesListResponseMock().messages) {
    expect(MessageSeq.safeParse(message.seq).success).toBe(true);
  }
  const page = await messagesList('019a8f00-0000-7000-8000-000000000001');
  expect(page.messages.every((message) => MessageSeq.safeParse(message.seq).success)).toBe(true);
});

// Workspaces are mocked by hand until UL-143 adds the endpoints to the OpenAPI schema. The list
// lives in memory for the whole test file (server.resetHandlers() does not empty it), so each
// test below uses its own slug.
function postWorkspace(body: unknown): Promise<Response> {
  return fetch('http://api.example.invalid/api/workspaces', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

it('creates a workspace and returns it in the list', async () => {
  const created = await postWorkspace({ name: '  Team One  ', slug: 'team-one' });
  expect(created.status).toBe(201);
  const workspace: unknown = await created.json();
  expect(workspace).toMatchObject({ name: 'Team One', slug: 'team-one' });

  const list = await fetch('http://api.example.invalid/api/workspaces');
  expect(await list.json()).toContainEqual(workspace);
});

it('answers 409 with a slug issue when the slug is taken', async () => {
  await postWorkspace({ name: 'Team Two', slug: 'team-two' });
  const conflict = await postWorkspace({ name: 'Another name', slug: 'team-two' });

  expect(conflict.status).toBe(409);
  expect(await conflict.json()).toMatchObject({
    statusCode: 409,
    issues: [{ path: 'slug' }],
  });
});

it('answers 400 with field issues for a slug the contract rejects', async () => {
  for (const slug of ['Bad Slug', '-edge-', 'create']) {
    const response = await postWorkspace({ name: 'Team', slug });
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ statusCode: 400, issues: [{ path: 'slug' }] });
  }
});

it('returns the current user', async () => {
  const response = await fetch('http://api.example.invalid/api/auth/me');
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({
    id: '019a8f00-0000-7000-8000-000000000004',
    name: 'Ada',
    email: 'ada@example.com',
    tz: 'Europe/Berlin',
  });
});

it('filters workspaces by name or slug', async () => {
  await postWorkspace({ name: 'Alpha Team', slug: 'alpha-team' });
  await postWorkspace({ name: 'Beta Crew', slug: 'beta-crew' });

  const byName = await fetch('http://api.example.invalid/api/workspaces?q=alpha');
  expect(await byName.json()).toEqual([expect.objectContaining({ name: 'Alpha Team' })]);

  const bySlug = await fetch('http://api.example.invalid/api/workspaces?q=crew');
  expect(await bySlug.json()).toEqual([expect.objectContaining({ name: 'Beta Crew' })]);

  const empty = await fetch('http://api.example.invalid/api/workspaces?q=unknown');
  expect(await empty.json()).toEqual([]);
});
