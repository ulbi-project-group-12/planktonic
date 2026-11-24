import { afterEach, expect, it, vi } from 'vitest';
import { authMe } from './generated/api';
import { apiFetch, setAccessTokenProvider, setRefreshHandler } from './http-client';
import { refreshAccessToken, restoreSession, sessionStore, signIn, signOut } from './session';
import { bumpSessionGeneration } from './session-generation';

const credentials = { email: 'ada@example.com', password: 'example-passphrase' };

afterEach(() => {
  sessionStore.setState({ accessToken: undefined, restoreStatus: 'idle' });
  setAccessTokenProvider(undefined);
  setRefreshHandler(undefined);
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

it('ends the session when any request with the token gets 401 and refresh is rejected', async () => {
  vi.spyOn(globalThis, 'fetch')
    .mockResolvedValueOnce(Response.json({ accessToken: 'test-access-token' }))
    .mockResolvedValueOnce(Response.json({ message: 'Unauthorized' }, { status: 401 }))
    .mockResolvedValueOnce(Response.json({ message: 'Unauthorized' }, { status: 401 }));

  await signIn(credentials);
  await expect(apiFetch('/api/workspaces')).rejects.toMatchObject({ status: 401 });

  expect(sessionStore.getState().accessToken).toBeUndefined();
});

it('ends the session on 401 even when the response body cannot be read and refresh is rejected', async () => {
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
  await expect(apiFetch('/api/workspaces')).rejects.toMatchObject({ status: 401 });

  expect(sessionStore.getState().accessToken).toBeUndefined();
});

it('keeps a newer session when a request sent with an older token gets 401 and refresh is rejected', async () => {
  let answerOld: (response: Response) => void = () => undefined;
  vi.spyOn(globalThis, 'fetch')
    .mockResolvedValueOnce(Response.json({ accessToken: 'old-token' }))
    .mockReturnValueOnce(
      new Promise<Response>((resolve) => {
        answerOld = resolve;
      }),
    )
    .mockResolvedValueOnce(Response.json({ message: 'Unauthorized' }, { status: 401 }));

  await signIn(credentials);
  const late = apiFetch('/api/workspaces');
  // A concurrent sign-in replaced the token before the late answer arrived.
  setAccessTokenProvider(() => 'new-token');
  bumpSessionGeneration();
  sessionStore.setState({ accessToken: 'new-token', restoreStatus: 'done' });
  answerOld(Response.json({ message: 'Unauthorized' }, { status: 401 }));
  await expect(late).rejects.toMatchObject({ status: 401 });

  expect(sessionStore.getState().accessToken).toBe('new-token');
});

it('keeps the session empty when login is rejected', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
    Response.json({ message: 'Invalid email or password' }, { status: 401 }),
  );

  await expect(signIn(credentials)).rejects.toMatchObject({ status: 401 });
  expect(sessionStore.getState().accessToken).toBeUndefined();
});

it('restoreSession saves the token on 200', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
    Response.json({ accessToken: 'restored-token' }),
  );

  await restoreSession();

  expect(sessionStore.getState().accessToken).toBe('restored-token');
  expect(sessionStore.getState().restoreStatus).toBe('done');
});

it('restoreSession leaves a guest on 401', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
    Response.json({ message: 'Unauthorized' }, { status: 401 }),
  );

  await restoreSession();

  expect(sessionStore.getState().accessToken).toBeUndefined();
  expect(sessionStore.getState().restoreStatus).toBe('done');
});

it('restoreSession does not make a second request', async () => {
  const fetcher = vi
    .spyOn(globalThis, 'fetch')
    .mockResolvedValueOnce(Response.json({ accessToken: 'restored-token' }));

  void restoreSession();
  await restoreSession();

  expect(fetcher).toHaveBeenCalledTimes(1);
});

it('refreshAccessToken shares one inflight promise across parallel callers', async () => {
  const fetcher = vi
    .spyOn(globalThis, 'fetch')
    .mockResolvedValueOnce(Response.json({ accessToken: 'refreshed-token' }));

  const [first, second] = await Promise.all([refreshAccessToken(), refreshAccessToken()]);

  expect(first).toBe(true);
  expect(second).toBe(true);
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(sessionStore.getState().accessToken).toBe('refreshed-token');
});

it('does not overwrite a newer session with a stale refresh answer', async () => {
  let answerRefresh: (response: Response) => void = () => undefined;
  vi.spyOn(globalThis, 'fetch')
    .mockResolvedValueOnce(Response.json({ accessToken: 'old-token' }))
    .mockReturnValueOnce(
      new Promise<Response>((resolve) => {
        answerRefresh = resolve;
      }),
    )
    .mockResolvedValueOnce(Response.json({ accessToken: 'new-token' }));

  await signIn(credentials);
  sessionStore.setState({ restoreStatus: 'idle' });
  const late = restoreSession();
  // A new sign-in replaces the session while the stale refresh is in flight.
  await signIn({ email: 'new@example.com', password: 'new-password' });
  answerRefresh(Response.json({ accessToken: 'stale-refreshed-token' }));
  await late;

  expect(sessionStore.getState().accessToken).toBe('new-token');
});

it('keeps a newer refresh promise when an older refresh finishes', async () => {
  let answerOld: (response: Response) => void = () => undefined;
  let answerNew: (response: Response) => void = () => undefined;
  vi.spyOn(globalThis, 'fetch')
    .mockResolvedValueOnce(Response.json({ accessToken: 'old-token' }))
    .mockReturnValueOnce(
      new Promise<Response>((resolve) => {
        answerOld = resolve;
      }),
    )
    .mockReturnValueOnce(
      new Promise<Response>((resolve) => {
        answerNew = resolve;
      }),
    );

  await signIn(credentials);
  const oldRefresh = refreshAccessToken();
  bumpSessionGeneration();
  const newRefresh = refreshAccessToken();

  answerOld(Response.json({ accessToken: 'old-refreshed-token' }));
  await oldRefresh;

  answerNew(Response.json({ accessToken: 'new-refreshed-token' }));
  await newRefresh;

  expect(sessionStore.getState().accessToken).toBe('new-refreshed-token');
});
