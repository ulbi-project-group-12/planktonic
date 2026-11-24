import { afterEach, expect, it, vi } from 'vitest';
import { authMe } from './generated/api';
import { apiFetch, setAccessTokenProvider } from './http-client';
import { restoreSession, sessionStore, signIn, signOut } from './session';

const credentials = { email: 'ada@example.com', password: 'example-passphrase' };

afterEach(() => {
  sessionStore.setState({ accessToken: undefined, signedOut: false });
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

it('ends the session when a request with the token gets 401 and refresh fails', async () => {
  vi.spyOn(globalThis, 'fetch')
    .mockResolvedValueOnce(Response.json({ accessToken: 'test-access-token' }))
    .mockResolvedValueOnce(Response.json({ message: 'Unauthorized' }, { status: 401 }))
    .mockResolvedValueOnce(Response.json({ message: 'Unauthorized' }, { status: 401 }));

  await signIn(credentials);
  await expect(apiFetch('/api/workspaces')).rejects.toMatchObject({ status: 401 });

  expect(sessionStore.getState().accessToken).toBeUndefined();
});

it('ends the session on 401 even when the response body cannot be read', async () => {
  const broken = new Response(
    new ReadableStream({
      start(controller) {
        controller.error(new TypeError('connection lost'));
      },
    }),
    { status: 401 },
  );
  vi.spyOn(globalThis, 'fetch')
    .mockResolvedValueOnce(Response.json({ accessToken: 'test-access-token' }))
    .mockResolvedValueOnce(broken)
    .mockResolvedValueOnce(Response.json({ message: 'Unauthorized' }, { status: 401 }));

  await signIn(credentials);
  await expect(apiFetch('/api/workspaces')).rejects.toBeInstanceOf(TypeError);

  expect(sessionStore.getState().accessToken).toBeUndefined();
});

it('keeps a newer session when a request sent with an older token gets 401', async () => {
  let answerOld: (response: Response) => void = () => undefined;
  vi.spyOn(globalThis, 'fetch')
    .mockResolvedValueOnce(Response.json({ accessToken: 'old-token' }))
    .mockReturnValueOnce(
      new Promise<Response>((resolve) => {
        answerOld = resolve;
      }),
    )
    .mockResolvedValueOnce(Response.json({ accessToken: 'new-token' }))
    .mockResolvedValueOnce(Response.json({ message: 'Unauthorized' }, { status: 401 }));

  await signIn(credentials);
  const late = apiFetch('/api/workspaces');
  await signIn(credentials);
  answerOld(Response.json({ message: 'Unauthorized' }, { status: 401 }));
  await expect(late).rejects.toMatchObject({ status: 401 });

  expect(sessionStore.getState().accessToken).toBe('new-token');
});

it('retries the request with the refreshed token instead of ending the session', async () => {
  const fetcher = vi
    .spyOn(globalThis, 'fetch')
    .mockResolvedValueOnce(Response.json({ accessToken: 'stale-token' }))
    .mockResolvedValueOnce(Response.json({ message: 'Unauthorized' }, { status: 401 }))
    .mockResolvedValueOnce(Response.json({ accessToken: 'fresh-token' }))
    .mockResolvedValueOnce(Response.json({ id: 'user-id', name: 'Ada', email: credentials.email }));

  await signIn(credentials);
  await expect(authMe()).resolves.toEqual({
    id: 'user-id',
    name: 'Ada',
    email: credentials.email,
  });

  expect(fetcher).toHaveBeenNthCalledWith(
    3,
    '/api/auth/refresh',
    expect.objectContaining({ method: 'POST' }),
  );
  expect(fetcher).toHaveBeenNthCalledWith(
    4,
    '/api/auth/me',
    expect.objectContaining({
      headers: new Headers({ Authorization: 'Bearer fresh-token' }),
    }),
  );
  expect(sessionStore.getState().accessToken).toBe('fresh-token');
});

it('restores the session through refresh after a reload', async () => {
  const fetcher = vi
    .spyOn(globalThis, 'fetch')
    .mockResolvedValueOnce(Response.json({ accessToken: 'restored-token' }))
    .mockResolvedValueOnce(Response.json({ id: 'user-id', name: 'Ada', email: credentials.email }));

  await expect(restoreSession()).resolves.toBe(true);
  await authMe();

  expect(sessionStore.getState().accessToken).toBe('restored-token');
  expect(fetcher).toHaveBeenNthCalledWith(
    1,
    '/api/auth/refresh',
    expect.objectContaining({ method: 'POST' }),
  );
  expect(fetcher).toHaveBeenNthCalledWith(
    2,
    '/api/auth/me',
    expect.objectContaining({
      headers: new Headers({ Authorization: 'Bearer restored-token' }),
    }),
  );
});

it('shares one refresh between concurrent restores', async () => {
  const fetcher = vi
    .spyOn(globalThis, 'fetch')
    .mockResolvedValue(Response.json({ accessToken: 'restored-token' }));

  await expect(
    Promise.all([restoreSession(), restoreSession(), restoreSession()]),
  ).resolves.toEqual([true, true, true]);

  expect(fetcher).toHaveBeenCalledTimes(1);
});

it('leaves the session empty when refresh is rejected', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
    Response.json({ message: 'Unauthorized' }, { status: 401 }),
  );

  await expect(restoreSession()).resolves.toBe(false);

  expect(sessionStore.getState().accessToken).toBeUndefined();
});

it('does not resurrect the session after an explicit sign-out', async () => {
  signOut();
  const fetcher = vi.spyOn(globalThis, 'fetch');

  await expect(restoreSession()).resolves.toBe(false);

  expect(fetcher).not.toHaveBeenCalled();
});

it('keeps the session empty when login is rejected', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
    Response.json({ message: 'Invalid email or password' }, { status: 401 }),
  );

  await expect(signIn(credentials)).rejects.toMatchObject({ status: 401 });
  expect(sessionStore.getState().accessToken).toBeUndefined();
});
