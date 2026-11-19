import { ClientMsgId, type CreateMessageBody, type MessageResponse } from '@app/contracts';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PROTOTYPE_CHANNEL_ID } from '../model/feed';
import { PrototypePage } from './prototype-page';

type Handler = (...args: unknown[]) => void;

const { fake, calls, connectSnapshot } = vi.hoisted(() => {
  const calls: string[] = [];
  /** listenerCount('message:new') at the moment connect() was called. */
  const connectSnapshot: { messageNew: number | null } = { messageNew: null };
  const handlers = new Map<string, Set<Handler>>();
  const fake = {
    connected: false,
    active: false,
    on(event: string, fn: Handler) {
      let set = handlers.get(event);
      if (!set) {
        set = new Set();
        handlers.set(event, set);
      }
      set.add(fn);
      return fake;
    },
    off(event: string, fn: Handler) {
      handlers.get(event)?.delete(fn);
      return fake;
    },
    listenerCount(event: string) {
      return handlers.get(event)?.size ?? 0;
    },
    connect: vi.fn(),
    disconnect: vi.fn(),
    fire(event: string, ...args: unknown[]) {
      for (const fn of [...(handlers.get(event) ?? [])]) fn(...args);
    },
    reset() {
      handlers.clear();
      fake.connected = false;
      fake.active = false;
    },
  };
  return { fake, calls, connectSnapshot };
});

vi.mock('@/shared/api', () => ({ getSocket: () => fake }));

const MESSAGES_URL = `/api/channels/${PROTOTYPE_CHANNEL_ID}/messages`;
const SOCKET_EVENTS = ['connect', 'disconnect', 'connect_error', 'message:new'];

function msg(seq: number, body: string): MessageResponse {
  const tag = seq.toString(16).padStart(12, '0');
  return {
    id: `01900000-0000-7000-8000-${tag}`,
    seq: String(seq),
    channelId: PROTOTYPE_CHANNEL_ID,
    authorId: '00000000-0000-7000-8000-0000000000aa',
    clientMsgId: `01900000-0000-7000-9000-${tag}`,
    body,
    createdAt: '2026-11-18T12:00:00.000Z',
  };
}

let history: MessageResponse[] = [];
/** Answers each POST; the test sets it. */
let postResponder: (payload: CreateMessageBody) => Promise<Response>;
const posted: CreateMessageBody[] = [];

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  const method = init?.method ?? 'GET';
  calls.push(`${method} ${url}`);
  if (method === 'GET' && url === '/api/health') {
    return Promise.resolve(json({ status: 'ok', instanceId: 'api-test-1' }));
  }
  if (method === 'GET' && url === MESSAGES_URL) {
    return Promise.resolve(json({ messages: history }));
  }
  if (method === 'POST' && url === MESSAGES_URL) {
    const raw = init?.body;
    if (typeof raw !== 'string') throw new Error('POST body is not a JSON string');
    const payload = JSON.parse(raw) as CreateMessageBody;
    posted.push(payload);
    return postResponder(payload);
  }
  return Promise.resolve(json({ message: 'not found' }, 404));
});

function renderPage() {
  return render(
    <StrictMode>
      <PrototypePage />
    </StrictMode>,
  );
}

function rows(): string[] {
  const list = screen.getByRole('list', { name: 'Messages' });
  return within(list)
    .queryAllByRole('listitem')
    .map((item) => item.textContent);
}

function serverConnects() {
  act(() => {
    fake.connected = true;
    fake.fire('connect');
  });
}

beforeEach(() => {
  fake.reset();
  calls.length = 0;
  history = [];
  posted.length = 0;
  postResponder = () => Promise.resolve(json({ message: 'unexpected POST' }, 500));
  connectSnapshot.messageNew = null;
  fake.connect.mockReset();
  fake.connect.mockImplementation(() => {
    fake.active = true;
    connectSnapshot.messageNew = fake.listenerCount('message:new');
    calls.push('connect');
  });
  fake.disconnect.mockReset();
  fetchMock.mockClear();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

/** Renders, waits for the instance and lets the server accept the socket. */
async function renderConnected() {
  const view = renderPage();
  await screen.findByText('Instance: api-test-1');
  serverConnects();
  await waitFor(() => {
    expect(calls).toContain(`GET ${MESSAGES_URL}`);
  });
  return view;
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

describe('PrototypePage', () => {
  it('loads the instance id first and connects the socket once, after it', async () => {
    renderPage();
    expect(await screen.findByText('Instance: api-test-1')).toBeInTheDocument();
    expect(fake.connect).toHaveBeenCalledTimes(1);
    const lastHealth = calls.lastIndexOf('GET /api/health');
    expect(lastHealth).toBeGreaterThanOrEqual(0);
    expect(lastHealth).toBeLessThan(calls.indexOf('connect'));
    expect(screen.getByText('Socket: connecting')).toBeInTheDocument();
  });

  it('loads the history on connect and renders it in seq order', async () => {
    history = [msg(2, 'second'), msg(1, 'first')];
    renderPage();
    await screen.findByText('Instance: api-test-1');
    serverConnects();
    expect(await screen.findByText('#2 second')).toBeInTheDocument();
    expect(rows()).toEqual(['#1 first', '#2 second']);
    expect(screen.getByText('Socket: connected')).toBeInTheDocument();
  });

  it('loads the history without connect() when the singleton is already connected', async () => {
    fake.connected = true;
    history = [msg(1, 'first')];
    renderPage();
    expect(await screen.findByText('#1 first')).toBeInTheDocument();
    expect(fake.connect).not.toHaveBeenCalled();
    expect(screen.getByText('Socket: connected')).toBeInTheDocument();
  });

  it('keeps one listener per event under StrictMode and removes them on unmount', async () => {
    const { unmount } = renderPage();
    await screen.findByText('Instance: api-test-1');
    for (const event of SOCKET_EVENTS) expect(fake.listenerCount(event)).toBe(1);
    unmount();
    for (const event of SOCKET_EVENTS) expect(fake.listenerCount(event)).toBe(0);
    expect(fake.disconnect).not.toHaveBeenCalled();
  });

  it('registers the message:new listener before connect()', async () => {
    renderPage();
    await screen.findByText('Instance: api-test-1');
    expect(connectSnapshot.messageNew).toBe(1);
  });

  it('adds live messages for the channel and drops other channels and invalid payloads', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    await renderConnected();
    act(() => {
      fake.fire('message:new', { message: msg(1, 'live') });
    });
    expect(rows()).toEqual(['#1 live']);

    act(() => {
      fake.fire('message:new', {
        message: { ...msg(2, 'elsewhere'), channelId: '00000000-0000-7000-8000-000000000002' },
      });
      fake.fire('message:new', { message: { ...msg(3, 'broken'), seq: 3 } });
    });
    expect(rows()).toEqual(['#1 live']);
    expect(warn).toHaveBeenCalledWith(
      'prototype: ignoring invalid message:new payload',
      expect.anything(),
    );
  });

  it('shows its own message once when message:new arrives before the 201', async () => {
    history = [msg(1, 'first'), msg(2, 'second')];
    const response = deferred<Response>();
    postResponder = () => response.promise;
    await renderConnected();
    await screen.findByText('#2 second');

    const user = userEvent.setup();
    await user.type(screen.getByLabelText('Message'), 'hello');
    await user.click(screen.getByRole('button', { name: 'Send' }));
    await waitFor(() => {
      expect(posted).toHaveLength(1);
    });
    const [payload] = posted;
    expect(payload?.body).toBe('hello');
    expect(ClientMsgId.safeParse(payload?.clientMsgId).success).toBe(true);
    expect(Object.keys(payload ?? {}).sort()).toEqual(['body', 'clientMsgId']);

    const own = { ...msg(3, 'hello'), clientMsgId: payload?.clientMsgId ?? '' };
    act(() => {
      fake.fire('message:new', { message: own });
    });
    await act(async () => {
      response.resolve(json(own, 201));
      await response.promise;
    });

    await waitFor(() => {
      expect(screen.getByLabelText('Message')).toHaveValue('');
    });
    expect(rows()).toEqual(['#1 first', '#2 second', '#3 hello']);
  });

  it('keeps the draft and its key after a failed send and reuses the key on resend', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    postResponder = () => Promise.resolve(json({ message: 'boom' }, 500));
    await renderConnected();

    const user = userEvent.setup();
    await user.type(screen.getByLabelText('Message'), 'hello');
    await user.click(screen.getByRole('button', { name: 'Send' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Not sent. Press Send to try again.',
    );
    expect(screen.getByLabelText('Message')).toHaveValue('hello');

    await user.click(screen.getByRole('button', { name: 'Send' }));
    await waitFor(() => {
      expect(posted).toHaveLength(2);
    });
    expect(posted[1]?.clientMsgId).toBe(posted[0]?.clientMsgId);
  });

  it('disables Send for a blank draft and while a send is in flight', async () => {
    const response = deferred<Response>();
    postResponder = () => response.promise;
    await renderConnected();
    const user = userEvent.setup();
    const send = screen.getByRole('button', { name: 'Send' });
    const input = screen.getByLabelText('Message');

    expect(send).toBeDisabled();
    await user.type(input, '   ');
    expect(send).toBeDisabled();
    await user.clear(input);
    await user.type(input, 'hello');
    expect(send).toBeEnabled();

    await user.click(send);
    expect(send).toBeDisabled();
    await act(async () => {
      response.resolve(json(msg(1, 'hello'), 201));
      await response.promise;
    });
    await waitFor(() => {
      expect(input).toHaveValue('');
    });
    expect(posted).toHaveLength(1);
  });

  it('tracks disconnects and catches up on reconnect without duplicates', async () => {
    history = [msg(1, 'first')];
    await renderConnected();
    await screen.findByText('#1 first');

    act(() => {
      fake.connected = false;
      fake.active = true;
      fake.fire('disconnect', 'transport close');
    });
    expect(screen.getByText('Socket: connecting')).toBeInTheDocument();
    act(() => {
      fake.active = false;
      fake.fire('disconnect', 'io client disconnect');
    });
    expect(screen.getByText('Socket: disconnected')).toBeInTheDocument();

    history = [msg(1, 'first'), msg(2, 'second')];
    serverConnects();
    expect(await screen.findByText('#2 second')).toBeInTheDocument();
    expect(rows()).toEqual(['#1 first', '#2 second']);
    expect(screen.getByText('Socket: connected')).toBeInTheDocument();
    expect(calls.filter((call) => call === `GET ${MESSAGES_URL}`)).toHaveLength(2);
  });
});
