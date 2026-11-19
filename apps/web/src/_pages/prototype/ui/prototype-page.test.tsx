import { ClientMsgId, type CreateMessageBody, type MessageResponse } from '@app/contracts';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { uuidv7 } from '@/shared/lib';
import { PROTOTYPE_CHANNEL_ID } from '../model/feed';
import { PrototypePage } from './prototype-page';

type Handler = (...args: unknown[]) => void;

const { fake, calls, connectSnapshot, catchUps } = vi.hoisted(() => {
  const calls: string[] = [];
  /** What the page registered with `registerCatchUp`; the fake transport runs them on connect. */
  const catchUps = new Set<() => Promise<void>>();
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
      // Like bindConnectionListeners: every connect runs the registered catch-ups.
      if (event === 'connect') for (const task of [...catchUps]) void task();
    },
    reset() {
      handlers.clear();
      catchUps.clear();
      fake.connected = false;
      fake.active = false;
    },
  };
  return { fake, calls, connectSnapshot, catchUps };
});

// The connection store is covered in shared/api. Here it is a fixed value the page cannot reach any
// other way (the fake socket never connects in that test), so the indicator must read the store.
vi.mock('@/shared/api', () => ({
  getSocket: () => fake,
  registerCatchUp: (task: () => Promise<void>) => {
    catchUps.add(task);
    return () => {
      catchUps.delete(task);
    };
  },
  syncWith: (task: () => Promise<void>) => task(),
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

/** The channel as the fake server holds it, ascending by seq. */
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

/** The api's GET messages over `history`: `afterSeq` ascending, or the newest page; `hasMore`. */
function serverPage(query: URLSearchParams): { messages: MessageResponse[]; hasMore: boolean } {
  const limit = Number(query.get('limit') ?? '100');
  const afterSeq = query.get('afterSeq');
  if (afterSeq === null) {
    return { messages: history.slice(-limit), hasMore: history.length > limit };
  }
  const after = history.filter((m) => BigInt(m.seq) > BigInt(afterSeq));
  return { messages: after.slice(0, limit), hasMore: after.length > limit };
}

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
  const [path = '', search = ''] = url.split('?');
  if (method === 'GET' && path === MESSAGES_URL) {
    const fault = historyFaults.shift();
    if (fault === 'fail') return Promise.resolve(json({ message: 'boom' }, 500));
    if (fault === 'invalid') return Promise.resolve(json({ messages: [{ id: 'nope' }] }));
    return Promise.resolve(json(serverPage(new URLSearchParams(search))));
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
    expect(historyGets().length).toBeGreaterThan(0);
  });
  return view;
}

/** The GET messages calls so far, with their query (`?limit=100`, `?afterSeq=2&limit=100`). */
function historyGets(): string[] {
  return calls.filter((call) => call.startsWith(`GET ${MESSAGES_URL}`));
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
    expect(screen.getByText('Connection: syncing')).toBeInTheDocument();
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

  it('renders a repeated announcement as a new node, so it is read out again', async () => {
    const answers = [deferred<Response>(), deferred<Response>()];
    let attempt = 0;
    postResponder = () => {
      const answer = answers[attempt];
      attempt += 1;
      if (!answer) throw new Error('unexpected POST');
      return answer.promise;
    };
    await renderConnected();
    const region = screen.getByRole('status', { name: 'Send status' });

    const user = userEvent.setup();
    for (const text of ['a', 'b']) {
      await user.type(screen.getByLabelText('Message'), text);
      await user.click(screen.getByRole('button', { name: 'Send' }));
    }
    await waitFor(() => {
      expect(posted).toHaveLength(2);
    });

    const confirm = async (index: number, seq: number) => {
      const payload = posted[index];
      const answer = answers[index];
      if (!payload || !answer) throw new Error('missing POST');
      await act(async () => {
        answer.resolve(json({ ...msg(seq, payload.body), clientMsgId: payload.clientMsgId }, 201));
        await answer.promise;
      });
      await waitFor(() => {
        expect(region).toHaveTextContent('Message sent.');
      });
      return region.firstElementChild;
    };
    const first = await confirm(0, 1);
    const second = await confirm(1, 2);
    expect(rows()).toEqual(['#1 a', '#2 b']);
    expect(second).toHaveTextContent('Message sent.');
    expect(second).not.toBe(first);
  });

  it('announces Sending, Not sent with whether Retry helps, and Sent in a polite live region', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const first = deferred<Response>();
    let attempt = 0;
    postResponder = (payload) => {
      attempt += 1;
      if (attempt === 1) {
        return first.promise.then(() => Promise.reject(new TypeError('Failed to fetch')));
      }
      if (attempt === 2) return created(payload, 1);
      return Promise.resolve(json({ message: 'Bad Request' }, 400));
    };
    await renderConnected();
    const region = screen.getByRole('status', { name: 'Send status' });
    expect(region).toBeEmptyDOMElement();

    const user = userEvent.setup();
    await user.type(screen.getByLabelText('Message'), 'hello');
    await user.click(screen.getByRole('button', { name: 'Send' }));
    expect(region).toHaveTextContent('Sending message…');
    await act(async () => {
      first.resolve(json({}, 200));
      await first.promise;
    });
    await waitFor(() => {
      expect(region).toHaveTextContent(
        'Message not sent: no connection to the server. Press Retry to try again.',
      );
    });

    await user.click(messageList().getByRole('button', { name: 'Retry' }));
    await waitFor(() => {
      expect(region).toHaveTextContent('Message sent.');
    });

    await user.type(screen.getByLabelText('Message'), 'refused');
    await user.click(screen.getByRole('button', { name: 'Send' }));
    await waitFor(() => {
      expect(region).toHaveTextContent(
        'Message not sent: the server rejected the message (400). Retrying will not help.',
      );
    });
    expect(region).not.toHaveFocus();
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

  it('shows why a refused send failed and offers no Retry', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    postResponder = () => Promise.resolve(json({ message: 'Bad Request' }, 400));
    await renderConnected();

    const user = userEvent.setup();
    await user.type(screen.getByLabelText('Message'), 'hello');
    await user.click(screen.getByRole('button', { name: 'Send' }));
    expect(
      await messageList().findByText('Not sent: the server rejected the message (400)'),
    ).toBeInTheDocument();
    expect(messageList().getByText('Retrying will not help.')).toBeInTheDocument();
    expect(messageList().queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument();
    expect(messageList().queryByText('Bad Request')).not.toBeInTheDocument();
    expect(posted).toHaveLength(1);
  });

  it('keeps Retry when the server is unavailable', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    postResponder = () => Promise.resolve(json({ message: 'boom' }, 503));
    await renderConnected();

    const user = userEvent.setup();
    await user.type(screen.getByLabelText('Message'), 'hello');
    await user.click(screen.getByRole('button', { name: 'Send' }));
    expect(
      await messageList().findByText('Not sent: the server is unavailable right now (503)'),
    ).toBeInTheDocument();
    expect(messageList().getByRole('button', { name: 'Retry' })).toBeInTheDocument();
    expect(messageList().queryByText('Retrying will not help.')).not.toBeInTheDocument();
    expect(posted).toHaveLength(1);
  });

  it('fails the row with Retry when the 201 is for another clientMsgId', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    postResponder = (payload) =>
      Promise.resolve(json({ ...msg(7, payload.body), clientMsgId: uuidv7() }, 201));
    await renderConnected();

    const user = userEvent.setup();
    await user.type(screen.getByLabelText('Message'), 'hello');
    await user.click(screen.getByRole('button', { name: 'Send' }));
    expect(
      await messageList().findByText('Not sent: the server sent an unexpected response'),
    ).toBeInTheDocument();
    expect(messageList().getByRole('button', { name: 'Retry' })).toBeInTheDocument();
    expect(messageList().queryByText('Sending…')).not.toBeInTheDocument();
    expect(rows()).toHaveLength(1);
  });

  it('collapses a failed row when message:new arrives with its key', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    postResponder = () => Promise.reject(new TypeError('Failed to fetch'));
    await renderConnected();

    const user = userEvent.setup();
    await user.type(screen.getByLabelText('Message'), 'hello');
    await user.click(screen.getByRole('button', { name: 'Send' }));
    await messageList().findByText('Not sent: no connection to the server');

    // The server committed the message; only its answer was lost.
    const key = posted[0]?.clientMsgId ?? '';
    act(() => {
      fake.fire('message:new', { message: { ...msg(1, 'hello'), clientMsgId: key } });
    });
    expect(rows()).toEqual(['#1 hello']);
    expect(messageList().queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument();
    expect(messageList().queryByText(/^Not sent/)).not.toBeInTheDocument();
    expect(screen.getByRole('status', { name: 'Send status' })).toHaveTextContent('Message sent.');
  });

  it('ignores a failure that lands after message:new delivered the message', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const response = deferred<Response>();
    postResponder = () => response.promise;
    await renderConnected();

    const user = userEvent.setup();
    await user.type(screen.getByLabelText('Message'), 'hello');
    await user.click(screen.getByRole('button', { name: 'Send' }));
    await waitFor(() => {
      expect(posted).toHaveLength(1);
    });
    const key = posted[0]?.clientMsgId ?? '';
    act(() => {
      fake.fire('message:new', { message: { ...msg(1, 'hello'), clientMsgId: key } });
    });
    expect(rows()).toEqual(['#1 hello']);

    await act(async () => {
      response.resolve(json({ message: 'boom' }, 503));
      await response.promise;
    });
    await waitFor(() => {
      expect(warn).toHaveBeenCalledWith('prototype: send failed', expect.anything());
    });
    expect(rows()).toEqual(['#1 hello']);
    expect(messageList().queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument();
    // The live region follows the feed, not the stale failure.
    expect(screen.getByRole('status', { name: 'Send status' })).toHaveTextContent('Message sent.');
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
      expect(historyGets()).toHaveLength(2);
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
    // The reconnect asks only for what came after the last known seq (UL-130).
    expect(historyGets()).toEqual([
      `GET ${MESSAGES_URL}?limit=100`,
      `GET ${MESSAGES_URL}?afterSeq=1&limit=100`,
    ]);
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

  describe('catch-up (UL-130)', () => {
    const range = (from: number, to: number) =>
      Array.from({ length: to - from + 1 }, (_, i) => msg(from + i, `m${String(from + i)}`));
    const labels = (from: number, to: number) => range(from, to).map((m) => `#${m.seq} ${m.body}`);

    function reconnect() {
      act(() => {
        fake.connected = false;
        fake.fire('disconnect', 'transport close');
      });
      serverConnects();
    }

    it('the first connect sends one GET, for the newest page', async () => {
      history = range(1, 2);
      await renderConnected();
      await screen.findByText('#2 m2');
      expect(historyGets()).toEqual([`GET ${MESSAGES_URL}?limit=100`]);
    });

    it('the same message:new delivered twice is one row', async () => {
      await renderConnected();
      act(() => {
        fake.fire('message:new', { message: msg(1, 'once') });
        fake.fire('message:new', { message: msg(1, 'once') });
      });
      expect(rows()).toEqual(['#1 once']);
    });

    it('a message that arrived live and again in the catch-up page is one row', async () => {
      history = range(1, 1);
      await renderConnected();
      await screen.findByText('#1 m1');
      history = range(1, 3);
      act(() => {
        fake.fire('message:new', { message: msg(2, 'm2') });
      });

      reconnect();
      expect(await screen.findByText('#3 m3')).toBeInTheDocument();
      expect(rows()).toEqual(labels(1, 3));
      expect(historyGets().at(-1)).toBe(`GET ${MESSAGES_URL}?afterSeq=2&limit=100`);
    });

    it('shows every message missed while offline, in order, after a reconnect', async () => {
      history = range(1, 2);
      await renderConnected();
      await screen.findByText('#2 m2');

      // Five messages are sent while this client is offline: no message:new reaches it.
      history = range(1, 7);
      reconnect();
      expect(await screen.findByText('#7 m7')).toBeInTheDocument();
      expect(rows()).toEqual(labels(1, 7));
    });

    it('a live seq gap (2 → 4) runs the catch-up from below the gap, so 3 shows too', async () => {
      history = range(1, 2);
      await renderConnected();
      await screen.findByText('#2 m2');
      history = range(1, 4);

      act(() => {
        fake.fire('message:new', { message: msg(4, 'm4') });
      });
      expect(await screen.findByText('#3 m3')).toBeInTheDocument();
      expect(rows()).toEqual(labels(1, 4));
      expect(historyGets().at(-1)).toBe(`GET ${MESSAGES_URL}?afterSeq=2&limit=100`);
    });

    it('on hasMore it resets the feed to the newest page instead of paging on', async () => {
      history = range(1, 2);
      await renderConnected();
      await screen.findByText('#2 m2');

      history = range(1, 250);
      reconnect();
      expect(await screen.findByText('#250 m250')).toBeInTheDocument();
      expect(rows()).toEqual(labels(151, 250));
      expect(historyGets().slice(1)).toEqual([
        `GET ${MESSAGES_URL}?afterSeq=2&limit=100`,
        `GET ${MESSAGES_URL}?limit=100`,
      ]);
    });

    it('an unsent row never moves afterSeq', async () => {
      vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      history = range(1, 1);
      postResponder = () => Promise.reject(new TypeError('Failed to fetch'));
      await renderConnected();
      await screen.findByText('#1 m1');
      const user = userEvent.setup();
      await user.type(screen.getByLabelText('Message'), 'not yet');
      await user.click(screen.getByRole('button', { name: 'Send' }));
      await messageList().findByRole('button', { name: 'Retry' });

      history = range(1, 2);
      reconnect();
      expect(await screen.findByText('#2 m2')).toBeInTheDocument();
      expect(historyGets().at(-1)).toBe(`GET ${MESSAGES_URL}?afterSeq=1&limit=100`);
      expect(rows().at(-1)).toContain('not yet');
    });
  });
});
