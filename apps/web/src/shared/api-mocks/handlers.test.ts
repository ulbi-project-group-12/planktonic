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

// Workspace operations share an in-memory list, so each test uses its own slug.
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

  const bySlug = await fetch('http://api.example.invalid/api/workspaces/team-one');
  expect(bySlug.status).toBe(200);
  expect(await bySlug.json()).toEqual(workspace);
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
  });
});

// Email verification is mocked by hand until UL-158 adds the endpoints to the OpenAPI schema.
// Token state lives in memory for the whole test file (like the workspace list), so each test
// below relies on its own token or its own resend session key.
function postVerifyEmail(body: unknown): Promise<Response> {
  return fetch('http://api.example.invalid/api/auth/verify-email', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function postResend(accessToken: string): Promise<Response> {
  return fetch('http://api.example.invalid/api/auth/verify-email/resend', {
    method: 'POST',
    headers: { authorization: `Bearer ${accessToken}` },
  });
}

it('confirms a fresh token once and reads it as used on the second open', async () => {
  const first = await postVerifyEmail({ token: 'valid' });
  expect(first.status).toBe(200);
  expect(await first.json()).toEqual({ status: 'confirmed' });

  const second = await postVerifyEmail({ token: 'valid' });
  expect(second.status).toBe(409);
});

it('answers 409 for a token that was already used', async () => {
  const response = await postVerifyEmail({ token: 'used' });
  expect(response.status).toBe(409);
});

it('answers 410 for an expired or unknown link', async () => {
  for (const token of ['expired', 'no-such-token']) {
    const response = await postVerifyEmail({ token });
    expect(response.status).toBe(410);
  }
});

it('answers 400 with a token issue when the token is missing', async () => {
  const response = await postVerifyEmail({});
  expect(response.status).toBe(400);
  expect(await response.json()).toMatchObject({ statusCode: 400, issues: [{ path: 'token' }] });
});

it('resends the letter and reports the wait before the next one', async () => {
  const response = await postResend('session-one');
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ resendAfterSec: 60 });
});

it('limits the resend frequency per session and says how long to wait', async () => {
  await postResend('session-two');
  const limited = await postResend('session-two');

  expect(limited.status).toBe(429);
  const body: unknown = await limited.json();
  expect(body).toMatchObject({ statusCode: 429 });
  expect((body as { retryAfterSec: number }).retryAfterSec).toBeGreaterThan(0);
  expect((body as { retryAfterSec: number }).retryAfterSec).toBeLessThanOrEqual(60);
});

it('does not share the resend limit between sessions', async () => {
  const response = await postResend('session-three');
  expect(response.status).toBe(200);
});
