#!/usr/bin/env node
// The click-through demo from a stills walk: one step per still, a short caption, next/prev
// buttons and the arrow keys. Writes <out>/index.html next to <out>/stills/, so the folder is the
// whole demo and opens from disk with no server.
//
//   node tools/demo-walk/walk.mjs --out <dir> --stills
//   node tools/demo-walk/guide.mjs --out <dir>
//
// Each step names a still as `<beat>:<tag>` (beats.mjs GUIDE); the walk saves stills as
// `NNN-<beat>-<tag>.png`, where the tag is `open`, `done` or `before-click` (`#n` = the n-th).
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { GUIDE } from './beats.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const { values: argv } = parseArgs({ options: { out: { type: 'string' } } });
const OUT = resolve(argv.out ?? join(HERE, 'out'));
const STILLS = join(OUT, 'stills');
if (!existsSync(STILLS)) throw new Error(`no stills in ${STILLS}: run walk.mjs --stills first`);

const files = readdirSync(STILLS)
  .filter((f) => f.endsWith('.png'))
  .sort();
const meta = existsSync(join(OUT, 'stills.json'))
  ? JSON.parse(readFileSync(join(OUT, 'stills.json'), 'utf8'))
  : {};

function still(ref) {
  const [beat, rawTag = 'open'] = ref.split(':');
  const [tag, nth = '1'] = rawTag.split('#');
  const hits = files.filter((f) => f.replace(/^\d{3}-/, '') === `${beat}-${tag}.png`);
  return hits[Number(nth) - 1];
}

const steps = [];
for (const step of GUIDE.steps) {
  const file = still(step.still);
  if (!file) {
    if (step.optional) continue;
    throw new Error(`no still for ${step.still}`);
  }
  steps.push({ src: `stills/${file}`, text: step.text });
}

const esc = (s) =>
  s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const instances = meta.instances
  ? `Окно A — instance ${meta.instances.A}, окно B — instance ${meta.instances.B}.`
  : '';

const html = `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Прототип фазы 2</title>
<style>
  :root { --bg: #f8fafc; --fg: #0f172a; --muted: #475569; --card: #fff; --line: #e2e8f0; --accent: #2563eb; --on-accent: #fff; }
  @media (prefers-color-scheme: dark) { :root { --bg: #0b1120; --fg: #e2e8f0; --muted: #94a3b8; --card: #111827; --line: #1e293b; --accent: #60a5fa; --on-accent: #0b1120; } }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg); color: var(--fg); font: 16px/1.5 -apple-system, 'Segoe UI', Roboto, Arial, sans-serif; }
  main { max-width: 1240px; margin: 0 auto; padding: 24px 16px 40px; }
  h1 { font-size: 24px; margin: 0 0 6px; letter-spacing: -.3px; }
  .lede { color: var(--muted); margin: 0 0 18px; max-width: 900px; }
  figure { margin: 0; background: var(--card); border: 1px solid var(--line); border-radius: 10px; overflow: hidden; }
  figure img { display: block; width: 100%; height: auto; aspect-ratio: 16 / 9; background: #0f172a; }
  figcaption { padding: 14px 18px; font-size: 18px; min-height: 4.2em; }
  .bar { display: flex; align-items: center; gap: 12px; margin-top: 14px; flex-wrap: wrap; }
  button { font: inherit; padding: 8px 16px; border-radius: 8px; border: 1px solid var(--line); background: var(--card); color: var(--fg); cursor: pointer; }
  button.primary { background: var(--accent); border-color: var(--accent); color: var(--on-accent); }
  button:disabled { opacity: .4; cursor: default; }
  button:focus-visible, .dots button:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
  .count { color: var(--muted); min-width: 7em; }
  .dots { display: flex; gap: 6px; flex-wrap: wrap; margin-left: auto; }
  .dots button { width: 14px; height: 14px; padding: 0; border-radius: 50%; background: var(--line); border: 0; }
  .dots button[aria-current="step"] { background: var(--accent); }
  .hint { color: var(--muted); font-size: 14px; margin-top: 10px; }
</style>
</head>
<body>
<main>
  <h1>${esc(GUIDE.title)}</h1>
  <p class="lede">${esc(GUIDE.lede)} ${esc(instances)}</p>
  <figure>
    <img id="shot" alt="" width="1920" height="1080">
    <figcaption id="text" aria-live="polite"></figcaption>
  </figure>
  <div class="bar">
    <button id="prev" type="button">← Назад</button>
    <button id="next" type="button" class="primary">Дальше →</button>
    <span class="count" id="count"></span>
    <nav class="dots" id="dots" aria-label="Шаги"></nav>
  </div>
  <p class="hint">Стрелки ← → листают шаги, Home и End — к первому и последнему.</p>
</main>
<script>
  const STEPS = ${JSON.stringify(steps).replace(/</g, '\\u003c')};
  const shot = document.getElementById('shot');
  const text = document.getElementById('text');
  const count = document.getElementById('count');
  const prev = document.getElementById('prev');
  const next = document.getElementById('next');
  const dots = document.getElementById('dots');
  STEPS.forEach((s, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('aria-label', 'Шаг ' + (i + 1));
    b.addEventListener('click', () => go(i));
    dots.appendChild(b);
  });
  let at = 0;
  function go(i) {
    at = Math.max(0, Math.min(STEPS.length - 1, i));
    const s = STEPS[at];
    shot.src = s.src;
    shot.alt = s.text;
    text.textContent = s.text;
    count.textContent = 'Шаг ' + (at + 1) + ' из ' + STEPS.length;
    prev.disabled = at === 0;
    next.disabled = at === STEPS.length - 1;
    [...dots.children].forEach((d, k) => (k === at ? d.setAttribute('aria-current', 'step') : d.removeAttribute('aria-current')));
    if (location.hash !== '#' + (at + 1)) history.replaceState(null, '', '#' + (at + 1));
    for (const k of [at - 1, at + 1]) if (STEPS[k]) new Image().src = STEPS[k].src;
  }
  prev.addEventListener('click', () => go(at - 1));
  next.addEventListener('click', () => go(at + 1));
  document.addEventListener('keydown', (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.key === 'ArrowRight' || e.key === 'PageDown') go(at + 1);
    else if (e.key === 'ArrowLeft' || e.key === 'PageUp') go(at - 1);
    else if (e.key === 'Home') go(0);
    else if (e.key === 'End') go(STEPS.length - 1);
    else return;
    e.preventDefault();
  });
  go((parseInt(location.hash.slice(1), 10) || 1) - 1);
</script>
</body>
</html>
`;
writeFileSync(join(OUT, 'index.html'), html);
console.log(`${steps.length} steps -> ${join(OUT, 'index.html')}`);
