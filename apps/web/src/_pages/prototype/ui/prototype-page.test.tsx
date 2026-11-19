import { ClientMsgId, type CreateMessageBody, type MessageResponse } from '@app/contracts';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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

// The connection store is covered in shared/api. Here it is a fixed value the page cannot reach any
// other way (the fake socket never connects in that test), so the indicator must read the store.
vi.mock('@/shared/api', () => ({
  getSocket: () => fake,
  useConnectionStore: <T,>(selector: (store: { state: string }) => T): T =>
    selector({ state: 'syncing' }),
}));

const MESSAGES_URL = `/api/channels/${PROTOTYPE_CHANNEL_ID}/messages`;
// The page's own listeners; disconnect/connect_error belong to the connection store (UL-129).
const SOCKET_EVENTS = ['connect', 'message:new'];

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
/** What GET /api/health answers. */
let instanceId = 'api-test-1';
/** When set, GET /api/health answers 503. */
let healthDown = false;
/** Answers for the next history GETs, before the normal one: a 500 or a 200 with an invalid body. */
let historyFaults: ('fail' | 'invalid')[] = [];
/** Answers each POST; the test sets it. */
let postResponder: (payload: CreateMessageBody) => Promise<Response>;
/** A 201 carrying the server's copy of the posted message at `seq`. */
function created(payload: CreateMessageBody, seq: number): Promise<Response> {
  return Promise.resolve(
    json({ ...msg(seq, payload.body), clientMsgId: payload.clientMsgId }, 201),
  );
}
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
    if (healthDown) return Promise.resolve(json({ status: 'error' }, 503));
    return Promise.resolve(json({ status: 'ok', instanceId }));
  }
  if (method === 'GET' && url === MESSAGES_URL) {
    const fault = historyFaults.shift();
    if (fault === 'fail') return Promise.resolve(json({ message: 'boom' }, 500));
    if (fault === 'invalid') return Promise.resolve(json({ messages: [{ id: 'nope' }] }));
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

function messageList() {
  return within(screen.getByRole('list', { name: 'Messages' }));
}

function rows(): string[] {
  return messageList()
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
  instanceId = 'api-test-1';
  healthDown = false;
  historyFaults = [];
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
    expect(screen.getByRole('status')).toHaveTextContent('Connection: syncing');
  });

  it('loads the history on connect and renders it in seq order', async () => {
    history = [msg(2, 'second'), msg(1, 'first')];
    renderPage();
    await screen.findByText('Instance: api-test-1');
    serverConnects();
    expect(await screen.findByText('#2 second')).toBeInTheDocument();
    expect(rows()).toEqual(['#1 first', '#2 second']);
  });

  it('loads the history without connect() when the singleton is already connected', async () => {
    fake.connected = true;
    history = [msg(1, 'first')];
    renderPage();
    expect(await screen.findByText('#1 first')).toBeInTheDocument();
    expect(fake.connect).not.toHaveBeenCalled();
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
    expect(screen.getByLabelText('Message')).toHaveValue('');
    await waitFor(() => {
      expect(posted).toHaveLength(1);
    });
    const [payload] = posted;
    expect(payload?.body).toBe('hello');
    expect(ClientMsgId.safeParse(payload?.clientMsgId).success).toBe(true);
    expect(Object.keys(payload ?? {}).sort()).toEqual(['body', 'clientMsgId']);
    expect(messageList().getByText('Sending…')).toBeInTheDocument();

    const own = { ...msg(3, 'hello'), clientMsgId: payload?.clientMsgId ?? '' };
    act(() => {
      fake.fire('message:new', { message: own });
    });
    expect(rows()).toEqual(['#1 first', '#2 second', '#3 hello']);
    await act(async () => {
      response.resolve(json(own, 201));
      await response.promise;
    });
    expect(rows()).toEqual(['#1 first', '#2 second', '#3 hello']);
  });

  it('a send without network stays failed with Retry, and Retry delivers it once with the same key', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    let attempt = 0;
    postResponder = (payload) => {
      attempt += 1;
      if (attempt === 1) return Promise.reject(new TypeError('Failed to fetch'));
      return created(payload, 1);
    };
    await renderConnected();

    const user = userEvent.setup();
    await user.type(screen.getByLabelText('Message'), 'hello');
    await user.click(screen.getByRole('button', { name: 'Send' }));
    expect(screen.getByLabelText('Message')).toHaveValue('');

    expect(
      await messageList().findByText('Not sent: no connection to the server'),
    ).toBeInTheDocument();
    expect(messageList().getByText('hello')).toBeInTheDocument();
    await user.click(messageList().getByRole('button', { name: 'Retry' }));

    await waitFor(() => {
      expect(rows()).toEqual(['#1 hello']);
    });
    expect(posted).toHaveLength(2);
    expect(posted[1]?.clientMsgId).toBe(posted[0]?.clientMsgId);
    expect(posted[0]?.body).toBe('hello');
    expect(posted[1]?.body).toBe('hello');
    expect(messageList().queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument();
    expect(messageList().queryByText(/^Not sent/)).not.toBeInTheDocument();
  });

  it('a new Send after a failure gets a new key and keeps the failed row', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    postResponder = () => Promise.reject(new TypeError('Failed to fetch'));
    await renderConnected();

    const user = userEvent.setup();
    const input = screen.getByLabelText('Message');
    await user.type(input, 'hello');
    await user.click(screen.getByRole('button', { name: 'Send' }));
    await messageList().findByText('Not sent: no connection to the server');

    postResponder = (payload) => created(payload, 1);
    await user.type(input, 'again');
    await user.click(screen.getByRole('button', { name: 'Send' }));
    expect(await messageList().findByText('#1 again')).toBeInTheDocument();
    expect(posted).toHaveLength(2);
    expect(posted[1]?.body).toBe('again');
    expect(posted[1]?.clientMsgId).not.toBe(posted[0]?.clientMsgId);
    expect(ClientMsgId.safeParse(posted[1]?.clientMsgId).success).toBe(true);

    const [sentRow, failedRow] = messageList().getAllByRole('listitem');
    if (!sentRow || !failedRow) throw new Error('expected two rows');
    expect(rows()).toHaveLength(2);
    expect(sentRow).toHaveTextContent('#1 again');
    expect(failedRow).toHaveTextContent('hello');
    expect(failedRow).toHaveTextContent('Not sent: no connection to the server');
    expect(within(failedRow).getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('keeps text typed while a send is in flight', async () => {
    const response = deferred<Response>();
    postResponder = () => response.promise;
    await renderConnected();
    const user = userEvent.setup();
    const input = screen.getByLabelText('Message');

    await user.type(input, 'hello');
    await user.click(screen.getByRole('button', { name: 'Send' }));
    expect(input).toHaveValue('');
    expect(messageList().getByText('Sending…')).toBeInTheDocument();
    await user.type(input, '!');
    await waitFor(() => {
      expect(posted).toHaveLength(1);
    });
    const key = posted[0]?.clientMsgId ?? '';
    await act(async () => {
      response.resolve(json({ ...msg(1, 'hello'), clientMsgId: key }, 201));
      await response.promise;
    });
    expect(await messageList().findByText('#1 hello')).toBeInTheDocument();
    expect(messageList().queryByText('Sending…')).not.toBeInTheDocument();
    expect(input).toHaveValue('!');
  });

  it('disables Send only for a blank or over-long draft', async () => {
    const responses = [deferred<Response>(), deferred<Response>()];
    postResponder = () => {
      const next = responses[posted.length - 1];
      if (!next) throw new Error('unexpected POST');
      return next.promise;
    };
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
    await user.type(input, 'world');
    expect(send).toBeEnabled();
    await user.click(send);
    await waitFor(() => {
      expect(posted).toHaveLength(2);
    });
    expect(posted[1]?.clientMsgId).not.toBe(posted[0]?.clientMsgId);
    expect(messageList().getAllByText('Sending…')).toHaveLength(2);

    await act(async () => {
      for (const [index, response] of responses.entries()) {
        const payload = posted[index];
        if (!payload) throw new Error('missing POST');
        response.resolve(
          json({ ...msg(index + 1, payload.body), clientMsgId: payload.clientMsgId }, 201),
        );
        await response.promise;
      }
    });
    await waitFor(() => {
      expect(rows()).toEqual(['#1 hello', '#2 world']);
    });

    fireEvent.change(input, { target: { value: 'x'.repeat(4001) } });
    expect(send).toBeDisabled();
  });

  it('shows a history load failure and retries it, keeping live messages', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    historyFaults = ['fail'];
    history = [msg(1, 'first')];
    await renderConnected();
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Could not load the messages.');

    act(() => {
      fake.fire('message:new', { message: msg(2, 'live') });
    });
    await userEvent.setup().click(within(alert).getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('#1 first')).toBeInTheDocument();
    expect(rows()).toEqual(['#1 first', '#2 live']);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('keeps Retry after an invalid history payload until a valid one arrives', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    historyFaults = ['fail', 'invalid'];
    history = [msg(1, 'first')];
    await renderConnected();
    const user = userEvent.setup();

    await user.click(
      within(await screen.findByRole('alert')).getByRole('button', { name: 'Retry' }),
    );
    await waitFor(() => {
      expect(calls.filter((call) => call === `GET ${MESSAGES_URL}`)).toHaveLength(2);
    });
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Could not load the messages.');
    expect(rows()).toEqual([]);

    await user.click(within(alert).getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('#1 first')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('catches up on reconnect without duplicates and re-reads the instance id', async () => {
    history = [msg(1, 'first')];
    await renderConnected();
    await screen.findByText('#1 first');
    const healthBefore = calls.filter((call) => call === 'GET /api/health').length;

    act(() => {
      fake.connected = false;
      fake.fire('disconnect', 'transport close');
    });

    // The reconnect lands on the other replica (Traefik re-picked io_srv).
    instanceId = 'api-test-2';
    history = [msg(1, 'first'), msg(2, 'second')];
    serverConnects();
    expect(await screen.findByText('#2 second')).toBeInTheDocument();
    expect(rows()).toEqual(['#1 first', '#2 second']);
    expect(await screen.findByText('Instance: api-test-2')).toBeInTheDocument();
    expect(calls.filter((call) => call === `GET ${MESSAGES_URL}`)).toHaveLength(2);
    expect(calls.filter((call) => call === 'GET /api/health')).toHaveLength(healthBefore + 1);
  });

  it('keeps the known instance id when a re-read after reconnect fails', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    await renderConnected();
    await screen.findByText('Instance: api-test-1');
    act(() => {
      fake.connected = false;
      fake.fire('disconnect', 'transport close');
    });
    healthDown = true;
    const healthBefore = calls.filter((call) => call === 'GET /api/health').length;
    serverConnects();
    await waitFor(() => {
      expect(calls.filter((call) => call === 'GET /api/health')).toHaveLength(healthBefore + 1);
    });
    await waitFor(() => {
      expect(warn).toHaveBeenCalledWith(
        'prototype: could not load the instance id',
        expect.any(Error),
      );
    });
    expect(screen.getByText('Instance: api-test-1')).toBeInTheDocument();
  });
});
