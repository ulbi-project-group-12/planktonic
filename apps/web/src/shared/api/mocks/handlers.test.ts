import { RegisterResponseSchema } from '@app/contracts';
import { getResponse, isPassthroughResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { API_DEMO_MOCK_HEADER } from './demo-config';
import { createDemoApiHandlers } from './handlers';

const origin = 'http://localhost';

it('mocks registration through the full Vitest handler set without a backend', async () => {
  // Vitest starts MSW with createApiHandlers() and errors on unhandled requests.
  const response = await fetch('http://api.example.invalid/api/auth/register', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      name: 'Ada',
      email: 'ada@example.com',
      password: 'test-password',
      confirmPassword: 'test-password',
    }),
  });

  expect(response.status).toBe(201);
  const body: unknown = await response.json();
  expect(RegisterResponseSchema.parse(body)).toEqual({
    id: '019a8f00-0000-7000-8000-000000000004',
    name: 'Ada',
    email: 'ada@example.com',
  });
});

describe('demo browser handlers', () => {
  it('returns the generated health response for an opted-in request', async () => {
    const response = await getResponse(
      createDemoApiHandlers(),
      new Request(`${origin}/api/health`, { headers: { [API_DEMO_MOCK_HEADER]: 'true' } }),
    );

    expect(response?.status).toBe(200);
    await expect(response?.json()).resolves.toMatchObject({ status: 'ok', instanceId: 'msw-demo' });
  });

  it.each([undefined, 'false'])(
    'passes health through when the opt-in header is %s',
    async (value) => {
      const headers = value === undefined ? undefined : { [API_DEMO_MOCK_HEADER]: value };
      const response = await getResponse(
        createDemoApiHandlers(),
        new Request(`${origin}/api/health`, { headers }),
      );

      expect(response && isPassthroughResponse(response)).toBe(true);
    },
  );

  it.each([
    ['POST', '/api/auth/register'],
    ['GET', '/api/health/ready'],
    ['GET', '/api/channels/channel-id/messages?afterSeq=42'],
    ['POST', '/api/channels/channel-id/messages'],
  ])('registers no handler for %s %s even with the opt-in header', async (method, path) => {
    const response = await getResponse(
      createDemoApiHandlers(),
      new Request(`${origin}${path}`, { method, headers: { [API_DEMO_MOCK_HEADER]: 'true' } }),
    );

    expect(response).toBeUndefined();
  });
});
