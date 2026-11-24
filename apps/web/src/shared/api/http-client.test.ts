import { afterEach, describe, expect, expectTypeOf, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import {
  getAuthRegisterMutationOptions,
  type useAuthRegister,
  type useHealthReady,
} from './generated/api';
import { server } from '@/shared/api-mocks-node';
import type { AuthRegisterBody } from './generated/models';
import { refreshAccessToken, sessionStore } from './session';
import { ApiError, apiFetch, setAccessTokenProvider, setRefreshHandler } from './http-client';
import { createQueryClient } from './query-client';

afterEach(() => {
  sessionStore.setState({ accessToken: undefined, restoreStatus: 'idle' });
  setAccessTokenProvider(undefined);
  setRefreshHandler(undefined);
  vi.restoreAllMocks();
});

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
      credentials: 'same-origin',
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
    expect(fetcher).toHaveBeenLastCalledWith('/api/health', {
      headers: new Headers(),
      credentials: 'same-origin',
    });

    setAccessTokenProvider(() => 'demo-token');
    await apiFetch('/api/health', { headers: { Authorization: 'Bearer caller' } });
    expect(fetcher).toHaveBeenLastCalledWith('/api/health', {
      headers: new Headers({ Authorization: 'Bearer caller' }),
      credentials: 'same-origin',
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

describe('refresh on 401', () => {
  it('runs one refresh for five parallel 401 requests and retries them with the new token', async () => {
    let refreshCount = 0;
    const attempts = new Map<string, number>();
    const retryAuthorizations: (string | null)[] = [];

    server.use(
      http.get('/api/resource/:id', ({ params, request }) => {
        const id = params.id as string;
        const attempt = (attempts.get(id) ?? 0) + 1;
        attempts.set(id, attempt);
        if (attempt === 1) {
          return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }
        retryAuthorizations.push(request.headers.get('authorization'));
        return HttpResponse.json({ ok: Number(id) });
      }),
      http.post('/api/auth/refresh', () => {
        refreshCount += 1;
        setAccessTokenProvider(() => 'new-token');
        return HttpResponse.json({ accessToken: 'new-token' });
      }),
    );

    setAccessTokenProvider(() => sessionStore.getState().accessToken);
    sessionStore.setState({ accessToken: 'old-token', restoreStatus: 'done' });
    setRefreshHandler(refreshAccessToken);

    const requests = Array.from({ length: 5 }, (_, i) => apiFetch(`/api/resource/${String(i)}`));
    const results = await Promise.all(requests);

    expect(results).toEqual([{ ok: 0 }, { ok: 1 }, { ok: 2 }, { ok: 3 }, { ok: 4 }]);
    expect(refreshCount).toBe(1);
    expect(retryAuthorizations).toHaveLength(5);
    expect(retryAuthorizations.every((h) => h === 'Bearer new-token')).toBe(true);
  });

  it('clears the session when refresh is rejected', async () => {
    const fetcher = vi.spyOn(globalThis, 'fetch');
    fetcher
      .mockResolvedValueOnce(Response.json({ message: 'Unauthorized' }, { status: 401 }))
      .mockResolvedValueOnce(Response.json({ message: 'Unauthorized' }, { status: 401 }));

    let rejected: string | undefined;
    setAccessTokenProvider(
      () => 'old-token',
      (token) => {
        rejected = token;
      },
    );
    setRefreshHandler(async () => {
      await apiFetch('/api/auth/refresh', { method: 'POST' });
      return false;
    });

    await expect(apiFetch('/api/resource')).rejects.toMatchObject({ status: 401 });

    expect(rejected).toBe('old-token');
  });

  it('does not refresh requests sent without a token', async () => {
    const fetcher = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(Response.json({ message: 'Unauthorized' }, { status: 401 }));
    setRefreshHandler(vi.fn().mockResolvedValue(true));

    await expect(apiFetch('/api/resource')).rejects.toMatchObject({ status: 401 });

    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('does not refresh the refresh request itself', async () => {
    const fetcher = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(Response.json({ message: 'Unauthorized' }, { status: 401 }));
    setAccessTokenProvider(() => 'old-token');
    setRefreshHandler(vi.fn().mockResolvedValue(true));

    await expect(apiFetch('/api/auth/refresh', { method: 'POST' })).rejects.toMatchObject({
      status: 401,
    });

    expect(fetcher).toHaveBeenCalledTimes(1);
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
      credentials: 'same-origin',
    });
  });
});
