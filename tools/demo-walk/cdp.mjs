// A minimal Chrome DevTools Protocol client: Node's built-in WebSocket, no dependencies.
//
// The walk launches its own headless Chrome with a throwaway profile, so nothing here ever
// attaches to a browser the user is running. `launchChrome` returns the client and a `close` that
// kills that Chrome and removes the profile; call it in a `finally`.
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const CHROME_PATHS = [
  process.env.CHROME_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
].filter(Boolean);

export class Cdp {
  /** @param {WebSocket} ws */
  constructor(ws) {
    this.ws = ws;
    this.nextId = 1;
    /** @type {Map<number, { resolve: (v: unknown) => void, reject: (e: Error) => void, method: string }>} */
    this.pending = new Map();
    /** @type {Map<string, Set<(params: any, sessionId?: string) => void>>} */
    this.listeners = new Map();
    ws.addEventListener('message', (event) => {
      const msg = JSON.parse(String(event.data));
      if (msg.id !== undefined) {
        const call = this.pending.get(msg.id);
        if (!call) return;
        this.pending.delete(msg.id);
        if (msg.error) call.reject(new Error(`${call.method}: ${msg.error.message}`));
        else call.resolve(msg.result);
        return;
      }
      for (const fn of this.listeners.get(msg.method) ?? []) fn(msg.params, msg.sessionId);
    });
    ws.addEventListener('close', () => {
      for (const call of this.pending.values())
        call.reject(new Error(`${call.method}: CDP closed`));
      this.pending.clear();
    });
  }

  /** @returns {Promise<any>} */
  send(method, params = {}, sessionId = undefined) {
    if (this.ws.readyState !== WebSocket.OPEN) {
      return Promise.reject(new Error(`${method}: CDP is not connected`));
    }
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject, method });
      this.ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
    });
  }

  on(method, fn) {
    if (!this.listeners.has(method)) this.listeners.set(method, new Set());
    this.listeners.get(method).add(fn);
    return () => this.listeners.get(method)?.delete(fn);
  }
}

/**
 * Starts headless Chrome on a free port with a fresh profile.
 * `env` adds to Chrome's environment (a walk sets `TZ` so pages do not show this machine's zone).
 * @param {{ args?: string[], env?: Record<string, string> }} options
 */
export async function launchChrome({ args = [], env = {} } = {}) {
  const bin = CHROME_PATHS.find((p) => existsSync(p));
  if (!bin) throw new Error('no Chrome found: set CHROME_PATH');
  const profile = mkdtempSync(join(tmpdir(), 'demo-walk-chrome-'));
  const child = spawn(
    bin,
    [
      '--headless=new',
      '--remote-debugging-port=0',
      `--user-data-dir=${profile}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-extensions',
      '--disable-sync',
      '--disable-background-networking',
      '--disable-component-update',
      '--disable-features=Translate,MediaRouter,OptimizationHints',
      '--hide-scrollbars',
      '--mute-audio',
      ...args,
      'about:blank',
    ],
    { stdio: 'ignore', env: { ...process.env, ...env } },
  );
  let closed = false;
  const close = async () => {
    if (closed) return;
    closed = true;
    if (child.exitCode === null) {
      child.kill('SIGTERM');
      for (let i = 0; i < 30 && child.exitCode === null; i++) await sleep(100);
      if (child.exitCode === null) child.kill('SIGKILL');
    }
    rmSync(profile, { recursive: true, force: true });
  };
  try {
    const portFile = join(profile, 'DevToolsActivePort');
    for (let i = 0; i < 100 && !existsSync(portFile); i++) await sleep(100);
    if (!existsSync(portFile)) throw new Error('Chrome did not open its DevTools port');
    const [port, path] = readFileSync(portFile, 'utf8').trim().split('\n');
    const ws = new WebSocket(`ws://127.0.0.1:${port}${path}`);
    await new Promise((resolve, reject) => {
      ws.addEventListener('open', resolve, { once: true });
      ws.addEventListener('error', () => reject(new Error('CDP WebSocket failed')), { once: true });
    });
    return { cdp: new Cdp(ws), pid: child.pid, close };
  } catch (error) {
    await close();
    throw error;
  }
}
