// Tests for scripts/check-pins.mjs (D-07). Run: `pnpm test:root`.
//
// Each case writes a throwaway workspace (root package.json, pnpm-workspace.yaml and one
// package) and runs the guard with that directory as its working directory.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { after, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const guardPath = join(dirname(fileURLToPath(import.meta.url)), 'check-pins.mjs');

const WORKSPACE = [
  'packages:',
  '  - apps/*',
  '  - packages/*',
  '',
  '# 14 days, in minutes',
  'minimumReleaseAge: 20160',
  "savePrefix: ''",
  '',
  'catalog:',
  "  '@eslint/js': 10.0.1",
  '  eslint: 10.13.0',
  '  zod: 4.6.7',
  '',
].join('\n');

const ROOT_MANIFEST = { name: '@app/root', private: true, devDependencies: { eslint: 'catalog:' } };
const APP_MANIFEST = {
  name: '@app/web',
  private: true,
  dependencies: { zod: 'catalog:', '@app/contracts': 'workspace:*' },
};

/** @type {string[]} */
const fixtures = [];

after(() => {
  for (const dir of fixtures) rmSync(dir, { recursive: true, force: true });
});

/**
 * Build a fixture workspace. `files` overrides or adds files; objects are written as JSON.
 *
 * @param {Record<string, string | object>} [files]
 */
function makeWorkspace(files = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'check-pins-'));
  fixtures.push(dir);
  /** @type {Record<string, string | object>} */
  const all = {
    'package.json': ROOT_MANIFEST,
    'pnpm-workspace.yaml': WORKSPACE,
    'apps/web/package.json': APP_MANIFEST,
    ...files,
  };
  for (const [path, content] of Object.entries(all)) {
    mkdirSync(dirname(join(dir, path)), { recursive: true });
    writeFileSync(join(dir, path), typeof content === 'string' ? content : JSON.stringify(content));
  }
  return dir;
}

/** @param {string} dir */
function runGuard(dir) {
  const result = spawnSync(process.execPath, [guardPath], { cwd: dir, encoding: 'utf8' });
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
}

describe('check-pins', () => {
  it('passes exact pins and counts manifests and catalog entries', () => {
    const { status, stdout, stderr } = runGuard(makeWorkspace());
    assert.equal(status, 0, stderr);
    assert.match(stdout, /^check-pins: 3 catalog entries OK$/m);
    assert.match(stdout, /^check-pins: 2 manifests OK$/m);
  });

  it('fails on a range in the catalog', () => {
    const dir = makeWorkspace({
      'pnpm-workspace.yaml': WORKSPACE.replace('zod: 4.6.7', 'zod: ^4.6.7'),
    });
    const { status, stderr } = runGuard(dir);
    assert.equal(status, 1);
    assert.match(stderr, /catalog zod = "\^4\.6\.7"/);
  });

  it('fails on a range in a package manifest', () => {
    const dir = makeWorkspace({
      'apps/web/package.json': { ...APP_MANIFEST, dependencies: { zod: '~4.6.7' } },
    });
    const { status, stderr } = runGuard(dir);
    assert.equal(status, 1);
    assert.match(stderr, /apps\/web\/package\.json: dependencies\.zod = "~4\.6\.7"/);
  });

  // WR-01: a column-0 comment used to end the catalog scan, hiding every entry after it.
  it('keeps scanning the catalog past a column-0 comment', () => {
    const dir = makeWorkspace({
      'pnpm-workspace.yaml': `${WORKSPACE}# security bump, remove later\n  lodash: ^4.17.0\n`,
    });
    const { status, stderr } = runGuard(dir);
    assert.equal(status, 1);
    assert.match(stderr, /catalog lodash = "\^4\.17\.0"/);
  });

  it('counts exact entries after a column-0 or indented comment', () => {
    const dir = makeWorkspace({
      'pnpm-workspace.yaml': `${WORKSPACE}# note\n  lodash: 4.17.21\n    # indented note\n  husky: 9.1.7\n`,
    });
    const { status, stdout, stderr } = runGuard(dir);
    assert.equal(status, 0, stderr);
    assert.match(stdout, /^check-pins: 5 catalog entries OK$/m);
  });

  it('fails closed on a flow-style catalog', () => {
    const dir = makeWorkspace({
      'pnpm-workspace.yaml': WORKSPACE.replace(/catalog:[\s\S]*$/, 'catalog: { zod: ^4.0.0 }\n'),
    });
    const { status, stderr } = runGuard(dir);
    assert.equal(status, 1);
    assert.match(stderr, /must be a block mapping/);
  });

  it('fails closed on a duplicate top-level key', () => {
    const dir = makeWorkspace({
      'pnpm-workspace.yaml': `${WORKSPACE}catalog:\n  lodash: 4.17.21\n`,
    });
    const { status, stderr } = runGuard(dir);
    assert.equal(status, 1);
    assert.match(stderr, /duplicate top-level key `catalog`/);
  });

  it('fails closed on a line it cannot parse', () => {
    const dir = makeWorkspace({ 'pnpm-workspace.yaml': `${WORKSPACE}---\n` });
    const { status, stderr } = runGuard(dir);
    assert.equal(status, 1);
    assert.match(stderr, /unsupported top-level line "---"/);
  });

  it('fails closed when the catalog is missing', () => {
    const dir = makeWorkspace({ 'pnpm-workspace.yaml': 'packages:\n  - apps/*\n' });
    const { status, stderr } = runGuard(dir);
    assert.equal(status, 1);
    assert.match(stderr, /no top-level `catalog:` block/);
  });

  // WR-02: overrides and other resolution-changing keys used to pass unchecked.
  it('fails on workspace overrides with a range or an npm: alias', () => {
    const dir = makeWorkspace({
      'pnpm-workspace.yaml': `${WORKSPACE}overrides:\n  zod: ^4.0.0\n  'vite>esbuild': npm:evil-pkg@latest\n`,
    });
    const { status, stderr } = runGuard(dir);
    assert.equal(status, 1);
    assert.match(stderr, /override zod = "\^4\.0\.0"/);
    assert.match(stderr, /override vite>esbuild = "npm:evil-pkg@latest"/);
  });

  it('allows workspace overrides that pin exact versions', () => {
    const dir = makeWorkspace({
      'pnpm-workspace.yaml': `${WORKSPACE}overrides:\n  'vite>esbuild': 0.25.12\n`,
    });
    const { status, stderr } = runGuard(dir);
    assert.equal(status, 0, stderr);
  });

  it('fails closed on a flow-style overrides map', () => {
    const dir = makeWorkspace({
      'pnpm-workspace.yaml': `${WORKSPACE}overrides: { zod: 4.6.7 }\n`,
    });
    const { status, stderr } = runGuard(dir);
    assert.equal(status, 1);
    assert.match(stderr, /`overrides:` must be a block mapping/);
  });

  for (const key of [
    'packageExtensions',
    'patchedDependencies',
    'catalogs',
    'pnpmfile',
    'configDependencies',
    'include',
    'minimumReleaseAgeExclude',
  ]) {
    it(`rejects \`${key}:\` in the workspace file`, () => {
      const dir = makeWorkspace({ 'pnpm-workspace.yaml': `${WORKSPACE}${key}:\n  x: y\n` });
      const { status, stderr } = runGuard(dir);
      assert.equal(status, 1);
      assert.ok(stderr.includes(`\`${key}:\` is not allowed`), stderr);
    });
  }

  // R2 WR-02: a denylist missed configDependencies, which pnpm 12 loads pnpmfile hooks from.
  it('rejects configDependencies in flow style and dangerouslyAllowAllBuilds inline', () => {
    const dir = makeWorkspace({
      'pnpm-workspace.yaml': `${WORKSPACE}configDependencies: { pnpm-plugin-evil: 1.0.0+sha512-abc }\ndangerouslyAllowAllBuilds: true\n`,
    });
    const { status, stderr } = runGuard(dir);
    assert.equal(status, 1);
    assert.match(stderr, /`configDependencies:` is not allowed/);
    assert.match(stderr, /`dangerouslyAllowAllBuilds:` is not allowed/);
  });

  it('rejects a top-level key that is not on the allowlist', () => {
    const dir = makeWorkspace({
      'pnpm-workspace.yaml': `${WORKSPACE}onlyBuiltDependencies:\n  - esbuild\n`,
    });
    const { status, stderr } = runGuard(dir);
    assert.equal(status, 1);
    assert.match(stderr, /:13: `onlyBuiltDependencies:` is not on the allowlist/);
  });

  // D-06 (phase 1.1): pnpm 12 runs install scripts only for packages listed `true` here.
  it('accepts an allowBuilds block of bare names mapped to true or false', () => {
    const dir = makeWorkspace({
      'pnpm-workspace.yaml': `${WORKSPACE}allowBuilds:\n  esbuild: true\n  '@prisma/engines': false\n`,
    });
    const { status, stdout, stderr } = runGuard(dir);
    assert.equal(status, 0, stderr);
    assert.match(stdout, /^check-pins: 3 catalog entries OK$/m);
    assert.match(stdout, /^check-pins: 2 manifests OK$/m);
  });

  it('rejects an allowBuilds value that is not true or false', () => {
    const dir = makeWorkspace({
      'pnpm-workspace.yaml': `${WORKSPACE}allowBuilds:\n  esbuild: maybe\n`,
    });
    const { status, stderr } = runGuard(dir);
    assert.equal(status, 1);
    assert.match(stderr, /allowBuilds esbuild = maybe \(only unquoted true or false is allowed\)/);
  });

  // A quoted 'false' is a YAML string, and a non-empty string is truthy.
  for (const quoted of ["'false'", '"false"', "'true'", '"true"']) {
    it(`rejects the quoted allowBuilds value ${quoted}`, () => {
      const dir = makeWorkspace({
        'pnpm-workspace.yaml': `${WORKSPACE}allowBuilds:\n  esbuild: ${quoted}\n`,
      });
      const { status, stderr } = runGuard(dir);
      assert.equal(status, 1);
      assert.ok(
        stderr.includes(`allowBuilds esbuild = ${quoted} (only unquoted true or false is allowed)`),
        stderr,
      );
    });
  }

  it('fails closed on a flow-style allowBuilds map', () => {
    const dir = makeWorkspace({
      'pnpm-workspace.yaml': `${WORKSPACE}allowBuilds: { esbuild: true }\n`,
    });
    const { status, stderr } = runGuard(dir);
    assert.equal(status, 1);
    assert.match(stderr, /`allowBuilds:` must be a block mapping/);
  });

  for (const matcher of ["'nx@21.6.4'", "'*'", "'foo@git+https://example.com/foo.git'"]) {
    it(`rejects the allowBuilds matcher ${matcher}`, () => {
      const dir = makeWorkspace({
        'pnpm-workspace.yaml': `${WORKSPACE}allowBuilds:\n  ${matcher}: true\n`,
      });
      const { status, stderr } = runGuard(dir);
      assert.equal(status, 1);
      assert.match(stderr, /allowBuilds .+ is not a bare package name/);
    });
  }

  it('rejects a duplicate allowBuilds entry', () => {
    const dir = makeWorkspace({
      'pnpm-workspace.yaml': `${WORKSPACE}allowBuilds:\n  esbuild: true\n  esbuild: false\n`,
    });
    const { status, stderr } = runGuard(dir);
    assert.equal(status, 1);
    assert.match(stderr, /duplicate allowBuilds entry esbuild/);
  });

  for (const [label, value] of [
    ['0', 'minimumReleaseAge: 0'],
    ['one minute under 14 days', 'minimumReleaseAge: 20159'],
    ['a non-integer', "minimumReleaseAge: '20160'"],
  ]) {
    it(`fails when minimumReleaseAge is ${label}`, () => {
      const dir = makeWorkspace({
        'pnpm-workspace.yaml': WORKSPACE.replace('minimumReleaseAge: 20160', value),
      });
      const { status, stderr } = runGuard(dir);
      assert.equal(status, 1);
      assert.match(stderr, /:6: minimumReleaseAge must be a plain integer >= 20160/);
    });
  }

  it('fails when minimumReleaseAge is missing', () => {
    const dir = makeWorkspace({
      'pnpm-workspace.yaml': WORKSPACE.replace('minimumReleaseAge: 20160\n', ''),
    });
    const { status, stderr } = runGuard(dir);
    assert.equal(status, 1);
    assert.match(stderr, /pnpm-workspace\.yaml: minimumReleaseAge must be a plain integer/);
  });

  it('accepts a minimumReleaseAge above 14 days', () => {
    const dir = makeWorkspace({
      'pnpm-workspace.yaml': WORKSPACE.replace(
        'minimumReleaseAge: 20160',
        'minimumReleaseAge: 43200',
      ),
    });
    const { status, stderr } = runGuard(dir);
    assert.equal(status, 0, stderr);
  });

  it('rejects a .pnpmfile.cjs hook', () => {
    const dir = makeWorkspace({ '.pnpmfile.cjs': 'module.exports = { hooks: {} };\n' });
    const { status, stderr } = runGuard(dir);
    assert.equal(status, 1);
    assert.match(stderr, /\.pnpmfile\.cjs: pnpmfile hooks are not allowed/);
  });

  it('fails on pnpm.overrides, resolutions and overrides in package.json', () => {
    const dir = makeWorkspace({
      'package.json': {
        ...ROOT_MANIFEST,
        pnpm: { overrides: { 'vite>esbuild': '*' }, packageExtensions: {} },
        resolutions: { zod: '^4.0.0' },
        overrides: { lodash: { '.': '4.17.21' } },
      },
    });
    const { status, stderr } = runGuard(dir);
    assert.equal(status, 1);
    assert.match(stderr, /package\.json: pnpm\.overrides: override vite>esbuild = "\*"/);
    assert.match(stderr, /package\.json: pnpm\.packageExtensions is not allowed/);
    assert.match(stderr, /package\.json: resolutions: override zod = "\^4\.0\.0"/);
    assert.match(stderr, /package\.json: overrides: override lodash = /);
  });

  it('checks every manifest matched by the packages: globs', () => {
    const dir = makeWorkspace({
      'pnpm-workspace.yaml': WORKSPACE.replace('  - packages/*', '  - packages/*\n  - tools/*'),
      'tools/gen/package.json': { name: '@app/gen', devDependencies: { tsx: '^4.0.0' } },
    });
    const { status, stderr } = runGuard(dir);
    assert.equal(status, 1);
    assert.match(stderr, /tools\/gen\/package\.json: devDependencies\.tsx = "\^4\.0\.0"/);
  });

  it('fails closed when packages: is missing', () => {
    const dir = makeWorkspace({
      'pnpm-workspace.yaml': WORKSPACE.replace(
        /^packages:\n {2}- apps\/\*\n {2}- packages\/\*\n/,
        '',
      ),
    });
    const { status, stderr } = runGuard(dir);
    assert.equal(status, 1);
    assert.match(stderr, /`packages:` must be a block list of globs/);
  });
});
