#!/usr/bin/env node
// The click-through walks: browser windows on the local stand, driven through a scenario and
// recorded. `--walk` picks the scenario: `prototype` (the default) is the phase 2 realtime prototype
// of UL-135, two windows side by side, each bound to its own api replica; `onboarding` goes from
// the landing page to a workspace with two members (scenario-onboarding.mjs).
//
//   node tools/demo-walk/walk.mjs --out <dir>                 records <dir>/recording.mp4, .srt, poster
//   node tools/demo-walk/walk.mjs --out <dir> --stills        the same walk, saving a still per beat and
//                                                             before every click into <dir>/stills/
//   node tools/demo-walk/walk.mjs --out <dir> --assemble      rebuilds the video from the last walk's frames
//   --walk <name>                   the scenario: prototype (default) or onboarding
//   --base http://127.0.0.1:58080   the stand's Traefik origin (DEMO_BASE; default TRAEFIK_PORT 58080)
//   --test-log <file>               a captured integration run, shown as the closing card (optional)
//
// Needs Google Chrome (CHROME_PATH to override) and ffmpeg. No npm dependency: Chrome is driven over
// the DevTools protocol with Node's own WebSocket (cdp.mjs).
//
// What every walk holds to:
// - ONLY THE APP IS RECORDED. Chrome runs headless with a throwaway profile; the frames come from
//   Chrome's own screencast of the app pages, never from the screen. No DevTools panel, no
//   other tab, no desktop can be in a frame.
// - LOCAL STAND ONLY. The base URL must be a loopback origin; the walk stops otherwise.
// - A and B are separate browser contexts (separate cookie jars): two different visitors.
// - The walk checks what the viewer is told and stops on a mismatch.
//
// And the prototype walk:
// - TWO WINDOWS, TWO REPLICAS. Each window gets its own `io_srv` sticky cookie. If both land on one
//   replica, B's cookies are cleared and B reloads, up to 8 times; the walk stops if they still match.
// - B GOES OFFLINE BY NETWORK EMULATION OF ITS OWN PAGE (`Network.emulateNetworkConditions`, what
//   DevTools → Network → Offline does), never by stopping a container. A is never touched.
// - It checks: different instance ids, B's feed #1..#7 in order and once after the catch-up, and
//   exactly one retried message in both windows.
import { spawnSync } from 'node:child_process';
import {
  appendFileSync,
  copyFileSync,
  lstatSync,
  mkdtempSync,
  realpathSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { launchChrome } from './cdp.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const { values: argv } = parseArgs({
  options: {
    out: { type: 'string' },
    base: { type: 'string' },
    stills: { type: 'boolean', default: false },
    assemble: { type: 'boolean', default: false },
    'test-log': { type: 'string' },
    walk: { type: 'string' },
  },
});
/**
 * Which walk: `prototype` (UL-135, the default) has its script in beats.mjs and its scenario below;
 * any other name reads beats-<name>.mjs and scenario-<name>.mjs next to this file.
 */
const OUT = resolve(argv.out ?? join(HERE, 'out'));
const STILLS = argv.stills;
const STILL_DIR = join(OUT, 'stills');
/**
 * The raw frames of a walk. Each walk gets a fresh private directory (mkdtemp: unique, created
 * by this process, mode 0700), and its path is kept in <out>/.frames(-stills) so `--assemble`
 * reads the same frames. DEMO_WALK_FRAMES names a directory instead; such a directory is the
 * user's and is never deleted. The pointer records which kind it was (`created`).
 */
const FRAMES_POINTER = join(OUT, STILLS ? '.frames-stills.json' : '.frames.json');
const FRAMES_PREFIX = join(tmpdir(), 'demo-walk-frames-');
const previousFrames = (() => {
  try {
    const p = JSON.parse(readFileSync(FRAMES_POINTER, 'utf8'));
    return typeof p.dir === 'string' ? { dir: p.dir, created: p.created === true } : undefined;
  } catch {
    return undefined;
  }
})();
const FRAMES_CREATED = !process.env.DEMO_WALK_FRAMES && !argv.assemble;
const FRAMES = (() => {
  if (process.env.DEMO_WALK_FRAMES) return resolve(process.env.DEMO_WALK_FRAMES);
  if (argv.assemble) {
    if (!previousFrames) throw new Error(`no earlier walk in ${OUT}: nothing to assemble`);
    return previousFrames.dir;
  }
  return mkdtempSync(FRAMES_PREFIX);
})();
/**
 * `--assemble` rebuilds a recorded walk, so it reads the recording and takes the walk's name from
 * it: the script (captions, card, poster) must be the one the frames were recorded with. A
 * recording from before the name was saved is the prototype walk, the only one there was.
 */
const RECORDED = argv.assemble
  ? JSON.parse(readFileSync(join(FRAMES, 'raw.json'), 'utf8'))
  : undefined;
const WALK = (() => {
  const recorded = RECORDED ? (RECORDED.walk ?? 'prototype') : undefined;
  if (recorded && argv.walk && argv.walk !== recorded)
    throw new Error(`--walk ${argv.walk}: the recording in ${OUT} is the ${recorded} walk`);
  return recorded ?? argv.walk ?? 'prototype';
})();
if (!/^[a-z][a-z0-9-]*$/.test(WALK)) throw new Error(`--walk ${WALK}: not a walk name`);
const SCRIPT = await import(WALK === 'prototype' ? './beats.mjs' : `./beats-${WALK}.mjs`);
const { BEATS, CAPTIONS } = SCRIPT;
const BASE = (argv.base ?? process.env.DEMO_BASE ?? 'http://127.0.0.1:58080').replace(/\/$/, '');
const PAGE_URL = `${BASE}/prototype`;
const TEST_LOG = argv['test-log'] ? resolve(argv['test-log']) : undefined;

/**
 * The frame: 1920x1080, window labels on top, the windows, a caption band below. Two layouts:
 * `pair` is two 940x900 windows side by side (A and B), `solo` is window A alone at 1894x900,
 * wide enough for the app's desktop layout. A walk switches with `setLayout`; every switch starts
 * a new scene, and the scenes are assembled one by one and joined.
 */
const FRAME = { width: 1920, height: 1080 };
const SCALE = 1.5; // large type: every CSS pixel is drawn as 1.5 frame pixels
const PANE = { width: 940, height: 900, y: 60, xA: 13, xB: 967 };
const VIEW = { width: Math.round(PANE.width / SCALE), height: Math.round(PANE.height / SCALE) };
const LAYOUTS = {
  pair: [
    { win: 'a', x: PANE.xA, width: PANE.width },
    { win: 'b', x: PANE.xB, width: PANE.width },
  ],
  solo: [{ win: 'a', x: PANE.xA, width: FRAME.width - 2 * PANE.xA }],
};
/** The CSS viewport of a pane's window. */
const viewOf = (pane) => ({ width: Math.round(pane.width / SCALE), height: VIEW.height });
const LABELS = { a: 'Окно A', b: 'Окно B', ...SCRIPT.LABELS };
/** Headless Chrome keeps 87 CSS px of a window's height for its own frame. */
const WINDOW_EXTRA_HEIGHT = 87;
const FPS = 30;

const BEAT_LIST = BEATS.filter((b) => !b.optional || (b.id === 'test-run' && TEST_LOG));

mkdirSync(OUT, { recursive: true });
const LOG = join(OUT, STILLS ? 'walk-stills.log' : 'walk.log');
const log = (s) => {
  console.log(s);
  appendFileSync(LOG, `${s}\n`);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
/** For best-effort CDP calls (the pointer, frame acks) whose failure changes nothing. */
const ignore = () => undefined;
const ANSI = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'g');
const now = () => Date.now() / 1000;

function ffmpeg(args, what) {
  const r = spawnSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', ...args], {
    stdio: 'inherit',
  });
  if (r.status !== 0) throw new Error(`ffmpeg could not ${what}`);
}

/**
 * A pointer file is only a hint: delete what it names only when it is, canonically, one of this
 * tool's mkdtemp directories directly in the temp folder, a real directory (not a symlink), owned
 * by the current user. Anything else is left alone.
 */
function isOwnFramesDir(path) {
  try {
    const stat = lstatSync(path);
    if (!stat.isDirectory() || stat.isSymbolicLink()) return false;
    if (typeof process.getuid === 'function' && stat.uid !== process.getuid()) return false;
    const real = realpathSync(path);
    return (
      dirname(real) === realpathSync(tmpdir()) &&
      /^demo-walk-frames-[A-Za-z0-9]{6}$/.test(basename(real))
    );
  } catch {
    return false;
  }
}

/* ── what is drawn into the app pages ──────────────────────────────────────────────────────── */
/** A pointer and a click ripple, on <html> so React never touches them. Hidden until moved. */
const OVERLAY = `(() => {
  const install = () => {
    if (document.getElementById('__walk_cursor') || !document.documentElement) return;
    const c = document.createElement('div');
    c.id = '__walk_cursor';
    c.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24"><path d="M5 3l14 9-6.2 1.3L16 20l-2.6 1.3-3.2-6.8L5 18.5z" fill="#fff" stroke="#111" stroke-width="1.4" stroke-linejoin="round"/></svg>';
    c.style.cssText = 'position:fixed;left:0;top:0;z-index:2147483647;pointer-events:none;width:24px;height:24px;transition:transform 480ms cubic-bezier(.3,.7,.3,1);will-change:transform;filter:drop-shadow(0 2px 3px rgba(0,0,0,.3));visibility:hidden;';
    const s = window.__walkPos;
    if (s) { c.style.transform = 'translate(' + s.x + 'px,' + s.y + 'px)'; c.style.visibility = 'visible'; }
    document.documentElement.appendChild(c);
  };
  window.__walkMove = (x, y) => {
    install();
    window.__walkPos = { x, y };
    const c = document.getElementById('__walk_cursor');
    c.style.visibility = 'visible';
    c.style.transform = 'translate(' + x + 'px,' + y + 'px)';
  };
  window.__walkHide = (hidden) => {
    install();
    document.getElementById('__walk_cursor').style.visibility = hidden ? 'hidden' : (window.__walkPos ? 'visible' : 'hidden');
  };
  window.__walkRipple = (x, y) => {
    const r = document.createElement('div');
    r.style.cssText = 'position:fixed;left:' + (x - 16) + 'px;top:' + (y - 16) + 'px;width:32px;height:32px;border-radius:50%;background:rgba(37,99,235,.35);z-index:2147483646;pointer-events:none;transform:scale(.3);opacity:1;transition:transform 420ms ease-out,opacity 420ms ease-out;';
    document.documentElement.appendChild(r);
    requestAnimationFrame(() => { r.style.transform = 'scale(1.5)'; r.style.opacity = '0'; });
    setTimeout(() => r.remove(), 520);
  };
  if (document.documentElement) install();
  document.addEventListener('DOMContentLoaded', install);
})();`;

const escapeHtml = (s) =>
  s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const FONT = `-apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif`;

/** The frame behind the windows of a layout: their labels and the caption band (1280x720 CSS). */
function backgroundHtml(caption, layout) {
  const px = (v) => `${v / SCALE}px`;
  const label = (p) =>
    `<div style="position:absolute;top:0;left:${px(p.x)};width:${px(p.width)};height:${px(PANE.y)};display:flex;align-items:center;justify-content:center;font:700 18px/1 ${FONT};color:#e2e8f0;letter-spacing:.3px">${escapeHtml(LABELS[p.win])}</div>`;
  const pane = (p) =>
    `<div style="position:absolute;top:${px(PANE.y - 1)};left:${px(p.x - 1)};width:${px(p.width)};height:${px(PANE.height)};border:1px solid #334155"></div>`;
  const chip = caption
    ? `<div style="position:absolute;left:0;right:0;top:${px(PANE.y + PANE.height)};bottom:0;display:flex;align-items:center;justify-content:center"><div style="padding:9px 22px;border-radius:999px;background:#2563eb;color:#fff;white-space:nowrap;font:600 22px/1.2 ${FONT}">${escapeHtml(caption)}</div></div>`
    : '';
  return `<!doctype html><meta charset="utf-8"><style>html,body{margin:0;width:1280px;height:720px;background:#0f172a;overflow:hidden}</style>
${LAYOUTS[layout].map((p) => label(p) + pane(p)).join('')}${chip}`;
}
const bgKey = (layout, caption) => `${layout}:${caption ?? 'none'}`;

/**
 * A closing card of plain text (the script's `CARD`: a title, groups of lines, a footnote), for
 * what a walk has no screen to show. Nothing on it is a recording.
 */
function listCardHtml(caption, card) {
  const groups = card.groups
    .map(
      (g) =>
        `<section><h2>${escapeHtml(g.title)}</h2><ul>${g.items.map((i) => `<li>${escapeHtml(i)}</li>`).join('')}</ul></section>`,
    )
    .join('');
  return `<!doctype html><meta charset="utf-8"><style>
html,body{margin:0;width:1280px;height:720px;background:#0f172a;overflow:hidden;font-family:${FONT};color:#e2e8f0}
.band{position:absolute;left:0;right:0;top:${(PANE.y + PANE.height) / SCALE}px;bottom:0;display:flex;align-items:center;justify-content:center}
.chip{padding:9px 22px;border-radius:999px;background:#2563eb;color:#fff;white-space:nowrap;font:600 22px/1.2 ${FONT}}
.card{position:absolute;top:${PANE.y / SCALE}px;left:9px;right:9px;bottom:${720 - (PANE.y + PANE.height) / SCALE}px;background:#020617;border:1px solid #334155;border-radius:6px;padding:26px 56px;box-sizing:border-box;display:flex;flex-direction:column;justify-content:center;gap:24px}
h1{margin:0 0 4px;font:700 36px/1.2 ${FONT};letter-spacing:-.3px}
h2{margin:0 0 8px;font:700 22px/1.3 ${FONT};color:#93c5fd}
ul{margin:0;padding-left:22px;font:400 21px/1.6 ${FONT}}
.note{color:#94a3b8;font:400 18px/1.4 ${FONT}}
</style><div class="band"><div class="chip">${escapeHtml(caption)}</div></div><div class="card"><h1>${escapeHtml(card.title)}</h1>${groups}${card.note ? `<div class="note">${escapeHtml(card.note)}</div>` : ''}</div>`;
}

/** The closing card: a captured integration run, as a terminal. */
function testCardHtml(caption, logText) {
  const lines = logText
    .replace(ANSI, '')
    .split('\n')
    .filter((l) => l.trim())
    .slice(-22)
    .map((l) => {
      const cls = /✓|passed|\bpass\b/i.test(l) ? 'ok' : /✗|×|failed|\bfail\b/i.test(l) ? 'bad' : '';
      return `<div class="${cls}">${escapeHtml(l)}</div>`;
    })
    .join('');
  return `<!doctype html><meta charset="utf-8"><style>
html,body{margin:0;width:1280px;height:720px;background:#0f172a;overflow:hidden;font-family:${FONT}}
.band{position:absolute;left:0;right:0;top:${(PANE.y + PANE.height) / SCALE}px;bottom:0;display:flex;align-items:center;justify-content:center}
.chip{padding:9px 22px;border-radius:999px;background:#2563eb;color:#fff;white-space:nowrap;font:600 22px/1.2 ${FONT}}
.term{position:absolute;top:${PANE.y / SCALE}px;left:9px;right:9px;bottom:${720 - (PANE.y + PANE.height) / SCALE}px;background:#020617;border:1px solid #334155;border-radius:6px;padding:18px 22px;color:#e2e8f0;font:15px/1.6 ui-monospace,Menlo,monospace;white-space:pre-wrap;overflow:hidden}
.cmd{color:#94a3b8;margin-bottom:8px}.ok{color:#4ade80}.bad{color:#f87171}
</style><div class="band"><div class="chip">${escapeHtml(caption)}</div></div><div class="term"><div class="cmd">$ vitest run --config vitest.integration.config.ts --reporter=verbose phase2-exit</div>${lines}</div>`;
}

const INSTANCE_READY = `[...document.querySelectorAll('main p')].some((p) => /^Instance: [0-9a-f]{6,}$/.test(p.textContent))`;

/* ── the browser ───────────────────────────────────────────────────────────────────────────── */
class Win {
  constructor(cdp, name, sessionId, targetId, contextId) {
    Object.assign(this, { cdp, name, sessionId, targetId, contextId });
    this.frames = [];
  }

  send(method, params) {
    return this.cdp.send(method, params, this.sessionId);
  }

  async eval(expression) {
    const r = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (r.exceptionDetails)
      throw new Error(
        `${this.name}: ${r.exceptionDetails.exception?.description ?? r.exceptionDetails.text}`,
      );
    return r.result.value;
  }

  async waitFor(expression, what, timeoutMs = 20_000) {
    const until = Date.now() + timeoutMs;
    for (;;) {
      const v = await this.eval(expression).catch(() => undefined);
      if (v) return v;
      if (Date.now() > until) throw new Error(`${this.name}: timed out waiting for ${what}`);
      await sleep(100);
    }
  }

  state() {
    return this.eval(`document.querySelector('[data-state]')?.dataset.state ?? null`);
  }

  instance() {
    return this.eval(
      `[...document.querySelectorAll('main p')].map((p) => p.textContent).find((t) => t.startsWith('Instance: ')) ?? null`,
    );
  }

  rows() {
    return this.eval(
      `[...document.querySelectorAll('ol[aria-label="Messages"] > li')].map((li) => li.innerText.replace(/\\s+/g, ' ').trim())`,
    );
  }

  async load() {
    await this.send('Page.navigate', { url: PAGE_URL });
    await this.waitFor(`document.readyState === 'complete'`, 'the page to load');
    await this.waitFor(INSTANCE_READY, 'an instance id');
    await this.waitFor(
      `document.querySelector('[data-state]')?.dataset.state === 'connected'`,
      'connected',
    );
  }

  /** Opens an address of the stand and waits for the document; the caller waits for its content. */
  async goto(path) {
    await this.send('Page.navigate', { url: `${BASE}${path}` });
    await this.waitFor(`document.readyState === 'complete'`, 'the page to load');
  }

  /** Resizes the window in place (no reload, so a session kept in the page's memory survives). */
  async resize({ width, height }) {
    const { windowId } = await this.cdp.send('Browser.getWindowForTarget', {
      targetId: this.targetId,
    });
    await this.cdp.send('Browser.setWindowBounds', {
      windowId,
      bounds: { width, height: height + WINDOW_EXTRA_HEIGHT },
    });
    await this.waitFor(
      `innerWidth === ${width} && innerHeight === ${height}`,
      `a ${width}x${height} window`,
    );
  }

  async network({ offline, latency = 0 }) {
    await this.send('Network.emulateNetworkConditions', {
      offline,
      latency,
      downloadThroughput: offline ? 0 : -1,
      uploadThroughput: offline ? 0 : -1,
    });
  }

  async screenshot(file) {
    await this.eval('window.__walkHide?.(true)').catch(ignore);
    const { data } = await this.send('Page.captureScreenshot', { format: 'png' });
    await this.eval('window.__walkHide?.(false)').catch(ignore);
    writeFileSync(file, Buffer.from(data, 'base64'));
  }
}

async function openWindow(cdp, name, { width, height }) {
  const { browserContextId } = await cdp.send('Target.createBrowserContext', {
    disposeOnDetach: true,
  });
  const { targetId } = await cdp.send('Target.createTarget', {
    url: 'about:blank',
    browserContextId,
    newWindow: true,
    width,
    height: height + WINDOW_EXTRA_HEIGHT,
  });
  const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
  const w = new Win(cdp, name, sessionId, targetId, browserContextId);
  await w.send('Page.enable');
  await w.send('Runtime.enable');
  await w.send('Network.enable');
  // Every window paints as if focused: headless Chrome otherwise stops sending screencast frames
  // for all but one window.
  await w.send('Emulation.setFocusEmulationEnabled', { enabled: true });
  const size = await w.eval('[innerWidth, innerHeight, devicePixelRatio]');
  if (size[0] !== width || size[1] !== height || size[2] !== SCALE) {
    throw new Error(`${name}: the page is ${size.join('x')}, not ${width}x${height}@${SCALE}`);
  }
  return w;
}

/* ── the recording ─────────────────────────────────────────────────────────────────────────── */
class Walk {
  constructor(cdp, a, b, stage, bgFiles, layout) {
    Object.assign(this, { cdp, a, b, stage, bgFiles, layout });
    // What a scenario in its own file needs from this one.
    Object.assign(this, { base: BASE, stillsRun: STILLS, log, sleep });
    this.scenes = [];
    this.marks = [];
    this.gaps = [];
    this.captions = [];
    this.caption = null;
    this.clicks = new Map();
    this.stills = 0;
    this.start = 0;
    this.end = 0;
  }

  async record() {
    for (const w of [this.a, this.b]) {
      rmSync(join(FRAMES, w.name), { recursive: true, force: true });
      mkdirSync(join(FRAMES, w.name), { recursive: true });
      let n = 0;
      this.cdp.on('Page.screencastFrame', ({ data, metadata, sessionId }, sid) => {
        if (sid !== w.sessionId) return;
        const file = join(FRAMES, w.name, `${String(++n).padStart(6, '0')}.jpg`);
        writeFileSync(file, Buffer.from(data, 'base64'));
        // `w`: the CSS width of the window when the frame was taken (a walk may resize A).
        w.frames.push({ file, t: metadata.timestamp ?? now(), w: metadata.deviceWidth });
        w.send('Page.screencastFrameAck', { sessionId }).catch(ignore);
      });
    }
    this.start = now();
    this.scenes.push({ layout: this.layout, t: this.start });
    for (const w of [this.a, this.b]) {
      await w.send('Page.startScreencast', {
        format: 'jpeg',
        quality: 92,
        // A's frames are as wide as its widest layout; in `pair` its window is narrow anyway.
        maxWidth: w === this.a ? LAYOUTS.solo[0].width : PANE.width,
        maxHeight: PANE.height,
      });
    }
    // Nudge both pages so each sends a first frame at once (a page that never changes sends none).
    for (const w of [this.a, this.b]) {
      await w.eval('window.__walkHide?.(true)').catch(ignore);
      await w
        .eval(
          `(() => { const s = document.documentElement.style; s.opacity = '0.999'; requestAnimationFrame(() => { s.opacity = ''; }); })()`,
        )
        .catch(ignore);
    }
  }

  /**
   * Switches the frame between `pair` and `solo`: A's window is resized in place and a new scene
   * starts. The resize itself is cut out of the video.
   */
  async setLayout(layout) {
    if (layout === this.layout) return;
    const pane = LAYOUTS[layout].find((p) => p.win === 'a');
    await this.skip(async () => {
      await this.a.eval('window.__walkHide?.(true)').catch(ignore);
      await this.a.resize(viewOf(pane));
      await sleep(500);
    });
    this.layout = layout;
    this.scenes.push({ layout, t: now() });
    log(`layout ${layout}`);
  }

  /** Every beat of the script is marked once, in order, or the walk stops. */
  async beat(id, { still = true } = {}) {
    const b = BEAT_LIST[this.marks.length];
    if (b?.id !== id)
      throw new Error(`beat order: the walk reached "${id}", the script has "${b?.id}" here`);
    if (b.caption && b.caption !== this.caption) {
      this.caption = b.caption;
      this.captions.push({ key: b.caption, t: now() });
    }
    this.marks.push({ id, t: now() });
    log(`beat ${this.marks.length}/${BEAT_LIST.length} ${id}`);
    if (still) await this.still('open');
  }

  /** Lets the beat sit on screen as long as the script says. */
  async hold() {
    const b = BEAT_LIST[this.marks.length - 1];
    await sleep((b?.hold ?? 1) * 1000);
  }

  /**
   * --stills: the windows of the current layout as the viewer sees them, in the frame, without
   * the pointer.
   * `holds` (optional): checked right after the first screenshot (B's in `pair`); if it no longer
   * holds, the still is not saved (returns false), so a still never carries a name its picture
   * does not show.
   */
  async still(tag, { holds, settle = 400 } = {}) {
    if (!STILLS) return false;
    const id = this.marks.at(-1)?.id ?? 'pre';
    await sleep(settle);
    const name = `${String(this.stills + 1).padStart(3, '0')}-${id}-${tag}`;
    const panes = LAYOUTS[this.layout];
    const shots = [];
    // B first, as before: it is the window whose state a `holds` check is about.
    for (const pane of [...panes].reverse()) {
      const file = join(FRAMES, `${name}-${pane.win.toUpperCase()}.png`);
      await this[pane.win].screenshot(file);
      shots.unshift(file);
      if (shots.length === 1 && holds && !(await holds())) {
        log(`still ${id}-${tag} skipped: the screen moved on during the capture`);
        return false;
      }
    }
    this.stills += 1;
    composeStill(
      this.bgFiles[bgKey(this.layout, this.caption)],
      panes,
      shots,
      join(STILL_DIR, `${name}.png`),
    );
    return true;
  }

  /** A wait the video should not show (the ping timeout, a reconnect): cut out of the recording. */
  async skip(fn) {
    const a = now();
    const r = await fn();
    await sleep(300);
    this.gaps.push([a, now()]);
    return r;
  }

  async pointAt(w, selector, settle = 560) {
    const box = await w.waitFor(
      `(() => { const el = ${selector}; if (!el) return null; const r = el.getBoundingClientRect(); return r.width ? { x: r.x, y: r.y, w: r.width, h: r.height } : null; })()`,
      `element ${selector}`,
    );
    // A target outside the window (a long form in a short window) is scrolled to first.
    const scrolled = await w.eval(
      `(() => { const el = ${selector}; const r = el.getBoundingClientRect(); if (r.top >= 0 && r.bottom <= innerHeight) return null; el.scrollIntoView({ block: 'center', behavior: 'smooth' }); return true; })()`,
    );
    if (scrolled) {
      await sleep(650);
      Object.assign(
        box,
        await w.eval(
          `(() => { const r = (${selector}).getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; })()`,
        ),
      );
    }
    const x = Math.round(box.x + Math.min(box.w / 2, 48));
    const y = Math.round(box.y + box.h / 2);
    const other = w === this.a ? this.b : this.a;
    await other.eval('window.__walkHide?.(true)').catch(ignore);
    await w.eval(`window.__walkMove(${x}, ${y})`);
    await sleep(settle);
    return { x, y };
  }

  async click(w, selector, after = 400) {
    const { x, y } = await this.pointAt(w, selector);
    const id = this.marks.at(-1)?.id ?? 'pre';
    this.clicks.set(id, (this.clicks.get(id) ?? 0) + 1);
    await this.still('before-click');
    await w.eval(`window.__walkRipple(${x}, ${y})`);
    for (const type of ['mousePressed', 'mouseReleased']) {
      await w.send('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: 1 });
    }
    await sleep(after);
  }

  async type(w, text, delay = 38) {
    for (const ch of text) {
      await w.send('Input.insertText', { text: ch });
      await sleep(delay);
    }
    await sleep(200);
  }

  async enter(w) {
    for (const type of ['keyDown', 'keyUp']) {
      await w.send('Input.dispatchKeyEvent', {
        type,
        key: 'Enter',
        code: 'Enter',
        windowsVirtualKeyCode: 13,
        text: type === 'keyDown' ? '\r' : undefined,
      });
    }
  }

  /** A key with no text (Escape, Tab). */
  async press(w, key, keyCode) {
    for (const type of ['keyDown', 'keyUp']) {
      await w.send('Input.dispatchKeyEvent', {
        type,
        key,
        code: key,
        windowsVirtualKeyCode: keyCode,
      });
    }
    await sleep(250);
  }

  async finish() {
    await sleep(600);
    this.end = now();
    for (const w of [this.a, this.b]) await w.send('Page.stopScreencast').catch(ignore);
    await sleep(300);
    const missing = BEAT_LIST.slice(this.marks.length).map((b) => b.id);
    if (missing.length) throw new Error(`the walk ended before: ${missing.join(', ')}`);
  }

  raw() {
    return {
      walk: WALK,
      start: this.start,
      end: this.end,
      marks: this.marks,
      gaps: this.gaps,
      captions: this.captions,
      a: this.a.frames,
      b: this.b.frames,
      bgFiles: this.bgFiles,
      card: this.card,
      scenes: this.scenes,
      meta: this.meta,
    };
  }
}

function composeStill(bg, panes, shots, out) {
  const f = panes.map((p, i) => `[${i + 1}]scale=${p.width}:${PANE.height}[p${i}]`);
  let last = '0';
  panes.forEach((p, i) => {
    f.push(`[${last}][p${i}]overlay=${p.x}:${PANE.y}[x${i}]`);
    last = `x${i}`;
  });
  ffmpeg(
    [
      '-i',
      bg,
      ...shots.flatMap((s) => ['-i', s]),
      '-filter_complex',
      f.join(';'),
      '-map',
      `[${last}]`,
      '-frames:v',
      '1',
      out,
    ],
    'compose a still',
  );
}

/* ── the scenario (the ticket's steps 4a–e) ────────────────────────────────────────────────── */
const INPUT = `document.querySelector('form[aria-label="Send a message"] input')`;
const SEND = `document.querySelector('form[aria-label="Send a message"] button[type="submit"]')`;
const RETRY = `[...document.querySelectorAll('ol[aria-label="Messages"] > li')].find((li) => li.innerText.includes('Not sent'))?.querySelector('button')`;
const hasRow = (text) =>
  `[...document.querySelectorAll('ol[aria-label="Messages"] > li')].some((li) => li.innerText.includes(${JSON.stringify(text)}))`;

async function send(w, win, text, { viaButton = true } = {}) {
  await w.click(win, INPUT, 150);
  await w.type(win, text);
  if (viaButton) await w.click(win, SEND, 200);
  else await w.enter(win);
}

async function scenario(w) {
  const { a, b } = w;
  const hello = ['Привет! Это окно A', 'Привет, A! Это окно B'];
  const five = [1, 2, 3, 4, 5].map((n) => `Пока B без сети: ${n} из 5`);
  const offlineMsg = 'B: отправлено без сети';

  await w.beat('two-windows');
  await w.hold();

  await w.beat('exchange');
  await send(w, a, hello[0]);
  await b.waitFor(hasRow(hello[0]), 'A’s message in B');
  await sleep(700);
  await send(w, b, hello[1]);
  await a.waitFor(hasRow(hello[1]), 'B’s message in A');
  await w.still('done');
  await w.hold();

  // B offline: only B's page. The socket may notice only at the ping timeout: that wait is cut.
  await b.network({ offline: true });
  await w.skip(() =>
    b.waitFor(
      `document.querySelector('[data-state]')?.dataset.state === 'offline'`,
      'offline',
      90_000,
    ),
  );
  await w.beat('b-offline');
  await w.hold();

  await w.beat('a-sends-five');
  await w.click(a, INPUT, 150);
  for (const text of five) {
    await w.type(a, text, 24);
    await w.enter(a);
    await a.waitFor(
      hasRow(`#${five.indexOf(text) + 3} ${text}`),
      `#${five.indexOf(text) + 3} in A`,
    );
    // The new row pushes the input down: follow it, so the pointer never sits on the feed.
    await w.pointAt(a, INPUT, 200);
  }
  const bRows = await b.rows();
  if (bRows.some((r) => r.includes('Пока B без сети')))
    throw new Error('B got a message while offline');
  await w.still('done');
  await w.hold();

  // Back online on a slow link (latency only), so the short `syncing` state stays on screen long
  // enough to read. The reconnect back-off wait is cut; the catch-up itself is not.
  // A stills run screenshots during `syncing`, so it gives the catch-up longer.
  await b.network({ offline: false, latency: STILLS ? 1500 : 700 });
  await w.skip(() =>
    b.waitFor(
      `['connecting', 'syncing', 'connected'].includes(document.querySelector('[data-state]')?.dataset.state)`,
      'a reconnect attempt',
      30_000,
    ),
  );
  // No `open` still here: it would take long enough to miss `syncing`; the loop takes one instead.
  await w.beat('b-online', { still: false });
  const seen = new Set();
  let syncingStill = false;
  const isSyncing = async () => (await b.state()) === 'syncing';
  const until = Date.now() + 30_000;
  for (;;) {
    const state = await b.state();
    if (state === 'syncing' && !syncingStill) {
      syncingStill = await w.still('syncing', { holds: isSyncing, settle: 0 });
    }
    seen.add(state);
    if (seen.has('syncing') && (await b.state()) === 'connected') break;
    if ((await b.state()) === 'connected' && (await b.rows()).length >= 7) break;
    if (Date.now() > until) throw new Error(`B did not catch up (states ${[...seen].join(', ')})`);
    await sleep(40);
  }
  log(`B states after online: ${[...seen].join(' → ')}`);
  // The caption says `syncing` shows: a run that never saw it must not become the video.
  if (!seen.has('syncing')) throw new Error('B never showed syncing on its way back online');
  if (STILLS && !syncingStill)
    throw new Error('no still caught B in syncing: run the stills walk again');
  await b.network({ offline: false, latency: 0 });
  await b.waitFor(hasRow(`#7 ${five[4]}`), '#7 in B');

  await w.beat('b-caught-up');
  const want = [...hello, ...five].map((t, i) => `#${i + 1} ${t}`);
  for (const [name, win] of [
    ['A', a],
    ['B', b],
  ]) {
    const rows = await win.rows();
    if (JSON.stringify(rows) !== JSON.stringify(want))
      throw new Error(`${name}'s feed is ${JSON.stringify(rows)}`);
  }
  log('feeds: A and B both #1..#7, in order, once');
  await w.hold();

  // B sends with no network: the row fails, Retry after the network is back.
  await b.network({ offline: true });
  await w.skip(() =>
    b.waitFor(
      `document.querySelector('[data-state]')?.dataset.state === 'offline'`,
      'offline',
      90_000,
    ),
  );
  await send(w, b, offlineMsg);
  await b.waitFor(`${hasRow('Not sent')} && !!(${RETRY})`, 'the failed row with Retry');
  await w.beat('b-sends-offline');
  await w.hold();

  await b.network({ offline: false, latency: 0 });
  await w.skip(() =>
    b.waitFor(
      `document.querySelector('[data-state]')?.dataset.state === 'connected'`,
      'connected',
      30_000,
    ),
  );
  await w.beat('b-back-online');
  await w.hold();
  await w.click(b, RETRY, 300);
  await a.waitFor(hasRow(`#8 ${offlineMsg}`), '#8 in A');
  await b.waitFor(hasRow(`#8 ${offlineMsg}`), '#8 in B');
  await sleep(500);

  await w.beat('retried');
  for (const [name, win] of [
    ['A', a],
    ['B', b],
  ]) {
    const rows = await win.rows();
    const hits = rows.filter((r) => r.includes(offlineMsg));
    if (hits.length !== 1 || hits[0] !== `#8 ${offlineMsg}` || rows.length !== 8) {
      throw new Error(`${name} after Retry: ${JSON.stringify(rows)}`);
    }
  }
  log('retry: one #8 in A and in B');
  await w.hold();
}

/* ── assembly: frames → one 30 fps video with the waits cut out ────────────────────────────── */
// Every part is limited-range yuv420p and says so. The window frames are JPEG (full range) and the
// backgrounds and the card are PNG: left as they come, the parts differ and the joined file changes
// colour range where the card starts.
const X264 = [
  '-c:v',
  'libx264',
  '-crf',
  '17',
  '-preset',
  'veryfast',
  '-pix_fmt',
  'yuv420p',
  '-color_range',
  'tv',
];
const TV_RANGE = 'in_range=pc:out_range=tv,format=yuv420p';
/** The same tags on every part (BT.601 is what JPEG frames and swscale's RGB conversion use). */
const TAGS = (() => {
  // setparams has `chroma_location` only in newer ffmpeg; an older one stops on the unknown option
  // after the whole walk is recorded. Without it the parts still carry the same range and matrix.
  const help = spawnSync('ffmpeg', ['-hide_banner', '-h', 'filter=setparams'], {
    encoding: 'utf8',
  });
  const chroma = /\bchroma_location\b/.test(`${help.stdout}${help.stderr}`);
  return `setparams=range=tv:colorspace=bt470bg${chroma ? ':chroma_location=left' : ''}`;
})();

function assemble(raw) {
  const { start, end, gaps } = raw;
  const removedBefore = (t) => gaps.reduce((s, [a, b]) => s + Math.max(0, Math.min(t, b) - a), 0);
  const inGap = (t) => gaps.some(([a, b]) => t >= a && t < b);
  const master = (t) => Math.max(0, t - start - removedBefore(t));
  // With a closing card the windows end where the card's beat starts; the card follows as a still.
  const cardMark = raw.card ? raw.marks.find((m) => m.id === raw.card.beat) : undefined;
  const mainDuration = master(cardMark ? cardMark.t : end);
  const captions = raw.captions.filter((c) => !cardMark || c.t < cardMark.t);

  // Each window's frames on the master clock.
  const kept = {};
  for (const side of ['a', 'b']) {
    const frames = raw[side];
    // Chrome sends a frame only when the picture changes: keep the last frame of each wait, moved to
    // the wait's end, or the picture from before the wait would show after it.
    const list = frames.filter((f) => !inGap(f.t));
    for (const [a, b] of gaps) {
      const last = frames.filter((f) => f.t >= a && f.t < b).at(-1);
      if (last) list.push({ ...last, t: b });
    }
    list.sort((x, y) => x.t - y.t);
    kept[side] = list.map((f) => ({ file: f.file, at: master(f.t), w: f.w }));
    log(`window ${side.toUpperCase()}: ${frames.length} frames, ${list.length} kept`);
  }

  // Caption segments on the master clock.
  const segs = captions.map((c, i) => ({
    key: c.key,
    from: master(c.t),
    to: i + 1 < captions.length ? master(captions[i + 1].t) : mainDuration,
  }));

  // One scene per layout switch (one scene for a walk that never switches).
  const scenes = (raw.scenes ?? [{ layout: 'pair', t: start }])
    .map((s, i, all) => ({
      layout: s.layout,
      from: i === 0 ? 0 : master(s.t),
      to: i + 1 < all.length ? Math.min(master(all[i + 1].t), mainDuration) : mainDuration,
    }))
    .filter((s) => s.to - s.from > 0.05);
  const parts = scenes.map((scene, n) => assembleScene(raw, scene, n, kept, segs));

  let duration = mainDuration;
  const marks = raw.marks.map((m) => ({ id: m.id, at: Math.round(master(m.t) * 1000) / 1000 }));
  const mp4 = join(OUT, 'recording.mp4');
  if (raw.card) {
    const hold = BEATS.find((b) => b.id === raw.card.beat)?.hold ?? 4;
    const tail = join(FRAMES, 'card.mp4');
    ffmpeg(
      [
        '-loop',
        '1',
        '-i',
        raw.card.file,
        '-t',
        String(hold),
        '-r',
        String(FPS),
        '-vf',
        `scale=out_range=tv,format=yuv420p,${TAGS}`,
        ...X264,
        tail,
      ],
      'render the closing card',
    );
    parts.push(tail);
    const card = marks.find((m) => m.id === raw.card.beat);
    if (card) card.at = Math.round(mainDuration * 1000) / 1000;
    segs.push({ key: raw.card.key, from: mainDuration, to: mainDuration + hold });
    duration += hold;
  }
  if (parts.length > 1) {
    const cat = join(FRAMES, 'cat.txt');
    writeFileSync(cat, parts.map((part) => `file '${part}'\n`).join(''));
    ffmpeg(
      ['-f', 'concat', '-safe', '0', '-i', cat, '-c', 'copy', '-movflags', '+faststart', mp4],
      'join the scenes',
    );
  } else {
    ffmpeg(['-i', parts[0], '-c', 'copy', '-movflags', '+faststart', mp4], 'write the video');
  }

  writeFileSync(join(OUT, 'captions.srt'), srt(segs));
  const posterAt = marks.find((m) => m.id === (SCRIPT.POSTER ?? 'b-caught-up'))?.at ?? 1;
  ffmpeg(
    ['-ss', (posterAt + 1).toFixed(3), '-i', mp4, '-frames:v', '1', join(OUT, 'poster.png')],
    'cut the poster',
  );
  writeFileSync(
    join(OUT, 'timeline.json'),
    JSON.stringify(
      {
        walk: WALK,
        duration,
        marks,
        captions: segs,
        scenes: scenes.map((sc) => ({ layout: sc.layout, from: sc.from, to: sc.to })),
        ...raw.meta,
      },
      null,
      1,
    ),
  );
  log(`video ${duration.toFixed(1)} s -> ${mp4}`);
}

/** One scene: the windows of its layout over the background, with the captions of its time span. */
function assembleScene(raw, scene, n, kept, segs) {
  const panes = LAYOUTS[scene.layout];
  const length = scene.to - scene.from;
  const inputs = [];
  panes.forEach((pane) => {
    // Only frames taken at this layout's window size: around a switch A has frames of both.
    const sized = kept[pane.win].filter(
      (f) => f.w === undefined || Math.abs(f.w - viewOf(pane).width) < 2,
    );
    const inside = sized.filter((f) => f.at >= scene.from && f.at < scene.to);
    const before = sized.filter((f) => f.at < scene.from).at(-1);
    const list = [...(before ? [before] : []), ...inside];
    if (!list.length)
      throw new Error(`no frames from window ${pane.win.toUpperCase()} for scene ${n + 1}`);
    const entries = ['ffconcat version 1.0'];
    for (let k = 0; k < list.length; k++) {
      const from = k === 0 ? scene.from : list[k].at;
      const to = k + 1 < list.length ? list[k + 1].at : scene.to;
      entries.push(`file '${list[k].file}'`, `duration ${Math.max(0.001, to - from).toFixed(4)}`);
    }
    entries.push(`file '${list.at(-1).file}'`);
    const file = join(FRAMES, `scene${n}-${pane.win}.ffconcat`);
    writeFileSync(file, entries.join('\n'));
    inputs.push('-f', 'concat', '-safe', '0', '-i', file);
  });
  const own = segs
    .map((s) => ({ key: s.key, from: Math.max(s.from, scene.from), to: Math.min(s.to, scene.to) }))
    .filter((s) => s.to > s.from);
  const bgKeys = [...new Set(own.map((s) => s.key))];
  // A recording from before layouts keyed its backgrounds `none` and `<caption>`; it is all `pair`.
  const bgFile = (caption) => {
    const file =
      raw.bgFiles[bgKey(scene.layout, caption)] ??
      (raw.scenes ? undefined : raw.bgFiles[caption ?? 'none']);
    if (!file)
      throw new Error(
        `no background for "${caption ?? 'none'}" (${scene.layout}) in this recording: record the walk again`,
      );
    return file;
  };
  inputs.push('-loop', '1', '-i', bgFile());
  for (const k of bgKeys) inputs.push('-loop', '1', '-i', bgFile(k));
  const bg = panes.length;
  const f = panes.map(
    (pane, i) =>
      `[${i}]fps=${FPS},scale=${pane.width}:${PANE.height}:${TV_RANGE},setpts=PTS-STARTPTS[p${i}]`,
  );
  f.push(`[${bg}]fps=${FPS},scale=out_range=tv,format=yuv420p[bg0]`);
  let last = 'bg0';
  own.forEach((s, i) => {
    const idx = bg + 1 + bgKeys.indexOf(s.key);
    f.push(
      `[${last}][${idx}]overlay=0:0:enable='between(t,${(s.from - scene.from).toFixed(3)},${(s.to - scene.from).toFixed(3)})'[c${i}]`,
    );
    last = `c${i}`;
  });
  panes.forEach((pane, i) => {
    const out = i + 1 < panes.length ? `[x${i}]` : `,format=yuv420p,${TAGS}[v]`;
    f.push(`[${last}][p${i}]overlay=${pane.x}:${PANE.y}:eof_action=repeat${out}`);
    last = `x${i}`;
  });
  const file = join(FRAMES, `scene${n}.mp4`);
  ffmpeg(
    [
      ...inputs,
      '-filter_complex',
      f.join(';'),
      '-map',
      '[v]',
      '-t',
      length.toFixed(3),
      '-r',
      String(FPS),
      ...X264,
      file,
    ],
    `assemble scene ${n + 1} (${scene.layout})`,
  );
  return file;
}

function srt(segs) {
  const ts = (s) => {
    const ms = Math.round(s * 1000);
    const p = (n, w = 2) => String(n).padStart(w, '0');
    return `${p(Math.floor(ms / 3_600_000))}:${p(Math.floor(ms / 60_000) % 60)}:${p(Math.floor(ms / 1000) % 60)},${p(ms % 1000, 3)}`;
  };
  return segs
    .map((s, i) => `${i + 1}\n${ts(s.from)} --> ${ts(s.to)}\n${CAPTIONS[s.key]}\n`)
    .join('\n');
}

/* ── main ──────────────────────────────────────────────────────────────────────────────────── */
async function renderStage(stage, html, file) {
  await stage.send('Page.navigate', { url: 'about:blank' });
  const { frameTree } = await stage.send('Page.getFrameTree');
  await stage.send('Page.setDocumentContent', { frameId: frameTree.frame.id, html });
  await sleep(150);
  const { data } = await stage.send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(file, Buffer.from(data, 'base64'));
}

async function bindToDifferentReplicas(a, b) {
  await a.load();
  await b.load();
  for (let i = 0; i < 8; i++) {
    const [ia, ib] = [await a.instance(), await b.instance()];
    if (ia !== ib) return [ia.replace('Instance: ', ''), ib.replace('Instance: ', '')];
    log(`both windows on ${ia}: clearing B's cookies and reloading`);
    await b.send('Network.clearBrowserCookies');
    await b.load();
  }
  throw new Error('A and B stayed on one replica: is the second api replica up?');
}

/** The UL-135 walk: both windows on /prototype, on different api replicas, the channel empty. */
const PROTOTYPE = {
  layout: 'pair',
  async prepare({ a, b }) {
    const instances = await bindToDifferentReplicas(a, b);
    log(`instances: A ${instances[0]}, B ${instances[1]}`);
    const rows = [...(await a.rows()), ...(await b.rows())];
    if (rows.length)
      throw new Error(`the test channel is not empty (${rows.length} rows): reset the stand first`);
    return { instances: { A: instances[0], B: instances[1] } };
  },
  scenario,
};

async function main() {
  if (argv.assemble) {
    assemble(RECORDED);
    return;
  }
  const host = new URL(BASE).hostname;
  if (!['127.0.0.1', 'localhost', '[::1]'].includes(host))
    throw new Error(`the walk runs on the local stand only, not ${host}`);
  /**
   * A walk in its own file exports `scenario(w)` and may export `layout` (the first one),
   * `chromeEnv`, and `prepare({ cdp, a, b, base, log })`, which runs before the recording starts
   * and returns what goes into timeline.json and stills.json.
   */
  const def = WALK === 'prototype' ? PROTOTYPE : await import(`./scenario-${WALK}.mjs`);
  const firstLayout = def.layout ?? 'pair';
  rmSync(LOG, { force: true });
  if (STILLS) {
    rmSync(STILL_DIR, { recursive: true, force: true });
    mkdirSync(STILL_DIR, { recursive: true });
  }
  mkdirSync(FRAMES, { recursive: true });
  // The previous walk's frames go once a new walk owns the pointer; only our own temp dirs.
  // Only a directory an earlier walk created itself (never DEMO_WALK_FRAMES), and only after
  // the canonical-path and owner checks.
  const prev = previousFrames;
  if (prev?.created && prev.dir !== FRAMES && isOwnFramesDir(prev.dir)) {
    rmSync(prev.dir, { recursive: true, force: true });
  }
  writeFileSync(FRAMES_POINTER, `${JSON.stringify({ dir: FRAMES, created: FRAMES_CREATED })}\n`);
  log(
    `walk ${WALK} ${new Date().toISOString()} on ${WALK === 'prototype' ? PAGE_URL : BASE}${STILLS ? ' (stills)' : ''}`,
  );

  const chrome = await launchChrome({
    args: [
      `--force-device-scale-factor=${SCALE}`,
      '--lang=en-US',
      '--disable-renderer-backgrounding',
      '--disable-backgrounding-occluded-windows',
      '--disable-background-timer-throttling',
    ],
    env: def.chromeEnv,
  });
  log(`Chrome pid ${chrome.pid} (own headless profile)`);
  const stop = () => {
    void chrome.close().finally(() => process.exit(130));
  };
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
  try {
    const { cdp } = chrome;
    const stage = await openWindow(cdp, 'stage', {
      width: FRAME.width / SCALE,
      height: FRAME.height / SCALE,
    });
    const bgFiles = {};
    for (const layout of Object.keys(LAYOUTS)) {
      for (const [key, text] of [[undefined, ''], ...Object.entries(CAPTIONS)]) {
        const file = join(FRAMES, `bg-${layout}-${key ?? 'none'}.png`);
        bgFiles[bgKey(layout, key)] = file;
        await renderStage(stage, backgroundHtml(text, layout), file);
      }
    }
    /** The closing card: `{ beat, key, file }`. A test log (UL-135) or the script's `CARD`. */
    let card;
    if (TEST_LOG) {
      card = { beat: 'test-run', key: 'tests', file: join(FRAMES, 'card.png') };
      await renderStage(
        stage,
        testCardHtml(CAPTIONS.tests, readFileSync(TEST_LOG, 'utf8')),
        card.file,
      );
    } else if (SCRIPT.CARD) {
      card = { beat: SCRIPT.CARD.beat, key: SCRIPT.CARD.caption, file: join(FRAMES, 'card.png') };
      await renderStage(stage, listCardHtml(CAPTIONS[card.key], SCRIPT.CARD), card.file);
    }

    const a = await openWindow(cdp, 'A', viewOf(LAYOUTS[firstLayout][0]));
    const b = await openWindow(cdp, 'B', VIEW);
    for (const w of [a, b])
      await w.send('Page.addScriptToEvaluateOnNewDocument', { source: OVERLAY });
    const meta = (await def.prepare?.({ cdp, a, b, base: BASE, log })) ?? {};

    const w = new Walk(cdp, a, b, stage, bgFiles, firstLayout);
    w.meta = meta;
    w.card = card;
    await w.record();
    await sleep(500);
    await def.scenario(w);
    if (card) {
      await w.beat(card.beat, { still: false });
      if (STILLS)
        copyFileSync(
          card.file,
          join(STILL_DIR, `${String(++w.stills).padStart(3, '0')}-${card.beat}-open.png`),
        );
    }
    await w.finish();
    writeFileSync(join(FRAMES, 'raw.json'), JSON.stringify(w.raw()));
    if (!STILLS) assemble(w.raw());
    else
      writeFileSync(
        join(OUT, 'stills.json'),
        JSON.stringify({ walk: WALK, ...w.meta, beats: w.marks.map((m) => m.id) }, null, 1),
      );
  } finally {
    await chrome.close();
    log('Chrome closed');
  }
}

main().catch((err) => {
  log(
    `STOPPED: ${String(err?.stack ?? err)
      .split('\n')
      .slice(0, 4)
      .join(' | ')}`,
  );
  process.exitCode = 1;
});
