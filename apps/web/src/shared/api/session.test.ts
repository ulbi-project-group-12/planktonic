import { afterEach, expect, it, vi } from 'vitest';
import { authMe } from './generated/api';
import { setAccessTokenProvider } from './http-client';
import { sessionStore, signIn, signOut } from './session';

const credentials = { email: 'ada@example.com', password: 'example-passphrase' };

afterEach(() => {
  sessionStore.setState({ accessToken: undefined });
  setAccessTokenProvider(undefined);
  vi.restoreAllMocks();
});

it('passes the token from login to the next API request', async () => {
  const fetcher = vi
    .spyOn(globalThis, 'fetch')
    .mockResolvedValueOnce(Response.json({ accessToken: 'test-access-token' }))
    .mockResolvedValueOnce(Response.json({ id: 'user-id', name: 'Ada', email: credentials.email }));

  await signIn(credentials);
  await authMe();

  expect(fetcher).toHaveBeenNthCalledWith(
    1,
    '/api/auth/login',
    expect.objectContaining({ method: 'POST', body: JSON.stringify(credentials) }),
  );
  expect(fetcher).toHaveBeenNthCalledWith(
    2,
    '/api/auth/me',
    expect.objectContaining({
      headers: new Headers({ Authorization: 'Bearer test-access-token' }),
    }),
  );
});

it('stops sending the token after sign-out', async () => {
  const fetcher = vi
    .spyOn(globalThis, 'fetch')
    .mockResolvedValueOnce(Response.json({ accessToken: 'test-access-token' }))
    .mockResolvedValueOnce(Response.json({ message: 'Unauthorized' }, { status: 401 }));

  await signIn(credentials);
  signOut();
  await expect(authMe()).rejects.toMatchObject({ status: 401 });

  expect(sessionStore.getState().accessToken).toBeUndefined();
  expect(new Headers(fetcher.mock.calls[1]?.[1]?.headers).has('Authorization')).toBe(false);
});

it('keeps the session empty when login is rejected', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
    Response.json({ message: 'Invalid email or password' }, { status: 401 }),
  );

  await expect(signIn(credentials)).rejects.toMatchObject({ status: 401 });
  expect(sessionStore.getState().accessToken).toBeUndefined();
});
