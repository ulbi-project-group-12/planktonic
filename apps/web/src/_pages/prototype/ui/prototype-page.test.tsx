import type { MessageResponse } from '@app/contracts';
import { act, render, screen, within } from '@testing-library/react';
import { StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PROTOTYPE_CHANNEL_ID } from '../model/feed';
import { PrototypePage } from './prototype-page';

type Handler = (...args: unknown[]) => void;

const { fake, calls } = vi.hoisted(() => {
  const calls: string[] = [];
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
  return { fake, calls };
});

vi.mock('@/shared/api', () => ({ getSocket: () => fake }));

const MESSAGES_URL = `/api/channels/${PROTOTYPE_CHANNEL_ID}/messages`;
const SOCKET_EVENTS = ['connect', 'disconnect', 'connect_error'];

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
  fake.connect.mockReset();
  fake.connect.mockImplementation(() => {
    fake.active = true;
    calls.push('connect');
  });
  fake.disconnect.mockReset();
  fetchMock.mockClear();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

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
});
