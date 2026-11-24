import { afterEach, describe, expect, expectTypeOf, it, vi } from 'vitest';
import {
  getAuthRegisterMutationOptions,
  type useAuthRegister,
  type useHealthReady,
} from './generated/api';
import type { AuthRegisterBody } from './generated/models';
import { ApiError, apiFetch, setAccessTokenProvider } from './http-client';
import { createQueryClient } from './query-client';

it('passes a relative URL, caller headers, signal and the provided bearer token to fetch', async () => {
  const fetcher = vi
    .spyOn(globalThis, 'fetch')
    .mockImplementationOnce(() => Promise.resolve(Response.json({ status: 'ok' })));
  const { signal } = new AbortController();
  setAccessTokenProvider(() => 'demo-token');

  try {
    await expect(
      apiFetch('/api/health', { headers: { Accept: 'application/json' }, signal }),
    ).resolves.toEqual({ status: 'ok' });
    expect(fetcher).toHaveBeenCalledExactlyOnceWith('/api/health', {
      headers: new Headers({ Accept: 'application/json', Authorization: 'Bearer demo-token' }),
      signal,
    });
  } finally {
    setAccessTokenProvider(undefined);
    fetcher.mockRestore();
  }
});

it('sends no Authorization header without a token and keeps a caller-supplied one', async () => {
  const fetcher = vi
    .spyOn(globalThis, 'fetch')
    .mockImplementation(() => Promise.resolve(Response.json({ status: 'ok' })));

  try {
    setAccessTokenProvider(() => undefined);
    await apiFetch('/api/health');
    expect(fetcher).toHaveBeenLastCalledWith('/api/health', { headers: new Headers() });

    setAccessTokenProvider(() => 'demo-token');
    await apiFetch('/api/health', { headers: { Authorization: 'Bearer caller' } });
    expect(fetcher).toHaveBeenLastCalledWith('/api/health', {
      headers: new Headers({ Authorization: 'Bearer caller' }),
    });
  } finally {
    setAccessTokenProvider(undefined);
    fetcher.mockRestore();
  }
});

it('preserves status and field issues in a JSON HTTP error', async () => {
  const body = { issues: [{ path: 'body', message: 'Invalid message' }] };
  const fetcher = vi
    .spyOn(globalThis, 'fetch')
    .mockResolvedValueOnce(Response.json(body, { status: 400 }));

  try {
    const request = apiFetch('/api/channels/example/messages');
    await expect(request).rejects.toBeInstanceOf(ApiError);
    await expect(request).rejects.toMatchObject({ status: 400, body });
  } finally {
    fetcher.mockRestore();
  }
});

it('preserves non-JSON upstream errors', async () => {
  const fetcher = vi
    .spyOn(globalThis, 'fetch')
    .mockResolvedValueOnce(new Response('Bad gateway', { status: 502 }));

  try {
    await expect(apiFetch('/api/health')).rejects.toMatchObject({
      status: 502,
      body: 'Bad gateway',
    });
  } finally {
    fetcher.mockRestore();
  }
});

describe('session refresh on 401', () => {
  afterEach(() => {
    setAccessTokenProvider(undefined);
    vi.restoreAllMocks();
  });

  it('runs one refresh for five parallel 401s and retries each request', async () => {
    let token: string | undefined = 'stale-token';
    const refresh = vi.fn(() => {
      token = 'fresh-token';
      return Promise.resolve(true);
    });
    setAccessTokenProvider(() => token, undefined, refresh);
    const fetcher = vi.spyOn(globalThis, 'fetch').mockImplementation((_url, init) => {
      const authorization = new Headers(init?.headers).get('Authorization');
      return Promise.resolve(
        authorization === 'Bearer fresh-token'
          ? Response.json({ ok: true })
          : Response.json({ message: 'Expired' }, { status: 401 }),
      );
    });

    const results = await Promise.all([
      apiFetch('/api/auth/me'),
      apiFetch('/api/workspaces'),
      apiFetch('/api/health'),
      apiFetch('/api/health/ready'),
      apiFetch('/api/channels/example/messages'),
    ]);

    expect(refresh).toHaveBeenCalledTimes(1);
    // Five expired tries, five retries with the fresh token.
    expect(fetcher).toHaveBeenCalledTimes(10);
    for (const result of results) expect(result).toEqual({ ok: true });
    expect(token).toBe('fresh-token');
  });

  it('ends the session through onRejected when refresh fails', async () => {
    let token: string | undefined = 'stale-token';
    const onRejected = vi.fn((rejected: string) => {
      if (rejected === token) token = undefined;
    });
    const refresh = vi.fn(() => Promise.resolve(false));
    setAccessTokenProvider(() => token, onRejected, refresh);
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      Response.json({ message: 'Unauthorized' }, { status: 401 }),
    );

    await expect(apiFetch('/api/auth/me')).rejects.toMatchObject({ status: 401 });

    expect(refresh).toHaveBeenCalledTimes(1);
    expect(onRejected).toHaveBeenCalledWith('stale-token');
    expect(token).toBeUndefined();
  });

  it('reports the new token to onRejected when the retried request is rejected too', async () => {
    let token: string | undefined = 'stale-token';
    const onRejected = vi.fn();
    setAccessTokenProvider(
      () => token,
      onRejected,
      () => {
        token = 'fresh-token';
        return Promise.resolve(true);
      },
    );
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      Response.json({ message: 'Unauthorized' }, { status: 401 }),
    );

    await expect(apiFetch('/api/auth/me')).rejects.toMatchObject({ status: 401 });

    expect(onRejected).toHaveBeenCalledWith('fresh-token');
  });

  it('does not refresh a 401 answered to a request without the provider token', async () => {
    const refresh = vi.fn(() => Promise.resolve(true));
    setAccessTokenProvider(() => 'demo-token', undefined, refresh);
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      Response.json({ message: 'Unauthorized' }, { status: 401 }),
    );

    await expect(
      apiFetch('/api/auth/me', { headers: { Authorization: 'Bearer caller' } }),
    ).rejects.toMatchObject({ status: 401 });

    expect(refresh).not.toHaveBeenCalled();
  });
});

describe('generated registration mutation', () => {
  const data: AuthRegisterBody = {
    name: 'Ada',
    email: 'ada@example.com',
    password: 'test-password',
    confirmPassword: 'test-password',
  };

  function mutation(request?: Parameters<typeof apiFetch>[1]) {
    const { mutationFn } = getAuthRegisterMutationOptions({ request });
    if (!mutationFn) throw new Error('Expected a generated mutation function');
    return mutationFn({ data }, { client: createQueryClient(), meta: undefined });
  }

  afterEach(() => vi.restoreAllMocks());

  it('keeps hook errors unknown until the caller narrows them', () => {
    expectTypeOf<ReturnType<typeof useAuthRegister>['error']>().toBeUnknown();
    expectTypeOf<ReturnType<typeof useHealthReady>['error']>().toBeUnknown();
  });

  it('rejects with ApiError and preserves the HTTP status and body', async () => {
    const body = { statusCode: 400, message: 'Invalid registration', issues: [] };
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(Response.json(body, { status: 400 }));

    const pending = mutation();
    await expect(pending).rejects.toBeInstanceOf(ApiError);
    await expect(pending).rejects.toMatchObject({ status: 400, body });
  });

  it.each([
    ['a network error', new TypeError('Failed to fetch')],
    ['an AbortError', new DOMException('The operation was aborted', 'AbortError')],
    ['a custom abort reason', 'cancelled by caller'],
  ])('preserves %s', async (_, error) => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(error);

    await expect(mutation()).rejects.toBe(error);
  });

  const headerCases: { name: string; headers: HeadersInit; contentType: string }[] = [
    {
      name: 'Headers',
      headers: new Headers({ 'content-type': 'application/json', 'x-request-id': 'caller' }),
      contentType: 'application/json',
    },
    {
      name: 'record',
      headers: { 'cOnTeNt-TyPe': 'application/json; charset=utf-8', 'X-Request-Id': 'caller' },
      contentType: 'application/json; charset=utf-8',
    },
    {
      name: 'entries',
      headers: [
        ['content-type', 'application/json; charset=utf-8'],
        ['x-request-id', 'caller'],
      ],
      contentType: 'application/json; charset=utf-8',
    },
  ];

  it.each(headerCases)('keeps one Content-Type with $name', async ({ headers, contentType }) => {
    const fetcher = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(Response.json({ id: '1' }));

    await mutation({ headers });

    expect(fetcher).toHaveBeenCalledExactlyOnceWith('/api/auth/register', {
      method: 'POST',
      headers: new Headers({ 'content-type': contentType, 'x-request-id': 'caller' }),
      body: JSON.stringify(data),
    });
  });
});
