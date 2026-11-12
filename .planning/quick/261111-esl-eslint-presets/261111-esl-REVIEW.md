---
phase: quick-261111-esl
reviewed: 2026-11-12T02:31:54Z
depth: deep
files_reviewed: 34
files_reviewed_list:
  - README.md
  - apps/api/eslint.config.js
  - apps/api/package.json
  - apps/web/package.json
  - package.json
  - packages/config/README.md
  - packages/config/eslint.config.js
  - packages/config/eslint/base.js
  - packages/config/eslint/index.js
  - packages/config/eslint/nest.js
  - packages/config/eslint/next.js
  - packages/config/package.json
  - packages/config/test/eslint-presets.test.js
  - packages/config/test/fixtures/base/bad.ts
  - packages/config/test/fixtures/base/clean.ts
  - packages/config/test/fixtures/base/focused.test.ts
  - packages/config/test/fixtures/base/tsconfig.json
  - packages/config/test/fixtures/nest/src/app.module.ts
  - packages/config/test/fixtures/nest/src/core/prisma/index.ts
  - packages/config/test/fixtures/nest/src/core/prisma/prisma.service.ts
  - packages/config/test/fixtures/nest/src/generated/prisma/client.ts
  - packages/config/test/fixtures/nest/src/messages/messages.controller.ts
  - packages/config/test/fixtures/nest/src/messages/messages.gateway-handlers.ts
  - packages/config/test/fixtures/nest/src/messages/messages.repository.ts
  - packages/config/test/fixtures/nest/src/messages/messages.service.ts
  - packages/config/test/fixtures/nest/src/tasks/tasks.service.ts
  - packages/config/test/fixtures/nest/tsconfig.json
  - packages/config/test/fixtures/next/app/page.tsx
  - packages/config/test/fixtures/next/components/bad.tsx
  - packages/config/test/fixtures/next/jsx.d.ts
  - packages/config/test/fixtures/next/tsconfig.json
  - packages/config/tsconfig.json
  - packages/contracts/package.json
  - pnpm-workspace.yaml
findings:
  critical: 1
  warning: 4
  info: 6
  total: 11
  necessity: 0
status: issues_found
---

# Quick Task 261111-esl: Code Review Report

**Reviewed:** 2026-11-12T02:31:54Z
**Depth:** deep
**Files Reviewed:** 34 (`git diff origin/main...HEAD`; `.planning/` and `pnpm-lock.yaml` excluded from source review, lockfile checked for supply chain)
**Status:** issues_found

## Summary

I reviewed the base(), next() and nest() presets, the preset tests and fixtures, the lint-script and
lint-staged changes, the catalog pins and lockfile, and the docs. I ran each preset with the ESLint
Node API on throwaway fixtures in the session scratchpad, outside the repo. I also linted one
temporary probe file inside `apps/api/src/`, from the root and from the package, and deleted it
afterwards (`git status` is clean).

What holds up:
- `pnpm install --frozen-lockfile` passes ("Lockfile passes supply-chain policies"). `pnpm check:all` exits 0 with `Tasks: 15 successful, 15 total` and 51/51 root tests.
- All 29 packages new to the lockfile were published before the 2026-10-28 cutoff. The latest is `@eslint-react/*` 5.28.8 on 2026-10-23. `@next/eslint-plugin-next` 16.4.3 is the newest version that passes the 14-day rule (16.4.4 was published 2026-11-02). Peers: `eslint-plugin-jsx-a11y-x` declares `^9 || ^10`, `@eslint-react` declares `*`, and the Next plugin declares none.
- Every lint entry point has `--max-warnings=0`: all four package scripts, `lint:root` and lint-staged. ci.yml is unchanged, and the new tests reach both CI's `test` job and `check:all` through `turbo run test`. Commit subjects carry `[UL-5]` and the trailer. `.planning/phases/01-*` is untouched.
- Idiomatic code passes:
  - **nest():** `@Module`/`@Controller`/`@Injectable` classes, constructor injection, `PrismaService extends PrismaClient` with `onModuleInit`, a repository that re-exports model types, and `*.spec.ts` / `test/*.e2e-spec.ts` files that use Prisma.
  - **next():** an async Server Component page with `await params`, `generateMetadata`, the root layout, a route handler, a custom hook, a client component with an async `onClick`, and both `next.config.mjs` and `next.config.ts`.
- Violations are caught:
  - nest(): direct Prisma and repository imports in adapters (relative, extensionless and `@prisma/*`), and type-only generated-client imports in services.
  - next(): `exhaustive-deps`, `set-state-in-effect`, `role-has-required-aria-props` and `no-html-link-for-pages` fire. No import or boundary rule is active, so nothing overlaps Steiger.
  - Calling a lint script from the repo root or from `apps/api` resolves `apps/api/eslint.config.js` and fails on the layering violation.

Key concerns:
1. A whole class of files (`.mts`, `.cts`, `.jsx`) is never linted by any preset or by lint-staged. The layering rule also skips `.js` in `src/`, and the React rules skip `.js`.
2. The layering rule has bypasses that the README says are covered ("type-only included", "barrels and aliases included").
3. It has a domain false positive (`*Repository` names, for example `GitHubRepository`).
4. Any app-level `no-restricted-imports` or `no-restricted-syntax` entry silently deletes the layering rule.

## Narrative Findings (AI reviewer)

## Critical Issues

### CR-01: `.mts`, `.cts` and `.jsx` files are silently never linted, so they bypass every preset, the layering rule and `--max-warnings=0`

**File:** `packages/config/eslint/base.js:8`, `packages/config/eslint/nest.js:9-11`, `packages/config/eslint/next.js:28-30`, `package.json:26`
**Issue:** `CODE_FILES = '**/*.{ts,tsx,js,mjs,cjs}'` is the only `files` glob that turns rules on. ESLint 10 skips files no config block matches, and `eslint .` reports nothing for them. Probes:
- In the nest fixture, `src/modules/bypass/esm.service.mts`, `cjs.service.cts` and `m.controller.mts` all import `@prisma/client` / `PrismaService`. With `eslint .` they produced no output at all. Passed explicitly they only print the warning "File ignored because no matching configuration was supplied".
- A temporary `apps/api/src/zzprobe/zz.service.mts` linted as lint-staged would (`eslint --no-warn-ignored --max-warnings=0 <file>`) produced nothing and exited 0.
- `src/legacy.jsx` (missing keys, raw `<img>`) is "ignored because no matching configuration". `src/legacy.js` with a conditional `useState` passes, because the React block covers only `**/*.{ts,tsx}` and a11y only `**/*.tsx`.
- In nest(), `SOURCE = 'src/**/*.ts'` and the `ADAPTERS` globs are `.ts`-only, so `src/**/*.service.js` / `.mts` is outside the layering rule even where the file is linted.
- The lint-staged glob `*.{ts,tsx,js,mjs,cjs}` skips the same extensions at commit time.

The task asks for every extension to be covered. The preset itself expects `.mts`/`.cts` modules: `PRISMA_SERVICE` and `REPOSITORY` match `\.[cm]?[jt]s` import suffixes. NestJS ESM, Vitest and Vite configs commonly use `.mts`. As written, one rename to `.mts` takes a file out of the gate this task hardens, without a trace in CI.
**Fix:**
```js
// base.js
export const CODE_FILES = '**/*.{ts,tsx,mts,cts,js,jsx,mjs,cjs}';
export const TEST_FILES = [
  '**/*.{test,spec}.{ts,tsx,mts,cts,js,jsx,mjs,cjs}',
  '**/*.e2e-spec.{ts,mts,cts}',
  '**/{test,tests,__tests__}/**/*.{ts,tsx,mts,cts,js,jsx,mjs,cjs}',
];
// JS without type info:
{ files: ['**/*.{js,jsx,mjs,cjs}'], extends: [tseslint.configs.disableTypeChecked] },
// nest.js
const SOURCE = 'src/**/*.{ts,mts,cts,js,mjs,cjs}';
const ADAPTERS = ['controller', 'gateway-handlers', 'gateway'].map((k) => `src/**/*.${k}.{ts,mts,cts,js,mjs,cjs}`);
const PRISMA_OWNERS = ['src/**/*.repository.{ts,mts,cts,js,mjs,cjs}', 'src/core/prisma/**'];
// next.js: React non-typed rules on JS too, a11y on all JSX files
{ files: ['**/*.{js,jsx,mjs,cjs}'], extends: [react.configs.recommended] },
{ files: ['**/*.{tsx,jsx}'], plugins: { 'jsx-a11y-x': jsxA11y }, rules: { /* six rules */ } },
```
and `"*.{ts,tsx,mts,cts,js,jsx,mjs,cjs}"` in lint-staged. Add a `.mts` service and a `.jsx` component to the fixtures so a regression fails the test.

## Warnings

### WR-01: The layering rule has bypasses the README says are covered (namespace barrel import, `import()` types, `export *`, barrel aliases)

**File:** `packages/config/eslint/nest.js:15-22,30-40,55-69`; `packages/config/README.md:51,53,62`
**Issue:** The README says the services rule rejects "any Prisma import, type-only included", and the adapters rule rejects names "barrels and aliases included". Probes in the nest fixture that pass with zero layering hits:
- `src/modules/bypass/ns.service.ts`: `import * as core from '../../core/prisma/index.js'` followed by `constructor(private readonly db: core.PrismaService)`. The service block bans only `PRISMA_CLIENT` / `PRISMA_SERVICE` paths, not `CORE_PRISMA`, and the name selector sees no `ImportSpecifier`. The only hit was the raw-SQL backstop, so a plain `this.db.message.findMany()` would pass.
- `importtype.service.ts`: `type Client = import('@prisma/client').PrismaClient` (`TSImportType`), which passes despite "type-only included".
- `barrel.service.ts`: `export * from '../../core/prisma/index.js'` passes. `barrel.controller.ts` then reaches `PrismaService` through `import * as svc from './barrel.service.js'`, and only the raw-SQL selector fired there too.
- `alias.service.ts`: `import { Db } from '../../core/prisma/index.js'`, where the owner barrel does `export { PrismaService as Db }`.
- `dyn.controller.ts`: `await import('@prisma/client')`. This one is documented, but it is cheap to close for literal specifiers.
**Fix:** add these selectors to both blocks, and fix the README wording or list what remains open under "Limits":
```js
const PRISMA_PATH = String.raw`/^@prisma\/|^\.prisma\/|(^|\/)generated\/prisma(\/|$)|(^|\/)core\/prisma(\/|$)|(^|\/)prisma\.service/`;
{ selector: `ImportDeclaration[source.value=${PRISMA_PATH}] > ImportNamespaceSpecifier`, message: OWNER_MESSAGE },
{ selector: `ExportAllDeclaration[source.value=${PRISMA_PATH}]`, message: OWNER_MESSAGE },
{ selector: `ImportExpression[source.value=${PRISMA_PATH}]`, message: OWNER_MESSAGE },
{ selector: `TSImportType Literal[value=${PRISMA_PATH}]`, message: OWNER_MESSAGE },
```
Modules keep `import { PrismaModule } from '…/core/prisma/index.js'` (a named import, still allowed). Add one fixture line per selector.

### WR-02: Adapter name ban `Repository$` rejects legitimate domain types such as `GitHubRepository`

**File:** `packages/config/eslint/nest.js:22,84-88`
**Issue:** `ADAPTER_NAMES = '^Prisma(Service|Client)$|Repository$'` is matched against every `ImportSpecifier` from any module. The product has a GitHub integration (STACK §3: `src/modules/github`, the `connect-repo` feature, the `pull-request` entity), so contract types such as `GitHubRepository` or `LinkedRepository` are likely. Probe: `src/modules/bypass/github.controller.ts` with `import type { GitHubRepository } from './github.types.js'` fails with "Controllers and gateways are adapters … never Prisma or a repository". The repository-path pattern (`REPOSITORY`) already covers real repository modules, so the broad name rule mostly adds false positives. The barrel case it targets is narrow.
**Fix:** match names only when they come from a non-contracts source, or narrow the pattern to the project's class convention. For example, ban `*Repository` names only from relative imports:
```js
{ selector: String.raw`ImportDeclaration[source.value=/^\./] > ImportSpecifier[imported.name=/Repository$/]`, message: ADAPTER_MESSAGE },
```
Then add a clean fixture `github.controller.ts` that imports `type GitHubRepository` from `@app/contracts`, so the false positive is guarded.

### WR-03: An app-level `no-restricted-imports` / `no-restricted-syntax` entry silently replaces the whole layering rule

**File:** `packages/config/eslint/nest.js:59,68,74,83`; `packages/config/README.md` (no warning); `apps/api/eslint.config.js:1-2`
**Issue:** ESLint flat config replaces a rule's options wholesale when a later block sets the same rule. Probe: `defineConfig(nest(...), { files: ['**/*.ts'], rules: { 'no-restricted-imports': ['error', 'lodash'] } })` brings the hits on `nested.controller.ts` (repository + core/prisma imports) and on `prisma-dir.service.ts` (generated Prisma type import) down to `[]`. UL-7 adding a single ban, for example a wrong `zod` import, would turn the STACK §3.1 guard off with no signal. Also, `apps/api/eslint.config.js` is not in CODEOWNERS (only `/packages/config/` and `/eslint.config.js` are), so switching it back to `base()` needs no lead review.
**Fix:** document in the README nest() section that apps must not set these two rules, and that extra bans go through the preset. Better, export a `nest({ tsconfigRootDir, restrictedImports })` option that merges patterns. Add a guard test that loads `apps/api/eslint.config.js` and asserts that `calculateConfigForFile('apps/api/src/x/x.controller.ts')` still contains the adapter patterns. Add `/apps/*/eslint.config.js @soadap` to CODEOWNERS (lead change to `.github/`).

### WR-04: Preset tests leave much of the documented contract unproven

**File:** `packages/config/test/eslint-presets.test.js:42-73,116-137`; `packages/config/test/fixtures/nest/src/**`
**Issue:** The task requires tests that prove each preset fires and that clean code passes. Untested behaviour that the README promises:
- the `*.gateway.ts` adapter glob;
- a `@prisma/*` package import (only `generated/prisma` and `prisma.service` paths are exercised);
- the `PRISMA_SERVICE` path rule in services: `tasks.service.ts` imports via the barrel, so only the name selector fires;
- raw SQL in an adapter, the reason `RAW_SQL` is repeated at `nest.js:85`;
- the test-file exemption ("Test files may use Prisma for setup") and `*.e2e-spec.ts`;
- any `.js`/`.mjs` file, which goes through the `disableTypeChecked` path;
- a clean Nest file with real decorators on a controller (only `app.module.ts` has one).

Also, "no preset rule is warn-level" checks one file per preset (`clean.ts`, `messages.controller.ts`, `components/bad.tsx`), so a warn rule scoped to `.js`/`.mjs` would not be seen. `errorsOnly()` covers that today, but the test's name claims more than it checks. Each gap above matches a hole found in CR-01 / WR-01 that a fixture would have caught.
**Fix:**
- Add fixtures: `src/realtime/realtime.gateway.ts` (bad), `src/messages/messages.service.spec.ts` and `test/app.e2e-spec.ts` importing `@prisma/client` (clean), `src/x/raw.controller.ts` calling `$queryRaw` (bad), `src/x/direct.service.ts` importing `../core/prisma/prisma.service.js` (bad), `src/x/esm.service.mts` (bad), and a `next.config.mjs` (clean).
- In the warn-level test, iterate over one representative file per extension.

## Info

### IN-01: `.only` ban misses chained modifiers (`it.concurrent.only`, `test.sequential.only`)

**File:** `packages/config/eslint/base.js:47-53`
**Issue:** `no-restricted-properties` matches only `<it|test|describe|suite>.only`. Probe: `it.concurrent.only('b', …)` in `src/a.test.ts` passes, while `it.only.each`, `describe['only']` and destructured `only` are caught. Vitest's `allowOnly` defaults to false in CI, which softens this.
**Fix:** add `no-restricted-syntax` `{ selector: "MemberExpression[property.name='only'][object.type='MemberExpression']" }` within `TEST_FILES`, or document the gap.

### IN-02: Raw-SQL backstop misses computed and destructured access

**File:** `packages/config/eslint/nest.js:37-40`
**Issue:** `MemberExpression[property.name=/^\$(queryRaw|executeRaw)/]` misses `p['$queryRawUnsafe']('x')`, where only `dot-notation` fires and `--fix` would turn it into a hit, and `const { $executeRaw } = p`, which passes the backstop. Low impact, because both still need a Prisma handle that WR-01's selectors would block.
**Fix:** add `Property[key.name=/^\$(queryRaw|executeRaw)/]` within `ObjectPattern`, plus `MemberExpression[computed=true][property.value=/^\$(queryRaw|executeRaw)/]`.

### IN-03: `@app/config/eslint` eagerly loads the Next/React/a11y plugins for every base()-only consumer

**File:** `packages/config/eslint/index.js:4-6`
**Issue:** The root config, `packages/contracts`, `packages/config` and `apps/web` (still on base()) import the barrel, which pulls in `@next/eslint-plugin-next`, `@eslint-react/*` (and `ts-pattern`, `string-ts`) and `eslint-plugin-jsx-a11y-x`. Measured: `import('./eslint/base.js')` takes 0.26–0.31 s and `import('./eslint/index.js')` takes 0.48–0.51 s, so each ESLint process gets ~0.2 s slower. A broken React-plugin release would also break backend and root lint.
**Fix:** add subpath exports (`"./eslint/base"`, `"./eslint/nest"`, `"./eslint/next"`) and keep the barrel for convenience, or load next.js's plugins lazily inside `next()` with top-level `await import()`.

### IN-04: The README asks for a reason on every directive, but nothing enforces it, and blanket `/* eslint-disable */` turns the layering rule off

**File:** `packages/config/README.md:29`; `packages/config/eslint/base.js:26-27`
**Issue:** Probe `src/d.ts` with `/* eslint-disable */` and `export const a: any` is CLEAN. A directive without `-- reason` is also accepted. In an adapter, `/* eslint-disable no-restricted-imports */` removes the STACK §3.1 guard without review friction.
**Fix:** add `@eslint-community/eslint-plugin-eslint-comments` (`require-description`, `no-unlimited-disable`, `no-restricted-disable` for `no-restricted-imports` / `no-restricted-syntax` in `src/**`), after a catalog and peer check. Otherwise reword the README as a review convention.

### IN-05: next() applies browser globals to server-only files

**File:** `packages/config/eslint/next.js:21-25`
**Issue:** `globals.browser` is set for all `CODE_FILES`, including `next.config.mjs`, route handlers and Server Components. In JS files (where `no-undef` is active) `window` in a server file is accepted. TS files rely on `tsc`, so the impact is limited to `.js`/`.mjs`.
**Fix:** scope browser globals to `**/*.{tsx,jsx}` and keep `globals.node` for `next.config.*`. Alternatively, document that it is accepted.

### IN-06: The diff is over the 600-line warning

**File:** n/a (whole change)
**Issue:** `git diff --shortstat origin/main...HEAD` without the lockfile and `.planning` gives 34 files, +644/−44 (688 lines), above the ~400 guide and the 600 warning. The SUMMARY records this. The fixes above add fixtures, so consider splitting before the PR: base hardening + `--max-warnings` / nest() / next() + docs.
**Fix:** split at PR time (e.g. `/gsd-pr-branch`, then stacked PRs), or accept it with the rationale in the PR body.

---

_Reviewed: 2026-11-12T02:31:54Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
