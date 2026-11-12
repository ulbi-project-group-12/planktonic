---
phase: quick-261111-esl
plan: 01
subsystem: config/eslint
tags: [eslint, presets, nest, next, lint-gate, UL-5]
status: complete
requires: []
provides:
  - "@app/config/eslint exports base(), next(), nest(), each fn({ tsconfigRootDir })"
  - "nest(): STACK §3.1 layering (adapters → services → repositories → Prisma) with core rules"
  - "next(): Next core-web-vitals + @eslint-react recommended-type-checked + six jsx-a11y-x rules, no boundary rules"
  - "base(): unused directives are errors, warn rules raised to error, test-file relaxations, .only ban"
  - "--max-warnings=0 in every lint script, lint:root and lint-staged"
  - "@app/config#test (node:test, ESLint Node API over fixtures) in turbo test → CI test job and check:all"
affects:
  - "apps/api lints with nest() from now on"
  - "UL-6 must switch apps/web to next() in the PR that creates app/"
  - "UL-7 follows the nest() file names and Prisma output path"
tech-stack:
  added:
    - "@eslint-react/eslint-plugin 5.28.8"
    - "@next/eslint-plugin-next 16.4.3"
    - "eslint-plugin-jsx-a11y-x 0.2.0"
  patterns:
    - "coreBlocks() + finalize() composition shared by all presets"
    - "errorsOnly(): non-mutating warn→error severity rewrite"
key-files:
  created:
    - packages/config/eslint/base.js
    - packages/config/eslint/nest.js
    - packages/config/eslint/next.js
    - packages/config/README.md
    - packages/config/test/eslint-presets.test.js
    - packages/config/test/fixtures/{base,nest,next}/**
  modified:
    - packages/config/eslint/index.js
    - packages/config/eslint.config.js
    - packages/config/package.json
    - packages/config/tsconfig.json
    - apps/api/eslint.config.js
    - apps/api/package.json
    - apps/web/package.json
    - packages/contracts/package.json
    - package.json
    - pnpm-workspace.yaml
    - pnpm-lock.yaml
    - README.md
decisions:
  - "nest() matches imported names (PrismaService / PrismaClient / *Repository) with no-restricted-syntax on ImportSpecifier / re-export specifiers, not no-restricted-imports importNamePattern, because the latter flags every namespace import and export * in src"
  - "Strict Prisma encapsulation (QD-04): outside repositories, src/core/prisma and tests even type-only Prisma imports fail; services take model types from repository re-exports"
  - "next() replaces eslint-config-next with ESLint-10-compatible plugins (@eslint-react, jsx-a11y-x) and leaves FSD boundaries to Steiger"
metrics:
  duration: "~25 min"
  completed: 2026-11-11
actuals:
  tokens: 9539
  tasks: 3
  commits: 3
commits: 3
plan_head_before: 6c265aa185cdf1d9c00ee9f696b555165f1ef7ed
plan_head_after: 5a1c8e3e8db83a2cf5640b5985ad7670d1f4baf0
---

# Quick Task 261111-esl: ESLint presets base/next/nest Summary

`@app/config/eslint` now ships base(), next() and nest(). nest() enforces the STACK §3.1 layering
with core rules only. next() covers the Next.js App Router with plugins whose peers accept ESLint 10,
and it leaves FSD to Steiger. base() fails on warnings and on unused disable directives. Four
ESLint Node API tests over fixtures prove every preset and run in CI's `test` job and in
`pnpm check:all`.

## Commits

| Task | Commit  | Subject                                                                            |
| ---- | ------- | ---------------------------------------------------------------------------------- |
| 1    | d16bd3e | feat(config): nest() ESLint preset with the STACK 3.1 layering rule [UL-5]         |
| 2    | 3100260 | feat(config): base() ESLint preset fails on warnings and unused directives [UL-5]  |
| 3    | 5a1c8e3 | feat(config): next() ESLint preset for the Next.js App Router [UL-5]               |

Commit 1 also adds the PLAN. Every commit carries the `Co-Authored-By: Claude Opus 5.5` trailer
and went through the husky/lint-staged hook (no `--no-verify`).

## Results

- `pnpm install --frozen-lockfile` passes. `pnpm check:all` **exit 0**: 17 catalog entries,
  5 manifests, `Tasks: 15 successful, 15 total`, name guard clean, 51 root tests pass.
- `@app/config:test`: 4 tests (nest, base, next, no-warn invariant), 4 pass, about 1.1–1.7 s.
- Install log (`pnpm install` after adding the pins): no peer warnings, no `Ignored build scripts`,
  no `ERR_PNPM_NO_MATURE_MATCHING_VERSION`. +42 packages. The lockfile holds a single
  typescript-eslint version (8.72.0 for utils/parser/typescript-estree). The plan's possible
  second 8.72.1 copy did not happen.
- Registry check on 2026-11-11: @eslint-react/eslint-plugin 5.28.8 (2026-10-23, peers eslint `*`,
  typescript `*`), @next/eslint-plugin-next 16.4.3 (2026-10-23, no peers), eslint-plugin-jsx-a11y-x
  0.2.0 (2026-05-10, peer eslint `^9 || ^10`). All three predate the 2026-10-28 cutoff.
- No JSDoc cast was needed for `@next/eslint-plugin-next`; `tsc` accepts next.js as written.
- The next fixture prints no "Pages directory cannot be found" warning.
- `.github/`, `scripts/`, `.planning/phases/` and `apps/web/eslint.config.js` are unchanged since
  6c265aa. The app manifests changed only their `lint` line.

## Diff size

`git diff --shortstat 6c265aa -- . ':(exclude)pnpm-lock.yaml' ':(exclude).planning'`:
**34 files changed, 644 insertions(+), 44 deletions(-)**, 688 changed lines. That is above the
600 warning. The plan estimated 450–550.

| File / group                            | Lines |
| --------------------------------------- | ----- |
| packages/config/test/eslint-presets.test.js | +137 |
| packages/config/eslint/base.js (split from index.js, which drops 31) | +99 / index −31 |
| packages/config/README.md               | +97   |
| packages/config/eslint/nest.js          | +91   |
| packages/config/eslint/next.js          | +47   |
| 21 fixture files (1–21 lines each)      | +147  |
| manifests, configs, root README, catalog | ~70  |

The overshoot comes from the README (docs for UL-6/UL-7), the test file and prettier line wrapping.
`git diff` shows base.js as new and index.js as rewritten, not as a rename, because index.js is
kept as the public entry; ~25 of base.js's lines are the old index.js body.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] nest() name matching moved from `importNamePattern` to `no-restricted-syntax`**
- **Found during:** Task 1
- **Issue:** The plan's `{ regex: '.', importNamePattern: '^Prisma(Service|Client)$' }` pattern makes
  core `no-restricted-imports` report every namespace import (`import * as z from 'zod'`) and every
  `export * from` in `src/`, for any module. A probe with ESLint 10.13 confirmed both
  false positives.
- **Fix:** Path patterns stay in `no-restricted-imports`. Names are matched with
  `no-restricted-syntax` selectors on `ImportSpecifier[imported.name=…]` and on re-export
  specifiers, which still catches barrels, aliases and `import type`. The adapter block repeats the
  raw-SQL selector, because its `no-restricted-syntax` options replace the service block's. The
  clean fixture `src/app.module.ts` now uses a namespace import as a regression guard.
- **Test impact:** the controller's hits are `no-restricted-imports` + `no-restricted-syntax` on
  lines {1, 2}. tasks.service.ts is flagged only by `no-restricted-syntax` (barrel PrismaService
  import on line 1 + `$queryRaw`), where the plan expected `no-restricted-imports` + `no-restricted-syntax`.
- **Files:** packages/config/eslint/nest.js, packages/config/test/eslint-presets.test.js,
  packages/config/test/fixtures/nest/src/app.module.ts
- **Commit:** d16bd3e

**2. [Diff budget] Root README wording shortened**
- The plan's longer wording for the `pnpm test` and `packages/config` rows widened both tables, so
  Prettier would realign 44 lines. The shorter wording ("Vitest, ESLint preset tests";
  "ESLint presets (see its README), TS and Prettier config, `product.ts`") fits the existing widths,
  so the README diff is 6 lines.

**3. [Minor] app.module.ts fixture** passes `{ providers: [...] }` to the local `Module` decorator,
so the namespace import has a use. The plan had a no-arg decorator.

### Not changed
- The plan says the orchestrator owns STATE.md. This run's task asked the executor to add the row,
  so this executor added it.

## Known Stubs

None.

## Threat Flags

None. The new surface is the three lint plugins (T-261111-SC), covered by the plan's threat model.

## Open risks carried forward

- nest() is a guardrail, not a sandbox. Dynamic `import()`, injection by string token and
  misnamed files get past it (documented in packages/config/README.md).
- apps/web stays on base() until UL-6 creates `app/`.
- eslint-plugin-jsx-a11y-x is pre-1.0 (0.2.0).
- Locally the pre-commit `eslint --fix` deletes unused disable directives; CI fails on them
  (documented).
- Strict type-only Prisma ban in services (QD-04). A reviewer may prefer allowing `import type`,
  which is a one-block change.

## Self-Check: PASSED

- FOUND: packages/config/eslint/{base,nest,next,index}.js, packages/config/README.md,
  packages/config/test/eslint-presets.test.js, fixtures for base/nest/next
- FOUND: d16bd3e, 3100260, 5a1c8e3 (ancestors of HEAD; `git rev-list --count 6c265aa..HEAD` = 3)

## Gap closure (2026-11-11)

This pass closes the gaps in 261111-esl-VERIFICATION.md, plus one port from the comparison.
It adds no dependencies and touches no lockfile. The diff is 8 files, +43/−12, measured from
c15f40d.

| # | Gap | Fix | Commit |
|---|-----|-----|--------|
| 1 | BLOCKER, M1: the adapter `*.repository` path ban had no test that relied on it alone | `messages.controller.ts` line 3 now imports `listRows`, a name that doesn't end in `Repository`, from `./messages.repository.js`. The test requires line 3 to be reported by `no-restricted-imports` and nothing else. | a38b254 |
| 2 | WARNING, M12: `settings.next.rootDir` had no test | The next() test reads the resolved config for `app/page.tsx` and asserts `settings.next.rootDir === tsconfigRootDir` | 03134a5 |
| 3 | Port: the owner and test-import blocks only covered `src/**`, so `scripts/*.ts` could import `@prisma/client` | Both blocks now match all package code (`**/*.{ts,mts,cts,js,mjs,cjs}`). The exemptions are still `src/**/*.repository.*`, `src/core/prisma/**` and tests, plus the new `prisma/**` and `prisma.config.*`. New fixtures: `scripts/backfill.ts`, which must be flagged on line 1 by both rules, and `prisma/seed.ts`, which must stay clean. The fixture tsconfig now includes `scripts` and `prisma`. The README's nest() section describes the wider scope. | a4b1386 |

The policy itself is unchanged: type-only Prisma imports are still banned outside repositories
(QD-04). The adapter globs still only cover `src/**`.

### Mutation re-runs

Each mutation was applied with `sed`, run under `node --test test/eslint-presets.test.js`, and
then reverted. A `cmp` / `git diff --quiet` check confirmed each revert.

| # | Mutation | Before | After |
|---|----------|--------|-------|
| M1 | nest: drop REPOSITORY from the adapter no-restricted-imports patterns | survived (5/5 pass) | killed (nest() test fails) |
| M12 | next: drop `settings.next.rootDir` | survived | killed (next() test fails) |
| M17 | nest: owner and test-import blocks back to `src/**` only | (new) | killed |
| M18 | nest: drop the `prisma/**` / `prisma.config.*` exemption | (new) | killed |

### Gate

- `pnpm install --frozen-lockfile`: exit 0, lockfile unchanged.
- `pnpm check:all`: exit 0. turbo ran 15/15 tasks, `@app/config:test` passed ok 1–5, and the
  root tests passed 51/51.
- The first check:all attempt aborted (exit 134) in `@app/web#typecheck`. A Homebrew
  `brew upgrade` running in another process had replaced simdjson (libsimdjson.34 → .36) before
  relinking node 26.13.0_2. Nothing in the repo caused it. I waited for the new node to link,
  without touching Homebrew, then re-ran the gate and it passed.

### Self-Check (gap closure): PASSED

- FOUND: packages/config/test/fixtures/nest/scripts/backfill.ts,
  packages/config/test/fixtures/nest/prisma/seed.ts
- FOUND: a38b254, 03134a5, a4b1386 (ancestors of HEAD; `git rev-list --count c15f40d..HEAD` = 3
  before this docs commit)

## Policy change: Prisma type imports allowed outside adapters (lead decision, 2026-11-11)

QD-04 is reversed. Outside repositories, `src/core/prisma` and tests, `import type` of Prisma and
`import('…')` types are now allowed, because they never reach the database. Value imports, value
use of `PrismaService` / `PrismaClient`, dynamic `import()`, namespace imports or `export *` of
`src/core/prisma`, and raw SQL stay banned. Adapters (controllers, gateways) are unchanged and
still reject Prisma types: they speak `@app/contracts` types.

- nest.js: the services block uses `@typescript-eslint/no-restricted-imports` with
  `allowTypeImports: true` and value-only name selectors; the adapter block turns that rule off
  because its core rule already bans the same paths.
- Fixtures: new clean `src/tasks/typed.service.ts`; `direct.service.mts` and `scripts/backfill.ts`
  now use value imports; `bypass.service.ts` expects lines 1, 2 and 9 (the type-only lines 3 and
  6 are allowed).
- Mutations: `allowTypeImports: false` and dropping the value-name selector both fail the nest()
  test. `pnpm check:all` exits 0.
