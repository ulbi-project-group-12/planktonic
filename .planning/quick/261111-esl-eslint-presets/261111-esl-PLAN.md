---
phase: quick-261111-esl
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - pnpm-workspace.yaml
  - pnpm-lock.yaml
  - package.json
  - README.md
  - apps/api/eslint.config.js
  - apps/api/package.json
  - apps/web/package.json
  - packages/contracts/package.json
  - packages/config/package.json
  - packages/config/tsconfig.json
  - packages/config/eslint.config.js
  - packages/config/README.md
  - packages/config/eslint/index.js
  - packages/config/eslint/base.js
  - packages/config/eslint/nest.js
  - packages/config/eslint/next.js
  - packages/config/test/eslint-presets.test.js
  - packages/config/test/fixtures/base/tsconfig.json
  - packages/config/test/fixtures/base/clean.ts
  - packages/config/test/fixtures/base/bad.ts
  - packages/config/test/fixtures/base/focused.test.ts
  - packages/config/test/fixtures/nest/tsconfig.json
  - packages/config/test/fixtures/nest/src/app.module.ts
  - packages/config/test/fixtures/nest/src/generated/prisma/client.ts
  - packages/config/test/fixtures/nest/src/core/prisma/prisma.service.ts
  - packages/config/test/fixtures/nest/src/core/prisma/index.ts
  - packages/config/test/fixtures/nest/src/messages/messages.repository.ts
  - packages/config/test/fixtures/nest/src/messages/messages.service.ts
  - packages/config/test/fixtures/nest/src/messages/messages.controller.ts
  - packages/config/test/fixtures/nest/src/messages/messages.gateway-handlers.ts
  - packages/config/test/fixtures/nest/src/tasks/tasks.service.ts
  - packages/config/test/fixtures/next/tsconfig.json
  - packages/config/test/fixtures/next/jsx.d.ts
  - packages/config/test/fixtures/next/app/page.tsx
  - packages/config/test/fixtures/next/components/bad.tsx
autonomous: true
requirements: [QUICK-261111-esl, TZ-FE-10, TZ-BE-10]

estimate:
  tokens: 95000
  raw_tokens: 95000
  tasks: 3
  confidence: low

must_haves:
  truths:
    - "`import { base, next, nest } from '@app/config/eslint'` resolves through the package export map (the preset test imports it by package name), and each preset is fn({ tsconfigRootDir }) returning a flat config array"
    - "nest(): in *.controller.ts, *.gateway-handlers.ts and *.gateway.ts, any import of Prisma (@prisma/*, .prisma/*, a generated/prisma path, prisma.service, src/core/prisma, or the names PrismaService / PrismaClient) or of a repository fails lint; in every other src/** file any Prisma import (type-only included) or a $queryRaw / $executeRaw call fails; *.repository.ts, src/core/prisma/** and test files may use Prisma, and services may import repositories"
    - "next(): a fixture with a raw img, a missing alt, a list item without key and a conditional hook gets @next/next/no-img-element, jsx-a11y-x/alt-text, @eslint-react/no-missing-key and @eslint-react/rules-of-hooks as errors; a clean App Router page with an async onClick passes; no import-boundary rule is active (FSD boundaries stay with Steiger, UL-6)"
    - "Lint fails on warnings wherever it runs: every workspace lint script, lint:root and the lint-staged ESLint command pass --max-warnings=0, and no rule in any preset resolves to warn (the preset test asserts it for base, nest and next)"
    - "An unused eslint-disable directive is a lint error; test files (*.test.*, *.spec.*, *.e2e-spec.ts, test/**, tests/**, __tests__/**) allow non-null assertions, empty functions and unbound methods but reject describe/it/test/suite .only"
    - "The preset tests run as @app/config#test inside turbo run test, so both the CI test job and pnpm check:all run them (15 turbo tasks); .github/workflows/ci.yml and its job names are byte-identical to 6c265aa"
    - "Exactly three new catalog pins (@eslint-react/eslint-plugin 5.28.8, @next/eslint-plugin-next 16.4.3, eslint-plugin-jsx-a11y-x 0.2.0), all published before 2026-10-28 and declaring peers that accept eslint 10.13.0, are dependencies of packages/config only; apps/web and apps/api gain no dependencies (D-02); no new top-level key in pnpm-workspace.yaml; pnpm install --frozen-lockfile and pnpm check:all pass"
    - "packages/config/README.md tells the UL-6 (web) and UL-7 (api) owners how to switch to next() / work under nest(), which file names and Prisma paths nest() relies on, and what next() leaves to Steiger"
  artifacts:
    - path: packages/config/eslint/base.js
      provides: "base() plus the shared building blocks (coreBlocks, finalize, errorsOnly, CODE_FILES, TEST_FILES) the other presets reuse"
      contains: "reportUnusedDisableDirectives: 'error'"
    - path: packages/config/eslint/nest.js
      provides: "nest() preset: STACK §3.1 layering rule, decorator-friendly classes, generated Prisma client ignored"
      contains: "no-restricted-imports"
    - path: packages/config/eslint/next.js
      provides: "next() preset for the Next.js 16 App Router"
      contains: "core-web-vitals"
    - path: packages/config/eslint/index.js
      provides: "Public entry @app/config/eslint re-exporting base, next, nest"
      contains: "export { next } from './next.js';"
    - path: packages/config/test/eslint-presets.test.js
      provides: "ESLint Node API tests over fixtures, one block per preset plus the no-warn invariant"
      contains: "from '@app/config/eslint'"
    - path: packages/config/README.md
      provides: "Preset usage docs and the Phase 1.1 checklist for UL-6 and UL-7"
      contains: "UL-7"
    - path: apps/api/eslint.config.js
      provides: "apps/api consumes nest() now, so the layering rule is on before the first controller exists"
      contains: "nest({ tsconfigRootDir: import.meta.dirname })"
  key_links:
    - from: packages/config/package.json (exports "./eslint")
      to: packages/config/eslint/index.js
      via: "re-exports base/next/nest; the test imports '@app/config/eslint' by name, so the export map itself is exercised"
      pattern: '"./eslint": "./eslint/index.js"'
    - from: apps/api/eslint.config.js
      to: packages/config/eslint/nest.js
      via: "export default nest({ tsconfigRootDir: import.meta.dirname })"
      pattern: "nest\\(\\{ tsconfigRootDir: import.meta.dirname \\}\\)"
    - from: packages/config/package.json scripts.test
      to: .github/workflows/ci.yml (test job) and root check:all
      via: "turbo run test picks up @app/config#test; ci.yml runs pnpm turbo run test, check:all runs turbo run lint typecheck test build"
      pattern: '"test": "node --test'
    - from: packages/config/eslint.config.js
      to: packages/config/test/fixtures/**
      via: "globalIgnores(['test/fixtures/**']) keeps the package lint and the root lint-staged run (ESLint 10 looks up the nearest config per file) off the intentionally broken fixtures"
      pattern: "test/fixtures/\\*\\*"
    - from: packages/config/eslint/next.js (settings.next.rootDir)
      to: "@next/next/no-html-link-for-pages"
      via: "rootDir = tsconfigRootDir, so the rule finds app/ even when ESLint runs from the repo root (lint-staged)"
      pattern: "rootDir: tsconfigRootDir"
    - from: pnpm-workspace.yaml (catalog)
      to: packages/config/package.json (dependencies)
      via: "catalog: specs, resolved in the committed pnpm-lock.yaml"
      pattern: "'@eslint-react/eslint-plugin': 5.28.8"
---

<!-- planner-discipline-allow: eslint-config-next -->
<!-- planner-discipline-allow: eslint-plugin-react -->
<!-- planner-discipline-allow: eslint-plugin-jsx-a11y -->
<!-- planner-discipline-allow: eslint-plugin-react-hooks -->
<!-- planner-discipline-allow: eslint-plugin-boundaries -->

<objective>
Finish the shared ESLint setup in packages/config (tracker ticket UL-5). STACK §3 promises "eslint flat presets (base/next/nest)" there, but only base() exists. This plan adds next() for the Next.js 16 App Router and nest() for NestJS 12 ESM. Both are exported from `@app/config/eslint` as fn({ tsconfigRootDir }). It also hardens base(), proves every preset with ESLint Node API tests over fixtures, and documents the presets for the Phase 1.1 owners (UL-6 web, UL-7 api).

Purpose: Phase 1.1 starts the real skeletons. Without nest(), the first controller can import Prisma directly and skip the "routers are adapters, services own rules" split (STACK §3.1, and the single ACL path of STACK §2.3). Without next(), the web app either goes unlinted for React/Next mistakes or pulls in plugins whose declared peers exclude ESLint 10. Today warnings and unused disable directives pass lint silently.

Output: the presets base/next/nest in packages/config/eslint/, tests and fixtures in packages/config/test/, packages/config/README.md, apps/api switched to nest(), `--max-warnings=0` wherever lint runs, three catalog pins plus the lockfile. Three atomic commits, one per task.

Decisions honored (Phase 1 CONTEXT, still binding):
- D-02: apps/web and apps/api get no framework or UI dependencies. Every plugin is a dependency of packages/config. The apps only change their `lint` script flag, and apps/api changes its eslint.config.js import.
- D-04: packages/config holds the ESLint config. Steiger/FSD presets belong to Phase 1.1 (UL-6), so next() adds no import-boundary rules.
- D-07 / D-28: exact pins, defined once in the catalog, each release at least 14 days old (cutoff 2026-10-28; minimumReleaseAge enforces it). The committed lockfile installs frozen. eslint 10.13.0, typescript-eslint 8.72.0 and typescript 6.0.3 stay as pinned.
- D-12: CI job names lint/typecheck/test/build/name-guard stay unchanged. ci.yml is not edited, and the new tests reach CI through `turbo run test`.
- D-33 / D-35: the product-name literal stays only in packages/config/product.ts. Docs and fixtures say "this project", and `pnpm check:name` runs inside check:all.

Claude's discretion (recorded so the reviewer can push back):
- QD-01: `@eslint-react/eslint-plugin` (recommended-type-checked) replaces the React and React-hooks plugins that `eslint-config-next` bundles. Its v5 already includes rules-of-hooks, exhaustive-deps and the compiler-style rules (purity, set-state-in-render, static-components, use-memo, …). Its own `disable-conflict-eslint-plugin-react-hooks` config switches the react-hooks copies off, so adding the official hooks plugin too would only duplicate them.
- QD-02: a11y uses `eslint-plugin-jsx-a11y-x` (the ESLint-10-compatible fork) with exactly the six rules `eslint-config-next` 16.4.3 enables, including its `alt-text` options. The full recommended set is not used, because shadcn's copied components trip several of its rules.
- QD-03: the nest layering rule uses core `no-restricted-imports` (regex patterns plus importNamePattern) and `no-restricted-syntax`, so it needs zero dependencies. STACK §3.1 named eslint-plugin-boundaries or dependency-cruiser as options. Both need resolvers and extra deps for what is a file-name convention here.
- QD-04: strict Prisma encapsulation. Outside `*.repository.ts`, `src/core/prisma/**` and tests, even `import type` from Prisma is rejected. Services take model types from the repository module, which re-exports them with `export type`. This closes the "type-import PrismaClient, inject it by token" loophole that an allowTypeImports variant would leave open.
- QD-05: `*.gateway.ts` counts as an adapter too. It is the WS router, next to `*.controller.ts` and `*.gateway-handlers.ts`.
- QD-06: `--max-warnings=0` goes everywhere lint runs. In addition, `finalize()` raises every warn-level rule coming from plugin configs to error (`errorsOnly`), so editors show what CI fails on, and a future script that forgets the flag still fails.
- QD-07: no `@vitest/eslint-plugin`. Its recommended `no-import-node-test` and `expect-expect` misfire on this repo's node:test files (scripts/*.test.mjs, packages/config/test). Typed `no-floating-promises` already catches an un-awaited `expect(...).resolves`. Vitest rejects `.only` when CI is set (`allowOnly` defaults to `!process.env.CI`). base() bans `.only` for every runner with core `no-restricted-properties`.
- QD-08: apps/api switches to nest() now. Its rules are dormant until controllers exist, and nest() adds no dependencies to apps/api. apps/web stays on base() until UL-6 adds `app/`. With no `app/` or `pages/` directory, `@next/next/no-html-link-for-pages` prints a "Pages directory cannot be found" console warning on every lint run.
- QD-09: the preset tests use node:test (zero new devDependencies, the same runner as scripts/*.test.mjs) with the TAP reporter used by `test:root`.
- QD-10: a raw-SQL backstop (`no-restricted-syntax` on `$queryRaw…` / `$executeRaw…` member access outside repositories), from STACK §3.1 "the only place that writes raw SQL".

Scope notes:
- Branch `chore/UL-5-eslint-presets` is checked out at 6c265aa. Do not switch branches, push, open PRs or make GitHub write calls. Never read .env files. Do not look at the branch `chore/UL-5-eslint-presets-v1` or any file from it.
- Do not edit `.planning/phases/01-*`, `.github/**` or `scripts/**`. The orchestrator owns `.planning/STATE.md`.
- No new top-level key in pnpm-workspace.yaml (scripts/check-pins.mjs allowlist). If pnpm asks for `allowBuilds` / `onlyBuiltDependencies` / `minimumReleaseAgeExclude`, stop and report; do not add them.
- Commits use conventional subjects with `[UL-5]` and end with the trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Never use `--no-verify`. The husky pre-commit hook runs lint-staged.
- Diff budget: about 400 changed lines as a guide, 600 as the warning, lockfile and .planning excluded. Fixture files are 1–15 lines each, so the task file counts run above 5 by design.
- Environment: node_modules/.pnpm holds packages that are not in HEAD's lockfile, left by an earlier install. Never rely on them. The lockfile is the only source of truth.

Baseline at 6c265aa (recorded at plan time): `pnpm check:all` exits 0 (14 catalog entries, 5 manifests, `Tasks: 14 successful, 14 total`, name guard "59 tracked files clean", 51 root tests pass). `eslint . --max-warnings=0` passes in every package and `lint:root` passes. The repo contains no `eslint-disable` or inline `/* eslint */` comments and no `.only(`. pnpm-workspace.yaml has 7 top-level keys. `--max-warnings=0` occurs 0 times in the five manifests.
</objective>

<research_findings>
## Dependency audit (registry read 2026-11-11; cutoff 2026-10-28; "peer check" is against eslint 10.13.0, typescript 6.0.3 and typescript-eslint 8.72.0)

Chosen. All three are [VERIFIED]: the repo URL matches the publisher, SLSA provenance is attested, downloads are high, and the tarball was inspected statically (downloaded, not installed).

| Package | Pin | Published (UTC) | Declared peers | Peer check | Legitimacy evidence |
|---|---|---|---|---|---|
| @next/eslint-plugin-next | 16.4.3 | 2026-10-23T13:28Z | none (deps pinned exactly: fast-glob 3.3.1, @eslint-community/eslint-utils 4.9.1) | ✓ No peers. The rules use only ESLint-10-safe APIs (`context.filename`, `context.cwd`, `sourceCode.getScope`, `sourceCode.getAncestors`). It exports flat `configs['core-web-vitals']` | vercel/next.js, SLSA provenance, 53.4M downloads/week |
| @eslint-react/eslint-plugin | 5.28.8 | 2026-10-23T16:03Z | eslint `*` (optional), typescript `*` | ✓ Built and tested against eslint ^10.13.0 (devDependency). Its sub-plugins depend on @typescript-eslint/* ^8.72.0. React version `detect` falls back silently to 19.3.0 when react is not installed | Rel1cx/eslint-react, SLSA provenance, 2.7M downloads/week |
| eslint-plugin-jsx-a11y-x | 0.2.0 | 2026-05-10T12:37Z | eslint `^9.0.0 \|\| ^10.0.0` | ✓ ESM, flat config, rule prefix `jsx-a11y-x/`, no removed ESLint APIs | es-tooling/eslint-plugin-jsx-a11y-x (e18e fork of jsx-a11y), SLSA provenance, 553k downloads/week |

Every transitive range has a release older than the cutoff: the @eslint-react 5.28.8 sub-packages, ts-pattern 5.9.2, string-ts 2.3.1, compare-versions 6.1.1, ts-api-utils 2.5.0, aria-query 5.3.2, axe-core 4.14.0, minimatch 10.x, jsx-ast-utils-x 0.1.0 and fast-glob 3.3.1. @typescript-eslint/* ^8.72.0 may resolve to 8.72.1 (2026-10-26, mature now). A second patch copy in the lockfile is acceptable; record it in the SUMMARY.

Rejected:

| Package | Version / date | Why not |
|---|---|---|
| eslint-config-next | 16.4.3 / 2026-10-23 | It declares `eslint >=9` but bundles eslint-plugin-react 7.37.5 (peer `^3 … ^9.7`), eslint-plugin-jsx-a11y 6.10.2 (peer `^3 … ^9`) and eslint-plugin-import 2.32.0 (peer up to `^9`). It needs `fixupPluginRules` shims to run on ESLint 10, which fails the peer rule. next() mirrors its composition instead: the Next rules, React rules, the same six a11y rules and the same ignores |
| eslint-plugin-react | 7.37.5 / 2025-04-03 | peer `^3 … ^9.7`, no ESLint 10 |
| eslint-plugin-jsx-a11y | 6.10.2 / 2024-10-26 | peer `^3 … ^9`, no ESLint 10 |
| eslint-plugin-react-hooks | 7.1.1 / 2026-04-17 | Compatible (peer includes ^10), but redundant with @eslint-react 5 (QD-01) |
| @vitest/eslint-plugin | 1.6.28 / 2026-10-22 | Compatible, but misfires on node:test files (QD-07) |
| eslint-plugin-boundaries | 7.4.0 / 2026-10-27 | Compatible, but not needed: core rules cover nest(), and Steiger owns FSD for next() (QD-03, D-04) |

## Facts verified for the executor
- ESLint 10.13 always uses the file-directory config lookup (`ConfigLoader`; the cwd-based loader is gone). Root lint-staged therefore lints each file with its package's eslint.config.js. A file under packages/config/test/fixtures is governed by packages/config/eslint.config.js, which must ignore it.
- Core `no-restricted-imports` in 10.13 accepts `regex` (not combined with `group`) plus `importNames` / `importNamePattern` per pattern. Path regexes are case-insensitive unless `caseSensitive: true`. Each matching pattern reports separately, so tests assert the flagged lines, not message counts. TS `import type` and `export … from` declarations are checked too.
- A typed-lint setup failure (file not in any tsconfig, bad tsconfigRootDir) shows up as a message with `fatal: true` and `ruleId: null`. Tests must reject fatal messages, or a parse failure looks like "the rule fired".
- `lintFiles()` on an ignored file yields a severity-1 "File ignored" warning. Pass only non-ignored files and check ignores with `isPathIgnored`.
- `@next/next/no-html-link-for-pages` resolves `pages/`, `src/pages/`, `app/` and `src/app/` from `settings.next.rootDir`, else from `context.cwd`. With none found, it prints a console warning once and disables itself.
- Prisma 7: the `prisma-client` generator requires `output` (e.g. `../src/generated/prisma`). Code imports `./generated/prisma/client` (also `models`, `enums`, `browser`).
- `eslint/config` exports `defineConfig`, `globalIgnores` and the types `Config` / `ConfigObject`. Its argument type is reachable as `Parameters<typeof defineConfig>`.
- `@next/eslint-plugin-next` is CJS (`exports.default` plus named `configs`/`rules`). A default import from ESM yields module.exports, so `nextPlugin.configs['core-web-vitals']` works.
- Vitest `allowOnly` defaults to `!process.env.CI`.
</research_findings>

<execution_context>
@~/.claude/gsd-core/workflows/execute-plan.md
@~/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/research/STACK.md (§3 layout, §3.1 NestJS layering, §3.2 FSD + Steiger, §15 pins)
@packages/config/eslint/index.js
@packages/config/package.json
@packages/config/tsconfig.json
@packages/config/eslint.config.js
@package.json
@pnpm-workspace.yaml
@.github/workflows/ci.yml
@README.md
@CONTRIBUTING.md
</context>

<tasks>

<task type="tracer">
  <name>Task 1: nest() layering rule end to end, from preset through @app/config/eslint and apps/api to turbo test</name>
  <files>packages/config/eslint/base.js (git mv from eslint/index.js), packages/config/eslint/index.js, packages/config/eslint/nest.js, packages/config/eslint.config.js, packages/config/package.json, packages/config/tsconfig.json, packages/config/test/eslint-presets.test.js, packages/config/test/fixtures/nest/** (tsconfig.json + the 9 src files listed in files_modified), apps/api/eslint.config.js, packages/config/README.md, README.md</files>
  <read_first>packages/config/eslint/index.js, packages/config/package.json, packages/config/tsconfig.json, packages/config/tsconfig/base.json, packages/config/eslint.config.js, apps/api/eslint.config.js, apps/api/src/main.ts, .planning/research/STACK.md (lines 122-157), README.md (lines 22-60)</read_first>
  <precondition>`pnpm install --frozen-lockfile` exits 0 at 6c265aa, so node_modules matches HEAD's lockfile before anything changes.</precondition>
  <behavior>
    - nest fixture: app.module.ts (an empty class with a decorator), core/prisma/prisma.service.ts, core/prisma/index.ts, messages/messages.repository.ts and messages/messages.service.ts each lint with zero messages
    - messages/messages.controller.ts: every message is `no-restricted-imports`, and the flagged lines are exactly {1, 2} (PrismaService on line 1, the repository on line 2)
    - messages/messages.gateway-handlers.ts: `no-restricted-imports` on its type-only import from the generated client
    - tasks/tasks.service.ts: both `no-restricted-imports` (PrismaService through the core/prisma barrel, caught by name) and `no-restricted-syntax` ($queryRaw)
    - src/generated/prisma/client.ts is ignored (`isPathIgnored` is true)
    - No message is fatal and every message has severity 2
    - `pnpm --filter @app/api lint` passes with apps/api on nest()
  </behavior>
  <action>
This is the end-to-end tracer. One preset flows through the package export map into a real consumer (apps/api) and into the turbo `test` task that CI and check:all run. No dependency changes in this task (D-02, D-07).

1. Run `pnpm install --frozen-lockfile` first.

2. Split the ESLint module. Run `git mv packages/config/eslint/index.js packages/config/eslint/base.js` so git records a rename. In base.js keep `// @ts-check` and the existing imports, and restructure into these exports:
   - `CODE_FILES`: the existing glob `'**/*.{ts,tsx,js,mjs,cjs}'`.
   - `TEST_FILES`: `['**/*.{test,spec}.{ts,tsx,js,mjs,cjs}', '**/*.e2e-spec.ts', '**/{test,tests,__tests__}/**/*.{ts,tsx,js,mjs,cjs}']`.
   - `coreBlocks({ tsconfigRootDir })`: returns, as an array and in this order, the blocks base() has today minus prettier: the `globalIgnores(['dist/**', 'coverage/**', '.turbo/**'])` block, the main typed block (files `[CODE_FILES]`, extends js recommended + `tseslint.configs.strictTypeChecked` + `stylisticTypeChecked`, node globals, `parserOptions: { projectService: true, tsconfigRootDir }`), and the JS `disableTypeChecked` block. JSDoc the return as `Parameters<typeof defineConfig>`. `eslint/config` does not export `ConfigWithExtends`, and importing `@eslint/config-helpers` would be a phantom dependency.
   - `finalize(...blocks)`: returns `defineConfig(...blocks, prettier)`, so prettier always comes last whatever a preset adds. Task 2 extends this function.
   - `base({ tsconfigRootDir })`: returns `finalize(...coreBlocks({ tsconfigRootDir }))`. Keep the JSDoc usage comment and update it to name all three presets.
   Behaviour of base() must be unchanged by this step.

3. Create packages/config/eslint/index.js as the public entry `@app/config/eslint` (`// @ts-check`, a two-line comment pointing at packages/config/README.md). It re-exports with `export { base } from './base.js';` and `export { nest } from './nest.js';` (Task 3 adds next). package.json `exports["./eslint"]` stays `./eslint/index.js`.

4. Create packages/config/eslint/nest.js (`// @ts-check`, header comment citing STACK §3.1 and the file-name conventions). Import `globalIgnores` from `eslint/config` and `coreBlocks`, `finalize`, `TEST_FILES` from `./base.js`. Define these module constants as JS string literals; the backslashes below are doubled exactly as they appear in source:
   - `SOURCE = 'src/**/*.ts'`
   - `ADAPTERS = ['src/**/*.controller.ts', 'src/**/*.gateway-handlers.ts', 'src/**/*.gateway.ts']` (QD-05)
   - `PRISMA_OWNERS = ['src/**/*.repository.ts', 'src/core/prisma/**']`
   - path regexes: PRISMA_CLIENT `'^@prisma/|^\\.prisma/|(^|/)generated/prisma(/|$)'`; PRISMA_SERVICE `'(^|/)prisma\\.service(\\.[cm]?[jt]s)?$'`; CORE_PRISMA `'(^|/)core/prisma(/|$)'`; REPOSITORY `'(^|/)[^/]+\\.repository(\\.[cm]?[jt]s)?$'`
   - import-name regexes, used as `importNamePattern` with `regex: '.'` so they match from any module, barrels and aliases included: PRISMA_NAMES `'^Prisma(Service|Client)$'`; ADAPTER_NAMES `'^Prisma(Service|Client)$|Repository$'`
   - messages: OWNER_MESSAGE "Only *.repository.ts and src/core/prisma may use Prisma (STACK §3.1). Call a repository and take model types from its exports."; ADAPTER_MESSAGE "Controllers and gateways are adapters (STACK §3.1): call a service, never Prisma or a repository."; RAW_SQL_MESSAGE "Raw SQL belongs in *.repository.ts (STACK §3.1)."
   Export `nest({ tsconfigRootDir })`, which returns `finalize(...coreBlocks({ tsconfigRootDir }), …)` plus these blocks in this order:
   a. `globalIgnores(['**/generated/prisma/**'])`: generated code is never linted.
   b. `{ files: ['**/*.ts'], rules: { '@typescript-eslint/no-extraneous-class': ['error', { allowWithDecorator: true }] } }`, so `@Module({}) export class AppModule {}` passes. strictTypeChecked flags empty classes otherwise.
   c. Services and everything else in src: `{ files: [SOURCE], ignores: [...PRISMA_OWNERS, ...TEST_FILES] }` with two rules. `'no-restricted-imports': ['error', { patterns: [...] }]` gets three patterns: `{ regex: PRISMA_CLIENT, message: OWNER_MESSAGE }`, `{ regex: PRISMA_SERVICE, message: OWNER_MESSAGE }` and `{ regex: '.', importNamePattern: PRISMA_NAMES, message: OWNER_MESSAGE }`. Use the core rule, not the typescript-eslint variant: per QD-04, type-only imports are rejected too, and the core rule checks them. `'no-restricted-syntax': ['error', { selector: 'MemberExpression[property.name=/^\\$(queryRaw|executeRaw)/]', message: RAW_SQL_MESSAGE }]` (QD-10).
   d. Adapters: `{ files: ADAPTERS }` with `'no-restricted-imports': ['error', { patterns: [...] }]`, each with ADAPTER_MESSAGE: `{ regex: PRISMA_CLIENT }`, `{ regex: PRISMA_SERVICE }`, `{ regex: CORE_PRISMA }`, `{ regex: REPOSITORY }` and `{ regex: '.', importNamePattern: ADAPTER_NAMES }`. This block comes after c, so for adapter files its options replace c's for the same rule id, while c's raw-SQL rule still applies to them.
   Do not add any plugin or dependency (QD-03).

5. Fixtures, under packages/config/test/fixtures/nest/. Keep them tiny, Prettier-formatted, ESM with `.js` relative specifiers (nodenext), and free of the product name:
   - tsconfig.json: extends `../../../tsconfig/base.json`; compilerOptions `noEmit: true`, `experimentalDecorators: true`; include `["src"]`.
   - src/generated/prisma/client.ts (stands in for Prisma 7 output): `export interface Message { id: string }` and `export class PrismaClient` with one method `$queryRaw(): number` returning 0.
   - src/core/prisma/prisma.service.ts: `export class PrismaService extends PrismaClient {}`, importing PrismaClient from `../../generated/prisma/client.js`.
   - src/core/prisma/index.ts: `export { PrismaService } from './prisma.service.js';`
   - src/messages/messages.repository.ts: re-exports `export type { Message } from '../generated/prisma/client.js';`, imports PrismaService from `../core/prisma/prisma.service.js`, and declares `export class MessagesRepository` with `constructor(private readonly prisma: PrismaService) {}` and `count(): number` returning `this.prisma.$queryRaw()`.
   - src/messages/messages.service.ts (clean): imports `{ MessagesRepository, type Message }` from `./messages.repository.js` and declares `export class MessagesService` with a constructor parameter property for the repository, `total(): number` delegating to `count()`, and `describe(message: Message): string` returning `message.id`.
   - src/messages/messages.controller.ts (bad): line 1 imports PrismaService from `../core/prisma/prisma.service.js`, line 2 imports MessagesRepository from `./messages.repository.js`. `export class MessagesController` takes both as constructor parameter properties and has `list(): number` delegating to the repository. A method is required: a constructor-only class trips no-extraneous-class.
   - src/messages/messages.gateway-handlers.ts (bad): line 1 `import type { Message } from '../generated/prisma/client.js';` and an exported function `onMessage(message: Message): string` returning `message.id`.
   - src/tasks/tasks.service.ts (bad): imports PrismaService from the barrel `../core/prisma/index.js` (only the name pattern can catch this). `export class TasksService` has a PrismaService parameter property and `count(): number` returning `this.prisma.$queryRaw()`.
   - src/app.module.ts (clean): a local `function Module(): ClassDecorator` returning `() => undefined`, then `@Module()` on `export class AppModule {}`.

6. Create packages/config/test/eslint-presets.test.js (`// @ts-check`, ESM, node:test + node:assert/strict). Import the presets by package name with `import { nest } from '@app/config/eslint';`; Node and TS nodenext both support package self-reference, so this exercises the export map. Write one helper, `lintFixture(preset, name, files)`, that:
   - sets `cwd = join(import.meta.dirname, 'fixtures', name)`
   - builds `new ESLint({ cwd, overrideConfigFile: true, overrideConfig: preset({ tsconfigRootDir: cwd }) })`
   - runs `lintFiles(files)` and returns `{ eslint, cwd, messages }`, where `messages` is a Map from the cwd-relative path to its messages
   - asserts for every message that `fatal` is falsy, with the file and message text in the assertion message (see research: typed-lint failures are fatal with ruleId null), and that `severity === 2`
   Write a tiny helper `ruleIds(list)` that returns the sorted unique ruleIds, mapping null to `'(directive)'`. Then add `test('nest(): adapters and services stay off Prisma', …)` implementing the behavior list above. For the controller, compare `new Set(lines)` with `{1, 2}` and check that every ruleId is `no-restricted-imports`. Check the generated client with `eslint.isPathIgnored(join(cwd, 'src/generated/prisma/client.ts'))`; never pass it to lintFiles, because that yields a severity-1 "File ignored" warning. Top-level `test()` calls are fine: JS files run with type-checked rules disabled.

7. Wire the package:
   - packages/config/package.json: add `"test": "node --test --test-reporter=tap test/eslint-presets.test.js"` (QD-09). turbo's existing `test` task picks it up, so CI's `test` job (`pnpm turbo run test`) and `pnpm check:all` run it with no ci.yml change (D-12).
   - packages/config/tsconfig.json: add `"test/*.js"` to `include` (not the fixtures).
   - packages/config/eslint.config.js: export `defineConfig(base({ tsconfigRootDir: import.meta.dirname }), globalIgnores(['test/fixtures/**']))`, with a one-line comment that the fixtures are broken on purpose and are linted only by the preset tests. This also keeps lint-staged (`eslint --fix`) from rewriting them.

8. apps/api/eslint.config.js becomes exactly two lines: `import { nest } from '@app/config/eslint';` and `export default nest({ tsconfigRootDir: import.meta.dirname });` (QD-08). apps/web stays on base(). apps/api/package.json is not touched in this task.

9. Docs:
   - Create packages/config/README.md: a title and a one-paragraph intro; a "Presets" table with rows base / next / nest (next marked "Task 3"; Task 3 fills it in); the two-line usage; and a "nest()" section. The nest() section covers:
     - the conventions table: `*.controller.ts` / `*.gateway-handlers.ts` / `*.gateway.ts` are adapters, `*.service.ts` owns rules, `*.repository.ts` is the only Prisma access, PrismaService lives in `src/core/prisma/prisma.service.ts`
     - what is rejected where; services take model types from the repository's `export type` re-exports
     - the Prisma 7 generator `output` must contain `generated/prisma` (for example `../src/generated/prisma`) and be gitignored; the preset ignores it for lint
     - a DB health ping goes controller → service → an indicator in `src/core/prisma`
     - test files may use Prisma for setup
     - the limits: dynamic `import()` and DI by string token are not caught, so review still applies
     Say "this project", never the product name.
   - README.md: change line 31 to `Tasks: 15 successful, 15 total`. In the `pnpm test` row, say "Vitest in `packages/contracts`, ESLint preset tests in `packages/config`". In the `packages/config` layout row, say "Shared ESLint presets (base/next/nest, see its README), TypeScript and Prettier config, and `product.ts`". Let Prettier realign the tables.

10. Run the verify command. Then commit only these files: `git add packages/config apps/api/eslint.config.js README.md` (the rename is staged by git mv). Run `git status --short` to check that nothing else is staged. Commit with `git commit -m "feat(config): nest() ESLint preset with the STACK 3.1 layering rule [UL-5]" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`.
  </action>
  <verify>
    <automated>pnpm --filter @app/config test && pnpm --filter @app/config lint && pnpm --filter @app/config typecheck && pnpm --filter @app/api lint && test -f packages/config/eslint/base.js && grep -qxF "export { nest } from './nest.js';" packages/config/eslint/index.js && grep -qxF 'export default nest({ tsconfigRootDir: import.meta.dirname });' apps/api/eslint.config.js && grep -qF '"test": "node --test --test-reporter=tap test/eslint-presets.test.js"' packages/config/package.json && grep -qF 'test/fixtures/**' packages/config/eslint.config.js && T=$(pnpm turbo run test) && printf '%s\n' "$T" | grep -qF '@app/config:test' && grep -qF 'Tasks: 15 successful, 15 total' README.md && git diff --quiet 6c265aa -- .planning/phases .github scripts pnpm-workspace.yaml pnpm-lock.yaml apps/web apps/api/package.json</automated>
  </verify>
  <done>The nest() test passes: 5 clean fixtures have zero messages; the controller is flagged on lines 1 and 2; the gateway handler's type import and the service's barrel import plus $queryRaw are flagged; the generated client is ignored; no fatal message. apps/api lints with nest(). @app/config lints and typechecks with the test file included and the fixtures ignored. `turbo run test` runs @app/config:test. README says 15 tasks. One commit, `feat(config): nest() ESLint preset with the STACK 3.1 layering rule [UL-5]`. Baselines: the nest/test-script/index/README gates were all 0 at HEAD.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Harden base() so lint fails on warnings and unused directives everywhere, with test-file handling</name>
  <files>packages/config/eslint/base.js, packages/config/test/eslint-presets.test.js, packages/config/test/fixtures/base/tsconfig.json, packages/config/test/fixtures/base/clean.ts, packages/config/test/fixtures/base/bad.ts, packages/config/test/fixtures/base/focused.test.ts, package.json, packages/config/package.json, packages/contracts/package.json, apps/web/package.json, apps/api/package.json, packages/config/README.md</files>
  <read_first>packages/config/eslint/base.js (as left by Task 1), packages/config/test/eslint-presets.test.js, package.json (scripts, lint-staged), the `lint` script line of packages/config, packages/contracts, apps/web and apps/api package.json</read_first>
  <behavior>
    - base fixture clean.ts: zero messages
    - base fixture bad.ts: includes `(directive)` (its text contains "Unused eslint-disable directive") and `@typescript-eslint/no-non-null-assertion`, both severity 2
    - base fixture focused.test.ts: ruleIds exactly `['no-restricted-properties']`. The same `!` expression and an empty arrow callback pass there, which proves the test-file relaxations apply only to test files
    - Invariant: for base (clean.ts) and nest (src/messages/messages.controller.ts), `calculateConfigForFile` shows no rule whose severity, bare or first array element, is 1 or 'warn'
    - Nest tests from Task 1 still pass
  </behavior>
  <action>
Write the fixtures and test cases first and watch them fail (RED): the directive is not an error yet, and `.only` is not banned yet. Then change base.js (GREEN).

1. Fixtures, under packages/config/test/fixtures/base/:
   - tsconfig.json: extends `../../../tsconfig/base.json` with `noEmit: true` (no include, so all files). base.json's `noUncheckedIndexedAccess` makes the `!` below necessary, so no-unnecessary-type-assertion stays quiet.
   - clean.ts: one exported typed function, e.g. `sum(values: readonly number[]): number` with a reduce.
   - bad.ts: line 1 `// eslint-disable-next-line no-console -- nothing on the next line logs`, line 2 `export const first = [1, 2][0]!;`.
   - focused.test.ts: `declare const it: { only: (name: string, run: () => void) => void };`, then `it.only('runs alone', () => {});`, then `export const first = [1, 2][0]!;`.

2. Tests, in eslint-presets.test.js: import `base` too. Add `test('base(): unused directives fail, tests are relaxed but cannot be focused', …)` and `test('no preset rule is warn-level', …)` per the behavior list. The invariant test iterates a `[preset, fixture, file]` list (base/clean.ts and nest/src/messages/messages.controller.ts now; Task 3 appends next). It calls `eslint.calculateConfigForFile(join(cwd, file))` and asserts, per rule id, that the severity is neither 1 nor 'warn', with the rule id in the message.

3. base.js:
   - In `coreBlocks`, add `{ linterOptions: { reportUnusedDisableDirectives: 'error', reportUnusedInlineConfigs: 'error' } }` right after the globalIgnores block.
   - Append a test-files block: `{ files: TEST_FILES, rules: { '@typescript-eslint/no-non-null-assertion': 'off', '@typescript-eslint/no-empty-function': 'off', '@typescript-eslint/unbound-method': 'off', 'no-restricted-properties': ['error', …] } }`. The `no-restricted-properties` list has one entry per object `describe`, `it`, `test`, `suite`, each with property `only` and the message "Remove .only before committing: it skips every other test." Keep `no-floating-promises`, `require-await` and the `no-unsafe-*` rules on in tests (QD-07).
   - Add and export `errorsOnly(configs)`. JSDoc `@param {import('eslint/config').ConfigObject[]} configs` and `@returns {import('eslint/config').ConfigObject[]}`. It returns a new array. Each config object that has `rules` is shallow-copied with a new `rules` object, in which a severity of `'warn'` or `1` (bare, or as the first element of an array entry) becomes `'error'` and the options are kept. Never mutate the incoming objects: they include shared plugin configs.
   - `finalize` becomes `errorsOnly(defineConfig(...blocks, prettier))` (QD-06). Prettier's 'off' entries are untouched.

4. `--max-warnings=0` wherever lint runs (QD-06):
   - The `lint` script of packages/config, packages/contracts, apps/web and apps/api becomes `eslint . --max-warnings=0`. This is a script-only change in the app manifests (D-02: no dependency edits).
   - In the root package.json, `lint:root` becomes `eslint eslint.config.js scripts --max-warnings=0`, and the lint-staged ESLint command becomes `eslint --fix --no-warn-ignored --max-warnings=0`.
   ci.yml needs no edit, because it calls these scripts (D-12).

5. packages/config/README.md: add a section "What every preset enforces":
   - warnings fail: the flag in every lint script, plus plugin warn-level rules raised to error, so the editor shows what CI fails on; keep `--max-warnings=0` when you rewrite a lint script
   - unused `eslint-disable` directives are errors; the pre-commit `eslint --fix` deletes them, CI fails on them; write `-- reason` after a directive
   - typed lint needs every linted .ts file (tests and config files such as `vitest.config.ts`) in the package tsconfig
   - the test-file globs and what they relax, and that `.only` is rejected

6. Run the verify command, then `pnpm turbo run lint` and `pnpm lint:root`. Commit: `git add packages/config package.json packages/contracts/package.json apps/web/package.json apps/api/package.json`, check `git status --short`, then `git commit -m "feat(config): base() ESLint preset fails on warnings and unused directives [UL-5]" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`.
  </action>
  <verify>
    <automated>pnpm --filter @app/config test && pnpm lint:root && pnpm turbo run lint && grep -qF '"lint": "eslint . --max-warnings=0"' packages/config/package.json && grep -qF '"lint": "eslint . --max-warnings=0"' packages/contracts/package.json && grep -qF '"lint": "eslint . --max-warnings=0"' apps/web/package.json && grep -qF '"lint": "eslint . --max-warnings=0"' apps/api/package.json && grep -qF '"lint:root": "eslint eslint.config.js scripts --max-warnings=0"' package.json && grep -qF '"eslint --fix --no-warn-ignored --max-warnings=0"' package.json && grep -qF "reportUnusedDisableDirectives: 'error'" packages/config/eslint/base.js && grep -q '^export function errorsOnly' packages/config/eslint/base.js && D=$(git diff -U0 6c265aa -- apps/web/package.json apps/api/package.json) && test -z "$(printf '%s\n' "$D" | grep -E '^[-+] ' | grep -vF '"lint": "eslint .')" && git diff --quiet 6c265aa -- .planning/phases .github scripts pnpm-workspace.yaml pnpm-lock.yaml apps/web/eslint.config.js</automated>
  </verify>
  <done>The base and invariant tests pass alongside the nest test: the unused directive and the non-test non-null assertion are severity-2 errors; the focused test is flagged only for `.only`; no preset rule is warn-level. Six `--max-warnings=0` occurrences (baseline 0), across the four package lint scripts, lint:root and lint-staged. Every package lint and lint:root still pass. The app manifests changed only in their lint line (4 diff lines). One commit, `feat(config): base() ESLint preset fails on warnings and unused directives [UL-5]`.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: next() preset for the Next.js 16 App Router (pins, lockfile, tests, docs) and the full green run</name>
  <files>pnpm-workspace.yaml, pnpm-lock.yaml, packages/config/package.json, packages/config/eslint/next.js, packages/config/eslint/index.js, packages/config/test/eslint-presets.test.js, packages/config/test/fixtures/next/tsconfig.json, packages/config/test/fixtures/next/jsx.d.ts, packages/config/test/fixtures/next/app/page.tsx, packages/config/test/fixtures/next/components/bad.tsx, packages/config/README.md</files>
  <read_first>packages/config/eslint/base.js and nest.js (as left by Task 2), pnpm-workspace.yaml (the catalog block and the allowlist comment), scripts/check-pins.mjs (lines 1-45), the dependency audit in research_findings above</read_first>
  <precondition>The npm registry is reachable: `npm view @eslint-react/eslint-plugin@5.28.8 version` prints 5.28.8.</precondition>
  <behavior>
    - next fixture app/page.tsx (a 'use client' page with `<button type="button" onClick={async () => { await save(); }}>`): zero messages. This proves the `no-misused-promises` attributes relaxation and that the Next, React and a11y rules accept clean App Router code
    - next fixture components/bad.tsx: its ruleIds include `@next/next/no-img-element`, `jsx-a11y-x/alt-text`, `@eslint-react/no-missing-key` and `@eslint-react/rules-of-hooks`, all severity 2. no-img-element is warn-level in the plugin, so this proves errorsOnly behaviourally
    - Steiger non-overlap: `calculateConfigForFile` on app/page.tsx shows no active rule matching `^(no-restricted-imports|no-restricted-paths|@typescript-eslint/no-restricted-imports|boundaries/|import(-x)?/|@feature-sliced/|fsd/)`
    - The no-warn invariant now also covers next (components/bad.tsx)
    - No fatal message anywhere, and no "Pages directory cannot be found" console output, because the fixture has `app/` and rootDir is set
  </behavior>
  <action>
1. Pins (D-07, D-28; see the dependency audit). Add exactly three lines to the `catalog:` block of pnpm-workspace.yaml, keeping the existing sort order and quoting style: `'@eslint-react/eslint-plugin': 5.28.8` before `'@eslint/js'`, `'@next/eslint-plugin-next': 16.4.3` before `'@types/node'`, and `eslint-plugin-jsx-a11y-x: 0.2.0` after `eslint-config-prettier`. Add no other key and touch no other line. Add the same three names as `"catalog:"` to the `dependencies` of packages/config/package.json, in alphabetical order. They are runtime dependencies because consumers import the presets. Nothing goes into the app manifests (D-02), and none of the rejected packages from the audit is added anywhere.

2. Install. From the repo root, run `pnpm install 2>&1 | tee "$TMPDIR/pnpm-install-ul5.log"`. Stop and report, without adding any workspace key, if the log shows `ERR_PNPM_NO_MATURE_MATCHING_VERSION`, unmet or missing peer warnings, or `Ignored build scripts`. Then run `pnpm install --frozen-lockfile`. Run `pnpm why @typescript-eslint/utils` and note in the SUMMARY whether a second typescript-eslint patch version entered the lockfile (acceptable).

3. Fixtures, under packages/config/test/fixtures/next/. Do not install react; the shim keeps typed lint meaningful without it (D-02):
   - tsconfig.json: extends `../../../tsconfig/base.json`; compilerOptions `noEmit: true`, `lib: ["es2024", "dom"]`, `jsx: "preserve"`.
   - jsx.d.ts: a global script (no import/export) declaring `namespace JSX` with `type Element = object;` and `interface IntrinsicElements { [name: string]: { onClick?: () => void; [attribute: string]: unknown } }`. The typed onClick gives `no-misused-promises` a void-returning contextual type to check.
   - app/page.tsx (clean): `'use client';`, then an `async function save(): Promise<void>` that awaits `Promise.resolve()`, then `export default function Page()` rendering `<main>` with an `<h1>` and a `<button type="button">` whose onClick is `async () => { await save(); }`. Its presence under `app/` is also what `no-html-link-for-pages` needs.
   - components/bad.tsx: a local `function useCounter(): number` returning 1, and `export function Bad({ items, on }: { items: string[]; on: boolean })` that calls `useCounter()` inside `if (on)` and returns a `<ul>` with `<img src="/avatar.png" />` (no alt) and `{items.map((item) => <li>{item}</li>)}` (no key). Extra findings such as `@eslint-react/no-unnecessary-use-prefix` are fine, because the bad-file assertion is "includes".

4. Tests (RED before step 5): import `next`, add `test('next(): Next, React and a11y rules fire; FSD stays with Steiger', …)` per the behavior list, and append `[next, 'next', 'components/bad.tsx']` to the invariant list.

5. Create packages/config/eslint/next.js (`// @ts-check`, header comment: mirrors the composition of Next's own preset using ESLint-10-compatible plugins; FSD boundaries are Steiger's job, D-04). Imports: default `react` from `@eslint-react/eslint-plugin`, default `nextPlugin` from `@next/eslint-plugin-next`, default `jsxA11y` from `eslint-plugin-jsx-a11y-x`, `globalIgnores` from `eslint/config`, `globals`, and `coreBlocks`, `finalize`, `CODE_FILES` from `./base.js`. Export `next({ tsconfigRootDir })` returning `finalize(...coreBlocks({ tsconfigRootDir }), …)` plus:
   a. `globalIgnores(['.next/**', 'out/**', 'build/**', 'next-env.d.ts'])`.
   b. `{ files: [CODE_FILES], extends: [nextPlugin.configs['core-web-vitals']], languageOptions: { globals: { ...globals.browser } }, settings: { next: { rootDir: tsconfigRootDir } } }`. Browser globals merge with base's node globals, and rootDir makes the pages/app lookup independent of the cwd.
   c. `{ files: ['**/*.{ts,tsx}'], extends: [react.configs['recommended-type-checked']] }` (QD-01). This is TS only, because its type-checked rule needs type info, which base disables for JS.
   d. `{ files: ['**/*.tsx'], plugins: { 'jsx-a11y-x': jsxA11y }, rules: … }` (QD-02) with `'jsx-a11y-x/alt-text': ['error', { elements: ['img'], img: ['Image'] }]`; `'error'` for `aria-props`, `aria-proptypes`, `aria-unsupported-elements`, `role-has-required-aria-props` and `role-supports-aria-props` (all `jsx-a11y-x/`-prefixed); and `'@typescript-eslint/no-misused-promises': ['error', { checksVoidReturn: { attributes: false } }]` for async JSX handlers.
   No import, boundary or restricted-imports rules. If `tsc` rejects a plugin config's type, wrap it in a JSDoc cast to `import('eslint/config').ConfigObject` rather than loosening anything else.
   Add `export { next } from './next.js';` to eslint/index.js.

6. packages/config/README.md: fill the next() row, then:
   - Add a "next()" section with: what is included (Next core-web-vitals, @eslint-react recommended-type-checked including the hooks rules, the six a11y rules, the Next ignores); what is not, and why (FSD layers and public API are Steiger's, UL-6; Next's own preset and the classic React/a11y plugins are not used because their declared peers stop at ESLint 9; do not add them to apps/web); and that next() needs `app/` (or `pages/`) to exist.
   - Add a "Phase 1.1 checklist":
     - UL-6: switch apps/web/eslint.config.js to the two-line next() form in the PR that creates `app/`; keep `eslint . --max-warnings=0` (Next 16 has no `next lint`); put next.config.ts and test files in the tsconfig.
     - UL-7: apps/api already uses nest(); follow the file names; put PrismaService in src/core/prisma; set the Prisma output under `generated/prisma`.
   - Add "Changing the presets": run `pnpm --filter @app/config test`; it runs in CI's test job and in check:all. A new plugin needs a catalog pin at least 14 days old, peers that accept the pinned ESLint, and lead review (CODEOWNERS).

7. Run the full verify command, including `pnpm check:all`. Commit: `git add pnpm-workspace.yaml pnpm-lock.yaml packages/config`, check `git status --short`, then `git commit -m "feat(config): next() ESLint preset for the Next.js App Router [UL-5]" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`.
  </action>
  <verify>
    <automated>pnpm install --frozen-lockfile && pnpm check:pins && pnpm --filter @app/config test && pnpm check:all && grep -qxF "  '@eslint-react/eslint-plugin': 5.28.8" pnpm-workspace.yaml && grep -qxF "  '@next/eslint-plugin-next': 16.4.3" pnpm-workspace.yaml && grep -qxF '  eslint-plugin-jsx-a11y-x: 0.2.0' pnpm-workspace.yaml && grep -qF '"@eslint-react/eslint-plugin": "catalog:"' packages/config/package.json && grep -qF '"@next/eslint-plugin-next": "catalog:"' packages/config/package.json && grep -qF '"eslint-plugin-jsx-a11y-x": "catalog:"' packages/config/package.json && grep -qxF "export { next } from './next.js';" packages/config/eslint/index.js && grep -qF 'rootDir: tsconfigRootDir' packages/config/eslint/next.js && grep -qxF '  eslint: 10.13.0' pnpm-workspace.yaml && grep -qxF '  typescript-eslint: 8.72.0' pnpm-workspace.yaml && grep -qxF '  typescript: 6.0.3' pnpm-workspace.yaml && W=$(git diff -U0 6c265aa -- pnpm-workspace.yaml) && test -z "$(printf '%s\n' "$W" | grep -E '^[-+][A-Za-z]')" && test -z "$(printf '%s\n' "$W" | grep -E '^-  ')" && ! grep -qE '"(eslint-config-next|eslint-plugin-react|eslint-plugin-jsx-a11y|eslint-plugin-react-hooks|eslint-plugin-boundaries)"' package.json apps/web/package.json apps/api/package.json packages/config/package.json packages/contracts/package.json && D=$(git diff -U0 6c265aa -- apps/web/package.json apps/api/package.json) && test -z "$(printf '%s\n' "$D" | grep -E '^[-+] ' | grep -vF '"lint": "eslint .')" && grep -qF 'UL-6' packages/config/README.md && grep -qF 'UL-7' packages/config/README.md && git diff --quiet 6c265aa -- .planning/phases .github scripts apps/web/eslint.config.js</automated>
  </verify>
  <done>The frozen install passes. check:pins reports 17 catalog entries. The next() test passes: the clean page has zero messages; the bad component gets the four expected rule ids as errors; no import-boundary rule is active; no fatal message. The invariant covers all three presets. `pnpm check:all` is green: format, pins, lint:root, 15 turbo tasks, name guard, root tests. The catalog gained exactly three pins (baseline 0), with 7 top-level keys and the eslint/typescript-eslint/typescript pins unchanged (invariant guards). None of the rejected packages is in any manifest. The apps changed only their lint line; ci.yml, scripts and the Phase 1 history are untouched. The README has the next() section and the UL-6/UL-7 checklist. One commit, `feat(config): next() ESLint preset for the Next.js App Router [UL-5]`.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| npm registry → pnpm install → developer machines and CI | New lint plugins and their transitive deps run in-process whenever ESLint runs: in CI lint/test jobs (`contents: read`, no secrets in those jobs), on every pre-commit, and in editors |
| HTTP/WS adapters → services → repositories → Prisma | The access-check path (STACK §2.3 AccessService, one ACL path) holds only if adapters cannot reach the database directly; nest() is the guardrail |
| shared lint config → every package's CI gate | A silently weakened preset (warnings pass, dead disable directives, a broken fixture setup that "passes") lowers the gate for every package at once |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-261111-01 | Elevation of Privilege | apps/api controllers / gateways querying Prisma directly, bypassing service-level access checks | medium | mitigate | nest() rejects Prisma, src/core/prisma, PrismaService/PrismaClient (by path and by name) and repositories in `*.controller.ts` / `*.gateway-handlers.ts` / `*.gateway.ts`, and rejects Prisma plus raw SQL in other non-repository files; tests prove each case; apps/api uses nest() from now on. Residual risk (dynamic `import()`, DI by string token, misnamed files) is accepted and documented in the README: lint is a guardrail, code review still applies |
| T-261111-02 | Tampering | Lint gate weakening (warnings, unused `eslint-disable`) | medium | mitigate | `--max-warnings=0` in every lint script, lint:root and lint-staged; `errorsOnly` raises plugin warn rules to error; `reportUnusedDisableDirectives: 'error'`; the invariant test fails if any preset rule resolves to warn |
| T-261111-03 | Repudiation | Preset tests that pass because typed lint failed to parse (fatal messages look like rule hits) | medium | mitigate | `lintFixture` asserts no fatal message and severity 2 for every message; bad-file assertions check specific rule ids; clean files must have zero messages |
| T-261111-04 | Tampering | Pre-commit `eslint --fix` rewriting the intentionally broken fixtures | low | mitigate | packages/config/eslint.config.js ignores `test/fixtures/**` (ESLint 10 nearest-config lookup applies it to the root lint-staged run too); the tests re-prove every fixture's violations on each run |
| T-261111-05 | Denial of Service | CI test job time from typed lint over fixtures | low | accept | About 20 tiny files, one ESLint instance per preset; the run finishes in seconds and turbo caches it by package inputs |
| T-261111-06 | Information Disclosure | Product name leaking into new docs or fixtures (D-33/D-35) | low | mitigate | Docs say "this project"; `pnpm check:name` runs inside `pnpm check:all` in Task 3's verify |
| T-261111-SC | Tampering | npm installs (@eslint-react/eslint-plugin 5.28.8, @next/eslint-plugin-next 16.4.3, eslint-plugin-jsx-a11y-x 0.2.0 + transitive) | high | mitigate | Package legitimacy gate passed: all three are [VERIFIED] (repo matches publisher, SLSA provenance, high downloads, tarballs inspected statically), with no [ASSUMED]/[SUS] package, so no blocking checkpoint is needed. Exact catalog pins at least 14 days old, enforced by `minimumReleaseAge` for transitive deps too. Committed lockfile, CI `--frozen-lockfile --ignore-pnpmfile`. The executor stops on unmet peers or ignored build scripts instead of adding allowlist keys. CODEOWNERS puts packages/config, the catalog and the lockfile under lead review |
</threat_model>

<verification>
Run from the repo root after all three commits:
- `pnpm install --frozen-lockfile && pnpm check:all` exits 0, ending with `Tasks: 15 successful, 15 total` in the turbo step and 51 passing root tests.
- `pnpm --filter @app/config test` passes all four tests (nest, base, invariant, next).
- `git rev-list --count 6c265aa..HEAD` prints 3, and `git log --oneline 6c265aa..HEAD` shows, in order, `feat(config): nest() …`, `feat(config): base() …` and `feat(config): next() …`, each with `[UL-5]`. For each of the three SHAs, `B=$(git log -1 --format=%B <sha>) && printf '%s\n' "$B" | grep -qxF 'Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>'` succeeds.
- `git diff --quiet 6c265aa -- .github scripts .planning/phases apps/web/eslint.config.js` (CI, guards and Phase 1 history untouched).
- `git diff --shortstat 6c265aa -- . ':(exclude)pnpm-lock.yaml' ':(exclude).planning'`: report the number. Expected roughly 450–550 changed lines; above 600, say so in the SUMMARY with the per-file stat.
- `node scripts/check-product-name.mjs` exits 0.
</verification>

<success_criteria>
- `@app/config/eslint` exports base(), next() and nest(), each fn({ tsconfigRootDir }), and the ESLint Node API tests prove that each preset's rules fire on bad fixtures and stay silent on clean ones.
- nest() enforces the STACK §3.1 layering (adapters → services → repositories → Prisma) with core rules only, and apps/api already uses it.
- next() covers the Next, React and a11y rules for the App Router with ESLint-10-compatible plugins, and leaves FSD boundaries to Steiger.
- Warnings and unused disable directives fail lint everywhere lint runs; test files get targeted relaxations and a `.only` ban.
- The tests run in CI's `test` job and in `pnpm check:all` without any ci.yml change. All pins are exact, mature and catalog-only, and the frozen install is green.
- The UL-6 and UL-7 owners have a README that tells them exactly what to do.
</success_criteria>

<output>
Create `.planning/quick/261111-esl-eslint-presets/261111-esl-SUMMARY.md` when done, with `status: complete` in its frontmatter. Record:
- the three commit hashes
- the `pnpm install` peer/build-script log result and whether a second typescript-eslint patch version entered the lockfile
- the final diff shortstat (lockfile and .planning excluded)
- the test count and runtime of `@app/config:test`
- any deviation from this plan, with its reason

Notes for the orchestrator:
1. Add the 261111-esl row to the STATE.md "Quick Tasks Completed" table.
2. The PR (opened by the lead) changes packages/config, the catalog and the lockfile, so it needs lead review under CODEOWNERS.
3. The comparison with the earlier independent attempt happens at the very end, outside this plan.
</output>
