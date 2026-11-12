// @ts-check
// ESLint Node API tests: each preset fires on the bad fixtures and stays silent on clean ones.
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { test } from 'node:test';
import { isDeepStrictEqual } from 'node:util';
import { ESLint } from 'eslint';
import { base, nest, next } from '@app/config/eslint';
import apiConfig from '../../../apps/api/eslint.config.js';

/** @typedef {(opts: { tsconfigRootDir: string }) => import('eslint').Linter.Config[]} Preset */

/**
 * Lints fixture files with a preset. A fatal message means typed lint failed to set up,
 * which would otherwise look like a rule hit, so it fails the test.
 *
 * @param {Preset} preset
 * @param {string} name
 * @param {string[]} files
 */
async function lintFixture(preset, name, files) {
  const cwd = join(import.meta.dirname, 'fixtures', name);
  const eslint = new ESLint({
    cwd,
    overrideConfigFile: true,
    overrideConfig: preset({ tsconfigRootDir: cwd }),
  });
  /** @type {Map<string, import('eslint').Linter.LintMessage[]>} */
  const messages = new Map();
  for (const result of await eslint.lintFiles(files)) {
    const file = result.filePath.slice(cwd.length + 1);
    for (const m of result.messages) {
      assert.ok(!m.fatal, `${file}: fatal: ${m.message}`);
      assert.equal(m.severity, 2, `${file}: ${String(m.ruleId)} is not an error`);
    }
    messages.set(file, result.messages);
  }
  return { eslint, cwd, messages };
}

/** @param {import('eslint').Linter.LintMessage[]} list */
const ruleIds = (list) => [...new Set(list.map((m) => m.ruleId ?? '(directive)'))].sort();

test('nest(): adapters and services stay off Prisma', async () => {
  const clean = [
    'src/app.module.ts',
    'src/core/prisma/prisma.service.ts',
    'src/core/prisma/index.ts',
    'src/messages/messages.repository.ts',
    'src/messages/messages.service.ts',
    'src/messages/index.ts',
    'src/test/db.ts',
    // Prisma types in a service: `import type` and import() types are allowed.
    'src/tasks/typed.service.ts',
    // A contract type named *Repository, in a decorated controller.
    'src/github/github.controller.ts',
    // Test files may use Prisma for setup.
    'src/messages/messages.service.spec.ts',
    'src/app.e2e-spec.ts',
    // Prisma CLI files (seeds) may use the client.
    'prisma/seed.ts',
  ];
  const controller = 'src/messages/messages.controller.ts';
  const handlers = 'src/messages/messages.gateway-handlers.ts';
  const tasks = 'src/tasks/tasks.service.ts';
  const direct = 'src/tasks/direct.service.mts';
  const bypass = 'src/tasks/bypass.service.ts';
  const alias = 'src/core/prisma/alias.ts';
  const hidden = 'src/tasks/tasks.gateway-handlers.ts';
  const barrel = 'src/github/barrel.controller.ts';
  const gateway = 'src/realtime/realtime.gateway.ts';
  const legacy = 'src/tasks/legacy.service.js';
  const script = 'scripts/backfill.ts';
  const { eslint, cwd, messages } = await lintFixture(nest, 'nest', [
    ...clean,
    controller,
    handlers,
    tasks,
    direct,
    bypass,
    alias,
    hidden,
    barrel,
    gateway,
    legacy,
    script,
  ]);

  for (const file of clean) assert.deepEqual(messages.get(file), [], file);

  const hits = messages.get(controller) ?? [];
  assert.deepEqual(new Set(hits.map((m) => m.line)), new Set([1, 2, 3]));
  assert.deepEqual(ruleIds(hits), ['no-restricted-imports', 'no-restricted-syntax']);
  // Line 3 imports a non-*Repository name, so only the *.repository path ban can catch it.
  assert.deepEqual(ruleIds(hits.filter((m) => m.line === 3)), ['no-restricted-imports']);

  assert.deepEqual(ruleIds(messages.get(handlers) ?? []), ['no-restricted-imports']);

  const taskHits = messages.get(tasks) ?? [];
  assert.deepEqual(ruleIds(taskHits), ['no-restricted-syntax']);
  assert.ok(taskHits.some((m) => m.line === 1 && m.message.includes('Only *.repository.ts')));
  assert.ok(taskHits.some((m) => m.message.includes('Raw SQL')));

  // .mts: a value import of the prisma.service path and the PrismaService name.
  const directHits = messages.get(direct) ?? [];
  assert.deepEqual(ruleIds(directHits), [
    '@typescript-eslint/no-restricted-imports',
    'no-restricted-syntax',
  ]);

  // Namespace import, export *, dynamic import. The import() type (line 3) and the
  // namespace type (line 6) are types only, so they are allowed in a service.
  const bypassHits = messages.get(bypass) ?? [];
  assert.deepEqual(ruleIds(bypassHits), ['no-restricted-syntax']);
  assert.deepEqual(new Set(bypassHits.map((m) => m.line)), new Set([1, 2, 9]));

  assert.deepEqual(ruleIds(messages.get(alias) ?? []), ['no-restricted-syntax']);

  // A local namespace (barrel), a test helper, a local import().
  const hiddenHits = messages.get(hidden) ?? [];
  assert.deepEqual(ruleIds(hiddenHits), ['no-restricted-imports', 'no-restricted-syntax']);
  assert.deepEqual(new Set(hiddenHits.map((m) => m.line)), new Set([1, 2, 8]));

  // A repository through a barrel, by name.
  assert.deepEqual(ruleIds(messages.get(barrel) ?? []), ['no-restricted-syntax']);

  // *.gateway.ts: an @prisma/* package and raw SQL.
  const gatewayHits = messages.get(gateway) ?? [];
  assert.deepEqual(new Set(gatewayHits.map((m) => m.line)), new Set([1, 7]));
  assert.ok(gatewayHits.some((m) => m.line === 7 && m.message.includes('Raw SQL')));

  // A .js service, linted without type info.
  assert.deepEqual(ruleIds(messages.get(legacy) ?? []), [
    '@typescript-eslint/no-restricted-imports',
    'no-restricted-syntax',
  ]);

  // Package code outside src/ (a script) is held to the same Prisma ban.
  const scriptHits = messages.get(script) ?? [];
  assert.deepEqual(ruleIds(scriptHits), [
    '@typescript-eslint/no-restricted-imports',
    'no-restricted-syntax',
  ]);
  assert.deepEqual(new Set(scriptHits.map((m) => m.line)), new Set([1]));

  assert.ok(await eslint.isPathIgnored(join(cwd, 'src/generated/prisma/client.ts')));
});

test('base(): unused directives fail, tests are relaxed but cannot be focused', async () => {
  const { messages } = await lintFixture(base, 'base', ['clean.ts', 'bad.ts', 'focused.test.ts']);

  assert.deepEqual(messages.get('clean.ts'), []);

  const bad = messages.get('bad.ts') ?? [];
  assert.deepEqual(ruleIds(bad), ['(directive)', '@typescript-eslint/no-non-null-assertion']);
  assert.ok(bad.some((m) => m.message.includes('Unused eslint-disable directive')));

  assert.deepEqual(ruleIds(messages.get('focused.test.ts') ?? []), ['no-restricted-properties']);
});

test('next(): Next, React and a11y rules fire; FSD stays with Steiger', async () => {
  const { eslint, cwd, messages } = await lintFixture(next, 'next', [
    'app/page.tsx',
    'components/bad.tsx',
    'components/legacy.jsx',
    'next.config.mjs',
  ]);

  assert.deepEqual(messages.get('app/page.tsx'), []);
  assert.deepEqual(messages.get('next.config.mjs'), []);

  for (const file of ['components/bad.tsx', 'components/legacy.jsx']) {
    const bad = ruleIds(messages.get(file) ?? []);
    for (const id of [
      '@next/next/no-img-element',
      'jsx-a11y-x/alt-text',
      '@eslint-react/no-missing-key',
      '@eslint-react/rules-of-hooks',
    ]) {
      assert.ok(bad.includes(id), `${file}: ${id} missing in ${bad.join(', ')}`);
    }
  }

  /** @type {import('eslint').Linter.Config} */
  const config = await eslint.calculateConfigForFile(join(cwd, 'app/page.tsx'));
  // no-html-link-for-pages finds pages/ from rootDir, not from the cwd (lint-staged runs at the root).
  const settings = /** @type {{ next?: { rootDir?: unknown } } | undefined} */ (config.settings);
  assert.equal(settings?.next?.rootDir, cwd);
  const boundary =
    /^(no-restricted-imports|no-restricted-paths|@typescript-eslint\/no-restricted-imports|boundaries\/|import(-x)?\/|@feature-sliced\/|fsd\/)/;
  for (const [id, entry] of Object.entries(config.rules ?? {})) {
    const severity = Array.isArray(entry) ? entry[0] : entry;
    if (severity !== 0 && severity !== 'off') assert.doesNotMatch(id, boundary);
  }
});

test('every module extension is linted and no preset rule is warn-level', async () => {
  /** @type {[Preset, string, string][]} */
  const cases = [
    [base, 'base', 'src/x'],
    [nest, 'nest', 'src/x/x.controller'],
    [next, 'next', 'components/x'],
  ];
  for (const [preset, name, stem] of cases) {
    const cwd = join(import.meta.dirname, 'fixtures', name);
    const eslint = new ESLint({
      cwd,
      overrideConfigFile: true,
      overrideConfig: preset({ tsconfigRootDir: cwd }),
    });
    for (const ext of ['ts', 'tsx', 'mts', 'cts', 'js', 'jsx', 'mjs', 'cjs']) {
      const file = `${stem}.${ext}`;
      if (name === 'nest' && ext.endsWith('x')) continue;
      /** @type {import('eslint').Linter.Config | undefined} */
      const config = await eslint.calculateConfigForFile(join(cwd, file));
      // No matching config means ESLint skips the file silently.
      assert.ok(config?.rules?.['no-unused-vars'], `${name}: ${file} is not linted`);
      if (name === 'nest') assert.ok(config.rules['no-restricted-imports'], `${file}: no layering`);
      for (const [id, entry] of Object.entries(config.rules)) {
        const severity = Array.isArray(entry) ? entry[0] : entry;
        assert.ok(severity !== 1 && severity !== 'warn', `${name}: ${file}: ${id} is warn-level`);
      }
    }
  }
});

test('apps/api keeps every nest() layering entry; restrictedImports merges', async () => {
  const cwd = join(import.meta.dirname, '../../../apps/api');
  const extra = { group: ['lodash'], message: 'Use the standard library.' };
  /** @param {import('eslint').Linter.Config[]} config */
  const eslintFor = (config) =>
    new ESLint({ cwd, overrideConfigFile: true, overrideConfig: config });
  const preset = eslintFor(nest({ tsconfigRootDir: cwd }));
  const merged = eslintFor(nest({ tsconfigRootDir: cwd, restrictedImports: [extra] }));

  /** @param {ESLint} eslint @param {string} file @param {string} id */
  const entries = async (eslint, file, id) => {
    /** @type {import('eslint').Linter.Config | undefined} */
    const config = await eslint.calculateConfigForFile(join(cwd, file));
    const [, ...options] = /** @type {unknown[]} */ (config?.rules?.[id] ?? []);
    if (id !== 'no-restricted-imports') return options;
    return /** @type {{ patterns?: unknown[] } | undefined} */ (options[0])?.patterns ?? [];
  };

  for (const file of ['src/x/x.controller.ts', 'src/x/x.service.ts', 'src/x/x.repository.ts']) {
    for (const id of ['no-restricted-imports', 'no-restricted-syntax']) {
      const want = await entries(preset, file, id);
      for (const eslint of [eslintFor(apiConfig), merged]) {
        const got = await entries(eslint, file, id);
        for (const entry of want) {
          assert.ok(
            got.some((g) => isDeepStrictEqual(g, entry)),
            `${file}: ${id} lost ${JSON.stringify(entry)}`,
          );
        }
      }
    }
    const extras = await entries(merged, file, 'no-restricted-imports');
    assert.ok(
      extras.some((g) => isDeepStrictEqual(g, extra)),
      `${file}: extra pattern missing`,
    );
  }
});
