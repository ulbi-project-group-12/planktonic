// Tests for scripts/check-product-name.mjs (D-35). Run: `pnpm test:root`.
//
// Each case builds a throwaway git repo whose single source declares a neutral fixture
// name ('Acme Chat' / 'acme-chat'), so this file never contains the real product name.
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { after, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const guardPath = join(dirname(fileURLToPath(import.meta.url)), 'check-product-name.mjs');

const PRODUCT_SOURCE = [
  "export const PRODUCT_DISPLAY_NAME = 'Acme Chat';",
  "export const PRODUCT_SLUG = 'acme-chat';",
  'export const PRODUCT_IMAGE_PREFIX = PRODUCT_SLUG;',
  '',
].join('\n');

/** @type {string[]} */
const fixtures = [];

after(() => {
  for (const dir of fixtures) rmSync(dir, { recursive: true, force: true });
});

/**
 * Build a fixture repo. `tracked` files are `git add`-ed, `untracked` ones are only written.
 *
 * @param {{
 *   tracked?: Record<string, string | Buffer>,
 *   untracked?: Record<string, string | Buffer>,
 *   withSource?: boolean,
 * }} [spec]
 */
function makeRepo({ tracked = {}, untracked = {}, withSource = true } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'name-guard-'));
  fixtures.push(dir);
  execFileSync('git', ['init', '-q'], { cwd: dir });
  /** @type {Record<string, string | Buffer>} */
  const toTrack = {
    'package.json': `${JSON.stringify({ name: 'fixture', private: true, type: 'module' })}\n`,
    ...tracked,
  };
  if (withSource) toTrack['packages/config/product.ts'] = PRODUCT_SOURCE;
  const write = (/** @type {Record<string, string | Buffer>} */ files) => {
    for (const [path, content] of Object.entries(files)) {
      mkdirSync(dirname(join(dir, path)), { recursive: true });
      writeFileSync(join(dir, path), content);
    }
  };
  write(toTrack);
  write(untracked);
  execFileSync('git', ['add', '--', ...Object.keys(toTrack)], { cwd: dir });
  return dir;
}

/**
 * @param {string} dir
 * @param {string[]} [args]
 */
function runGuard(dir, args = []) {
  const result = spawnSync(process.execPath, [guardPath, '--root', dir, ...args], {
    encoding: 'utf8',
  });
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
}

describe('check-product-name', () => {
  it('passes a clean tree and reports the tracked file count', () => {
    const dir = makeRepo({ tracked: { 'src/a.ts': 'export const x = 1;\n' } });
    const { status, stdout } = runGuard(dir);
    assert.equal(status, 0);
    assert.match(stdout, /tracked files clean/);
  });

  it('fails on the lowercase slug in a tracked source file and names file:line', () => {
    const dir = makeRepo({ tracked: { 'src/a.ts': "const image = 'acme-chat-web';\n" } });
    const { status, stderr } = runGuard(dir);
    assert.equal(status, 1);
    assert.ok(stderr.includes('src/a.ts:1:'), stderr);
  });

  it('matches the display name case-insensitively', () => {
    const dir = makeRepo({ tracked: { 'notes.txt': 'one\ntwo\nWELCOME TO ACME CHAT\n' } });
    const { status, stderr } = runGuard(dir);
    assert.equal(status, 1);
    assert.ok(stderr.includes('notes.txt:3:'), stderr);
  });

  it('honours the allowlist: source, README.md, .planning/** and .claude/CLAUDE.md', () => {
    const dir = makeRepo({
      tracked: {
        'README.md': '# Acme Chat\n',
        '.planning/x.md': 'acme-chat roadmap\n',
        '.claude/CLAUDE.md': 'Acme Chat project notes\n',
        'pnpm-lock.yaml': "lockfileVersion: '9.0'\n# acme-chat\n",
      },
    });
    const { status, stdout, stderr } = runGuard(dir);
    assert.equal(status, 0, stderr);
    assert.match(stdout, /tracked files clean/);
  });

  it('does not exempt a nested README.md (exact paths, not basenames)', () => {
    const dir = makeRepo({ tracked: { 'docs/README.md': 'About Acme Chat\n' } });
    const { status, stderr } = runGuard(dir);
    assert.equal(status, 1);
    assert.ok(stderr.includes('docs/README.md:1:'), stderr);
  });

  it('ignores untracked files', () => {
    const dir = makeRepo({ untracked: { 'scratch.txt': 'acme-chat draft\n' } });
    const { status, stderr } = runGuard(dir);
    assert.equal(status, 0, stderr);
  });

  it('fails closed with exit 2 when the single source is missing', () => {
    const dir = makeRepo({ withSource: false });
    const { status, stderr } = runGuard(dir);
    assert.equal(status, 2);
    assert.match(stderr, /packages\/config\/product\.ts/);
  });

  it('fails closed with exit 2 when the slug is not lowercase and hyphen-safe', () => {
    const dir = makeRepo({
      withSource: false,
      tracked: {
        'packages/config/product.ts': PRODUCT_SOURCE.replace("'acme-chat'", "'Acme Chat'"),
      },
    });
    const { status } = runGuard(dir);
    assert.equal(status, 2);
  });

  it('fails closed with exit 2 when an export is missing', () => {
    const dir = makeRepo({
      withSource: false,
      tracked: { 'packages/config/product.ts': "export const PRODUCT_SLUG = 'acme-chat';\n" },
    });
    const { status } = runGuard(dir);
    assert.equal(status, 2);
  });

  // R2 WR-03: one NUL byte used to switch off the UTF-8 scan of the whole file.
  it('fails on a UTF-8 name in a file that contains a NUL byte', () => {
    const dir = makeRepo({
      tracked: { 'logo.bin': 'acme-chat\0binary\n', 'notes.md': 'Welcome to Acme Chat\n\0\n' },
    });
    const { status, stderr } = runGuard(dir);
    assert.equal(status, 1);
    assert.ok(stderr.includes('logo.bin: product name literal in a file with NUL bytes'), stderr);
    assert.ok(stderr.includes('notes.md: product name literal in a file with NUL bytes'), stderr);
  });

  it('fails on a UTF-16LE name at an odd byte offset in a binary file', () => {
    const bytes = Buffer.concat([Buffer.from([0x01]), Buffer.from('acme-chat', 'utf16le')]);
    const dir = makeRepo({ tracked: { 'odd.bin': bytes } });
    const { status, stderr } = runGuard(dir);
    assert.equal(status, 1);
    assert.ok(stderr.includes('odd.bin: product name literal in a file with NUL bytes'), stderr);
  });

  it('fails on an ASCII name in a file with a UTF-16 BOM and a NUL byte', () => {
    const bytes = Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from('acme-chat\0\n')]);
    const dir = makeRepo({ tracked: { 'bom.txt': bytes } });
    const { status, stderr } = runGuard(dir);
    assert.equal(status, 1);
    assert.ok(stderr.includes('bom.txt: product name literal in a file with NUL bytes'), stderr);
  });

  it('passes a clean binary file and reports how it was checked', () => {
    const bytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x00, 0x01, 0x02, 0xff, 0x00]);
    const dir = makeRepo({ tracked: { 'logo.png': bytes } });
    const { status, stdout, stderr } = runGuard(dir);
    assert.equal(status, 0, stderr);
    assert.match(stdout, /1 binary file\(s\) checked as a whole/);
  });

  // WR-05: paths and UTF-16 text used to pass unchecked.
  it('fails on the name in a tracked directory or file name', () => {
    const dir = makeRepo({
      tracked: { 'docs/acme-chat-notes/a.txt': 'clean\n', 'apps/Acme-Chat-bot.ts': 'x\n' },
    });
    const { status, stderr } = runGuard(dir);
    assert.equal(status, 1);
    assert.ok(stderr.includes('docs/acme-chat-notes/a.txt: product name in a path'), stderr);
    assert.ok(stderr.includes('apps/Acme-Chat-bot.ts: product name in a path'), stderr);
  });

  it('does not flag allowlisted paths', () => {
    const dir = makeRepo({ tracked: { '.planning/acme-chat/notes.md': 'Acme Chat\n' } });
    const { status, stderr } = runGuard(dir);
    assert.equal(status, 0, stderr);
  });

  it('fails on the name in UTF-16LE text with a BOM and names file:line', () => {
    const text = Buffer.concat([
      Buffer.from([0xff, 0xfe]),
      Buffer.from('first\nWelcome to Acme Chat\n', 'utf16le'),
    ]);
    const dir = makeRepo({ tracked: { 'notes-utf16.txt': text } });
    const { status, stderr } = runGuard(dir);
    assert.equal(status, 1);
    assert.ok(stderr.includes('notes-utf16.txt:2:'), stderr);
  });

  it('fails on the name in UTF-16BE text with a BOM', () => {
    const le = Buffer.from('acme-chat\n', 'utf16le');
    const be = Buffer.from(le).swap16();
    const dir = makeRepo({ tracked: { 'be.txt': Buffer.concat([Buffer.from([0xfe, 0xff]), be]) } });
    const { status, stderr } = runGuard(dir);
    assert.equal(status, 1);
    assert.ok(stderr.includes('be.txt:1:'), stderr);
  });

  it('fails on the name in UTF-16LE text without a BOM', () => {
    const dir = makeRepo({ tracked: { 'nobom.txt': Buffer.from('see acme-chat\n', 'utf16le') } });
    const { status, stderr } = runGuard(dir);
    assert.equal(status, 1);
    assert.ok(stderr.includes('nobom.txt: product name literal in a file with NUL bytes'), stderr);
  });

  // WR-06: the image prefix must match the repo-derived name release.yml pushes under.
  it('passes when the image prefix matches --expect-image-prefix, case-insensitively', () => {
    const dir = makeRepo();
    const { status, stderr } = runGuard(dir, ['--expect-image-prefix', 'Acme-Chat']);
    assert.equal(status, 0, stderr);
  });

  it('fails when the image prefix differs from --expect-image-prefix', () => {
    const dir = makeRepo();
    const { status, stderr } = runGuard(dir, ['--expect-image-prefix', 'renamed-repo']);
    assert.equal(status, 1);
    assert.match(stderr, /PRODUCT_IMAGE_PREFIX "acme-chat" does not match/);
  });

  it('fails closed with exit 2 when the image prefix carries a registry or owner', () => {
    const dir = makeRepo({
      withSource: false,
      tracked: {
        'packages/config/product.ts': PRODUCT_SOURCE.replace(
          'PRODUCT_IMAGE_PREFIX = PRODUCT_SLUG',
          'PRODUCT_IMAGE_PREFIX = `ghcr.io/example-org/${PRODUCT_SLUG}`',
        ),
      },
    });
    const { status, stderr } = runGuard(dir);
    assert.equal(status, 2);
    assert.match(stderr, /no registry or owner/);
  });
});
