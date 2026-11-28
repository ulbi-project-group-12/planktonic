import { afterEach, expect, it, vi } from 'vitest';
import { authMe } from './generated/api';
import { apiFetch, setAccessTokenProvider, setRefreshHandler } from './http-client';
import {
  clearSignedOutFlag,
  refreshAccessToken,
  restoreSession,
  SIGNED_OUT_FLAG_KEY,
  sessionStore,
  signIn,
  signOut,
} from './session';
import { bumpSessionGeneration } from './session-generation';

const credentials = { email: 'ada@example.com', password: 'example-passphrase' };

afterEach(() => {
  sessionStore.setState({ accessToken: undefined, restoreStatus: 'idle', signedOut: false });
  setAccessTokenProvider(undefined);
  setRefreshHandler(undefined);
  clearSignedOutFlag();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
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
    .mockResolvedValueOnce(Response.json({}))
    .mockResolvedValueOnce(Response.json({ message: 'Unauthorized' }, { status: 401 }));

  await signIn(credentials);
  await signOut();
  await expect(authMe()).rejects.toMatchObject({ status: 401 });

  expect(sessionStore.getState().accessToken).toBeUndefined();
  expect(new Headers(fetcher.mock.calls[2]?.[1]?.headers).has('Authorization')).toBe(false);
});

it('does not refresh on either of two reloads after a failed logout', async () => {
  const fetcher = vi
    .spyOn(globalThis, 'fetch')
    .mockResolvedValueOnce(Response.json({ accessToken: 'old-token' }))
    .mockRejectedValueOnce(new TypeError('Network error'))
    .mockResolvedValueOnce(Response.json({ accessToken: 'restored-token' }));

  await signIn(credentials);
  await signOut();

  // Each reload resets the in-memory store and preserves localStorage.
  for (let reload = 0; reload < 2; reload++) {
    sessionStore.setState({ accessToken: undefined, restoreStatus: 'idle', signedOut: undefined });
    await restoreSession();

    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(sessionStore.getState()).toMatchObject({
      accessToken: undefined,
      restoreStatus: 'done',
    });
    // Only the sign-out button drops the return address; a later visit keeps it.
    expect(sessionStore.getState().signedOut).toBeUndefined();
  }
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

it('keeps the token after a refresh network error and refreshes on the next request', async () => {
  vi.spyOn(globalThis, 'fetch')
    .mockResolvedValueOnce(Response.json({ accessToken: 'old-token' }))
    .mockResolvedValueOnce(new Response(null, { status: 401 }))
    .mockRejectedValueOnce(new TypeError('Failed to fetch'))
    .mockResolvedValueOnce(new Response(null, { status: 401 }))
    .mockResolvedValueOnce(Response.json({ accessToken: 'new-token' }))
    .mockResolvedValueOnce(Response.json({ ok: true }));

  await signIn(credentials);

  await expect(apiFetch('/api/workspaces')).rejects.toMatchObject({ status: 401 });
  expect(sessionStore.getState().accessToken).toBe('old-token');

  await expect(apiFetch('/api/workspaces')).resolves.toEqual({ ok: true });
  expect(sessionStore.getState().accessToken).toBe('new-token');
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

it('finishes restoring when a sign-in during refresh is rejected', async () => {
  const refresh = Promise.withResolvers<Response>();
  const fetcher = vi
    .spyOn(globalThis, 'fetch')
    .mockReturnValueOnce(refresh.promise)
    .mockResolvedValueOnce(Response.json({ message: 'Invalid credentials' }, { status: 401 }));

  const restoring = restoreSession();
  const signingIn = signIn(credentials);
  refresh.resolve(Response.json({ accessToken: 'stale-token' }));

  await restoring;
  await expect(signingIn).rejects.toMatchObject({ status: 401 });
  expect(fetcher).toHaveBeenCalledTimes(2);
  expect(sessionStore.getState()).toMatchObject({
    accessToken: undefined,
    restoreStatus: 'done',
  });
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

it.each([404, 405])(
  'restoreSession leaves a guest when the api has no refresh endpoint (%i)',
  async (status) => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      Response.json({ statusCode: status, message: 'Cannot POST /api/auth/refresh' }, { status }),
    );

    await restoreSession();

    expect(sessionStore.getState().accessToken).toBeUndefined();
    expect(sessionStore.getState().restoreStatus).toBe('done');
  },
);

it('restoreSession leaves a guest on 404 even when the response body cannot be read', async () => {
  const broken = new Response(
    new ReadableStream({
      start(controller) {
        controller.error(new TypeError('connection lost'));
      },
    }),
    { status: 404 },
  );
  vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(broken);

  await restoreSession();

  expect(sessionStore.getState().restoreStatus).toBe('done');
});

it('restoreSession keeps the retry state on a temporary failure', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response(null, { status: 503 }));

  await restoreSession();

  expect(sessionStore.getState().restoreStatus).toBe('error');
});

it('ends the session on 401 when the api has no refresh endpoint', async () => {
  vi.spyOn(globalThis, 'fetch')
    .mockResolvedValueOnce(Response.json({ accessToken: 'test-access-token' }))
    .mockResolvedValueOnce(Response.json({ message: 'Unauthorized' }, { status: 401 }))
    .mockResolvedValueOnce(Response.json({ message: 'Not Found' }, { status: 404 }));

  await signIn(credentials);
  await expect(apiFetch('/api/workspaces')).rejects.toMatchObject({
    status: 401,
    body: { message: 'Unauthorized' },
  });

  expect(sessionStore.getState().accessToken).toBeUndefined();
});

it('restoreSession does not make a second request', async () => {
  const fetcher = vi
    .spyOn(globalThis, 'fetch')
    .mockResolvedValueOnce(Response.json({ accessToken: 'restored-token' }));

  void restoreSession();
  await restoreSession();

  expect(fetcher).toHaveBeenCalledTimes(1);
});

it('ignores a pending restore after sign-out and does not start another restore', async () => {
  const { promise, resolve } = Promise.withResolvers<Response>();
  const fetcher = vi
    .spyOn(globalThis, 'fetch')
    .mockReturnValueOnce(promise)
    .mockResolvedValueOnce(Response.json({}));

  const pendingRestore = restoreSession();
  const signingOut = signOut();
  resolve(Response.json({ accessToken: 'old-session-token' }));
  await signingOut;
  await pendingRestore;
  await restoreSession();

  expect(fetcher).toHaveBeenCalledTimes(2);
  expect(fetcher).toHaveBeenNthCalledWith(
    2,
    '/api/auth/logout',
    expect.objectContaining({ method: 'POST', credentials: 'same-origin' }),
  );
  expect(sessionStore.getState()).toMatchObject({
    accessToken: undefined,
    restoreStatus: 'done',
    signedOut: true,
  });
});

it('discards a refresh started during sign-out and stays signed out until sign-in', async () => {
  const logout = Promise.withResolvers<Response>();
  const refresh = Promise.withResolvers<Response>();
  const fetcher = vi
    .spyOn(globalThis, 'fetch')
    .mockResolvedValueOnce(Response.json({ accessToken: 'old-token' }))
    .mockReturnValueOnce(logout.promise)
    .mockReturnValueOnce(refresh.promise)
    .mockResolvedValueOnce(Response.json({ accessToken: 'new-token' }));

  await signIn(credentials);
  const signingOut = signOut();
  const refreshing = refreshAccessToken();
  logout.resolve(Response.json({}));
  await signingOut;

  refresh.resolve(Response.json({ accessToken: 'stale-token' }));
  await expect(refreshing).resolves.toBe('unavailable');
  // SessionGate consumes the flag used for navigation.
  sessionStore.setState({ signedOut: false });
  await expect(refreshAccessToken()).resolves.toBe('unavailable');
  expect(fetcher).toHaveBeenCalledTimes(3);
  expect(sessionStore.getState().accessToken).toBeUndefined();

  await signIn(credentials);
  expect(sessionStore.getState().accessToken).toBe('new-token');
});

it('cancels a queued sign-in when sign-out happens first', async () => {
  const refresh = Promise.withResolvers<Response>();
  const fetcher = vi
    .spyOn(globalThis, 'fetch')
    .mockReturnValueOnce(refresh.promise)
    .mockResolvedValueOnce(Response.json({}));

  const restoring = restoreSession();
  const signingIn = signIn(credentials);
  const signingOut = signOut();
  expect(fetcher).toHaveBeenCalledTimes(1);

  refresh.resolve(Response.json({ accessToken: 'stale-token' }));
  await restoring;
  await signingIn;
  await signingOut;

  expect(fetcher).toHaveBeenCalledTimes(2);
  expect(fetcher).toHaveBeenNthCalledWith(
    2,
    '/api/auth/logout',
    expect.objectContaining({ method: 'POST' }),
  );
  expect(sessionStore.getState()).toMatchObject({
    accessToken: undefined,
    restoreStatus: 'done',
    signedOut: true,
  });
});

it('logs out the session created by an in-flight sign-in when sign-out happens first', async () => {
  const login = Promise.withResolvers<Response>();
  const fetcher = vi
    .spyOn(globalThis, 'fetch')
    .mockReturnValueOnce(login.promise)
    .mockResolvedValueOnce(Response.json({}));

  const signingIn = signIn(credentials);
  const signingOut = signOut();
  expect(fetcher).toHaveBeenCalledTimes(1);

  login.resolve(Response.json({ accessToken: 'cancelled-login-token' }));
  await signingIn;
  await signingOut;

  expect(fetcher).toHaveBeenCalledTimes(2);
  expect(fetcher).toHaveBeenNthCalledWith(
    2,
    '/api/auth/logout',
    expect.objectContaining({ method: 'POST' }),
  );
  expect(localStorage.getItem(SIGNED_OUT_FLAG_KEY)).not.toBeNull();
  expect(sessionStore.getState()).toMatchObject({
    accessToken: undefined,
    restoreStatus: 'done',
    signedOut: true,
  });
});

it('keeps a new sign-in when an older logout completes', async () => {
  const logout = Promise.withResolvers<Response>();
  const fetcher = vi
    .spyOn(globalThis, 'fetch')
    .mockResolvedValueOnce(Response.json({ accessToken: 'old-token' }))
    .mockReturnValueOnce(logout.promise)
    .mockResolvedValueOnce(Response.json({ accessToken: 'new-token' }));

  await signIn(credentials);
  const signingOut = signOut();
  expect(localStorage.getItem(SIGNED_OUT_FLAG_KEY)).not.toBeNull();
  const signingIn = signIn(credentials);
  expect(fetcher).toHaveBeenCalledTimes(2);
  logout.resolve(Response.json({}));
  await signingOut;
  await signingIn;

  expect(localStorage.getItem(SIGNED_OUT_FLAG_KEY)).toBeNull();
  expect(sessionStore.getState()).toMatchObject({
    accessToken: 'new-token',
    restoreStatus: 'done',
    signedOut: false,
  });
});

it('rejects a request started before a successful sign-in instead of retrying it', async () => {
  const oldRequest = Promise.withResolvers<Response>();
  const newLogin = Promise.withResolvers<Response>();
  const fetcher = vi
    .spyOn(globalThis, 'fetch')
    .mockResolvedValueOnce(Response.json({ accessToken: 'old-token' }))
    .mockReturnValueOnce(oldRequest.promise)
    .mockReturnValueOnce(newLogin.promise);

  await signIn(credentials);
  const lateRequest = apiFetch('/api/workspaces');
  const signingIn = signIn({ email: 'new@example.com', password: 'new-password' });
  newLogin.resolve(Response.json({ accessToken: 'new-token' }));
  await signingIn;

  oldRequest.resolve(Response.json({ message: 'Unauthorized' }, { status: 401 }));
  await expect(lateRequest).rejects.toMatchObject({ status: 401 });

  expect(fetcher).toHaveBeenCalledTimes(3);
  expect(sessionStore.getState().accessToken).toBe('new-token');
});

it('keeps a newer cross-tab sign-out flag when an older login succeeds', async () => {
  const login = Promise.withResolvers<Response>();
  vi.spyOn(globalThis, 'fetch').mockReturnValueOnce(login.promise);

  const signingIn = signIn(credentials);
  localStorage.setItem(SIGNED_OUT_FLAG_KEY, 'another-tab-sign-out');
  login.resolve(Response.json({ accessToken: 'stale-token' }));
  await signingIn;

  expect(localStorage.getItem(SIGNED_OUT_FLAG_KEY)).toBe('another-tab-sign-out');
  expect(sessionStore.getState()).toMatchObject({
    accessToken: undefined,
    restoreStatus: 'done',
    signedOut: true,
  });
});

it('finishes a queued sign-in as signed out after a cross-tab sign-out', async () => {
  const refresh = Promise.withResolvers<Response>();
  const fetcher = vi.spyOn(globalThis, 'fetch').mockReturnValueOnce(refresh.promise);

  const restoring = restoreSession();
  const signingIn = signIn(credentials);
  localStorage.setItem(SIGNED_OUT_FLAG_KEY, 'another-tab-sign-out');
  refresh.resolve(Response.json({ accessToken: 'stale-token' }));

  await restoring;
  await signingIn;

  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(sessionStore.getState()).toMatchObject({
    accessToken: undefined,
    restoreStatus: 'done',
    signedOut: true,
  });
});

it('clears an old session when login fails after a newer sign-out', async () => {
  const firstLogin = Promise.withResolvers<Response>();
  const secondLogin = Promise.withResolvers<Response>();
  const fetcher = vi
    .spyOn(globalThis, 'fetch')
    .mockReturnValueOnce(firstLogin.promise)
    .mockResolvedValueOnce(Response.json({}))
    .mockReturnValueOnce(secondLogin.promise);
  sessionStore.setState({ accessToken: 'old-token', restoreStatus: 'done', signedOut: false });

  const firstSignIn = signIn(credentials);
  const signingOut = signOut();
  const secondSignIn = signIn({ email: 'new@example.com', password: 'new-password' });
  firstLogin.resolve(Response.json({ message: 'Unauthorized' }, { status: 401 }));

  await expect(firstSignIn).rejects.toMatchObject({ status: 401 });
  await signingOut;
  await vi.waitFor(() => {
    expect(fetcher).toHaveBeenCalledTimes(3);
  });
  expect(sessionStore.getState()).toMatchObject({
    accessToken: undefined,
    restoreStatus: 'done',
    signedOut: true,
  });

  secondLogin.resolve(Response.json({ accessToken: 'new-token' }));
  await secondSignIn;
  expect(sessionStore.getState()).toMatchObject({
    accessToken: 'new-token',
    restoreStatus: 'done',
    signedOut: false,
  });
});

it('keeps a failed repeated sign-in from clearing an existing session', async () => {
  const firstLogin = Promise.withResolvers<Response>();
  vi.spyOn(globalThis, 'fetch')
    .mockResolvedValueOnce(Response.json({ accessToken: 'old-token' }))
    .mockReturnValueOnce(firstLogin.promise);

  await signIn(credentials);
  const repeatedSignIn = signIn({ email: 'new@example.com', password: 'wrong-password' });
  firstLogin.resolve(Response.json({ message: 'Unauthorized' }, { status: 401 }));

  await expect(repeatedSignIn).rejects.toMatchObject({ status: 401 });
  expect(sessionStore.getState()).toMatchObject({
    accessToken: 'old-token',
    restoreStatus: 'done',
    signedOut: false,
  });
});

it('aborts an unanswered logout and clears the local session', async () => {
  vi.useFakeTimers();
  sessionStore.setState({ accessToken: 'old-token', restoreStatus: 'done' });
  const fetcher = vi.spyOn(globalThis, 'fetch').mockImplementation(
    (_url, options) =>
      new Promise<Response>((_resolve, reject) => {
        options?.signal?.addEventListener('abort', () => {
          reject(new DOMException('', 'AbortError'));
        });
      }),
  );

  const signingOut = signOut();
  await vi.advanceTimersByTimeAsync(5_000);
  await signingOut;

  expect(fetcher.mock.calls[0]?.[1]?.signal?.aborted).toBe(true);
  expect(sessionStore.getState()).toMatchObject({
    accessToken: undefined,
    restoreStatus: 'done',
    signedOut: true,
  });
});

it('clears the local session on timeout while refresh holds the session lock', async () => {
  vi.useFakeTimers();
  const refresh = Promise.withResolvers<Response>();
  const fetcher = vi
    .spyOn(globalThis, 'fetch')
    .mockReturnValueOnce(refresh.promise)
    .mockResolvedValueOnce(Response.json({}));
  sessionStore.setState({ accessToken: 'old-token', restoreStatus: 'done' });

  const refreshing = refreshAccessToken();
  const signingOut = signOut();
  expect(fetcher).toHaveBeenCalledTimes(1);

  await vi.advanceTimersByTimeAsync(5_000);
  await signingOut;
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(sessionStore.getState()).toMatchObject({
    accessToken: undefined,
    restoreStatus: 'done',
    signedOut: true,
  });

  refresh.resolve(Response.json({ accessToken: 'stale-token' }));
  await expect(refreshing).resolves.toBe('unavailable');
  await vi.advanceTimersByTimeAsync(0);
  expect(fetcher).toHaveBeenCalledTimes(2);
});

it('refreshAccessToken shares one inflight promise across parallel callers', async () => {
  const fetcher = vi
    .spyOn(globalThis, 'fetch')
    .mockResolvedValueOnce(Response.json({ accessToken: 'refreshed-token' }));

  const [first, second] = await Promise.all([refreshAccessToken(), refreshAccessToken()]);

  expect(first).toBe('refreshed');
  expect(second).toBe('refreshed');
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(sessionStore.getState().accessToken).toBe('refreshed-token');
});

it.each([200, 401])('orders a %i refresh response before a newer sign-in', async (status) => {
  let answerRefresh: (response: Response) => void = () => undefined;
  const fetcher = vi
    .spyOn(globalThis, 'fetch')
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
  const signingIn = signIn({ email: 'new@example.com', password: 'new-password' });
  expect(fetcher).toHaveBeenCalledTimes(2);

  answerRefresh(
    Response.json(
      status === 200 ? { accessToken: 'stale-refreshed-token' } : { message: 'Unauthorized' },
      { status },
    ),
  );
  await late;
  await signingIn;

  expect(fetcher).toHaveBeenCalledTimes(3);
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

it('uses the same cross-tab lock for signIn and refresh', async () => {
  const request = vi.fn((_name: string, operation: () => Promise<unknown>) => operation());
  vi.stubGlobal('navigator', { locks: { request } });
  vi.spyOn(globalThis, 'fetch')
    .mockResolvedValueOnce(Response.json({ accessToken: 'signed-in-token' }))
    .mockResolvedValueOnce(Response.json({ accessToken: 'refreshed-token' }));

  await signIn(credentials);
  await refreshAccessToken();

  expect(request).toHaveBeenCalledTimes(2);
  expect(request.mock.calls[0]?.[0]).toBe(request.mock.calls[1]?.[0]);
});
