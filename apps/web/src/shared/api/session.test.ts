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

  await expect(restoreSession()).resolves.toBe('refreshed');
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
  ).resolves.toEqual(['refreshed', 'refreshed', 'refreshed']);

  expect(fetcher).toHaveBeenCalledTimes(1);
});

it.each([
  ['a network error', () => Promise.reject(new TypeError('Failed to fetch'))],
  [
    'a temporary HTTP error',
    () => Promise.resolve(Response.json({ message: 'Service unavailable' }, { status: 503 })),
  ],
])('reports %s during refresh as temporary', async (_, answer) => {
  vi.spyOn(globalThis, 'fetch').mockImplementationOnce(answer);

  await expect(restoreSession()).resolves.toBe('unavailable');

  expect(sessionStore.getState().accessToken).toBeUndefined();
  expect(sessionStore.getState().signedOut).not.toBe(true);
});

it('keeps the token when refresh after a 401 is temporarily unavailable', async () => {
  vi.spyOn(globalThis, 'fetch')
    .mockResolvedValueOnce(Response.json({ accessToken: 'test-access-token' }))
    .mockResolvedValueOnce(Response.json({ message: 'Unauthorized' }, { status: 401 }))
    .mockResolvedValueOnce(Response.json({ message: 'Service unavailable' }, { status: 503 }));

  await signIn(credentials);
  await expect(apiFetch('/api/workspaces')).rejects.toMatchObject({ status: 401 });

  expect(sessionStore.getState().accessToken).toBe('test-access-token');
});

it('does not apply a refresh that finishes after sign-out', async () => {
  let answerRefresh: (response: Response) => void = () => undefined;
  vi.spyOn(globalThis, 'fetch').mockImplementation(
    () =>
      new Promise<Response>((resolve) => {
        answerRefresh = resolve;
      }),
  );

  const restoring = restoreSession();
  signOut();
  answerRefresh(Response.json({ accessToken: 'late-token' }));

  await expect(restoring).resolves.toBe('rejected');
  expect(sessionStore.getState().accessToken).toBeUndefined();
  expect(sessionStore.getState().signedOut).toBe(true);
});

it('does not share a restore promise across session generations', async () => {
  let answerFirstRefresh: (response: Response) => void = () => undefined;
  let refreshCalls = 0;
  vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
    if (input === '/api/auth/login') {
      return Promise.resolve(Response.json({ accessToken: 'new-token' }));
    }
    if (input === '/api/auth/refresh') {
      refreshCalls += 1;
      if (refreshCalls === 1) {
        return new Promise<Response>((resolve) => {
          answerFirstRefresh = resolve;
        });
      }
      return Promise.resolve(Response.json({ accessToken: 'refreshed-token' }));
    }
    return Promise.reject(new Error('Unexpected fetch'));
  });

  const firstRestore = restoreSession();
  await signIn(credentials);
  const secondRestore = restoreSession();
  answerFirstRefresh(Response.json({ accessToken: 'stale-token' }));

  await expect(firstRestore).resolves.toBe('rejected');
  await expect(secondRestore).resolves.toBe('refreshed');
  expect(refreshCalls).toBe(2);
  expect(sessionStore.getState().accessToken).toBe('refreshed-token');
});

it('leaves the session empty when refresh is rejected', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
    Response.json({ message: 'Unauthorized' }, { status: 401 }),
  );

  await expect(restoreSession()).resolves.toBe('rejected');

  expect(sessionStore.getState().accessToken).toBeUndefined();
});

it('does not resurrect the session after an explicit sign-out', async () => {
  signOut();
  const fetcher = vi.spyOn(globalThis, 'fetch');

  await expect(restoreSession()).resolves.toBe('rejected');

  expect(fetcher).not.toHaveBeenCalled();
});

it('keeps the session empty when login is rejected', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
    Response.json({ message: 'Invalid email or password' }, { status: 401 }),
  );

  await expect(signIn(credentials)).rejects.toMatchObject({ status: 401 });
  expect(sessionStore.getState().accessToken).toBeUndefined();
});
