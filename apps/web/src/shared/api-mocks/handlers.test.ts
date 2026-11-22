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
