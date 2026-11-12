---
phase: quick-261111-esl
fixed_at: 2026-11-12T02:49:03Z
review_path: .planning/quick/261111-esl-eslint-presets/261111-esl-REVIEW.md
security_path: .planning/quick/261111-esl-eslint-presets/261111-esl-SECURITY.md
iteration: 1
findings_in_scope: 7
fixed: 6
skipped: 1
status: partial
---

# Quick Task 261111-esl: Code Review Fix Report

**Fixed at:** 2026-11-12T02:49:03Z
**Source review:** 261111-esl-REVIEW.md (C-*) and 261111-esl-SECURITY.md residuals (S-R-*)
**Iteration:** 1

**Summary:**
- Findings in scope: 7 (the orchestrator's list: CR-01, WR-01..04 and the security residuals R-1 and R-2; the Info findings IN-01..06 were not in scope)
- Fixed: 6
- Deferred: 1 (S-R-2: no fix release passes the 14-day rule, and overrides are not allowed)

I reproduced every finding before fixing it. For the nest() findings I used ESLint Node API probes on throwaway fixtures in the session scratchpad. For WR-03 I ran a `defineConfig(nest(), { rules: { 'no-restricted-imports': … } })` probe. For S-R-2 I checked `pnpm-lock.yaml` and the npm registry, read-only. Every finding reproduced as described. I rejected none as a false positive.

## Disposition

| ID | Severity | Verdict | Commit | Note |
|----|----------|---------|--------|------|
| C-CR-01 | critical | fixed | 455a44b | Every module extension is now linted in all three presets and in lint-staged. |
| C-WR-01 | high | fixed: requires human verification | af49e93 | New selectors close the Prisma bypasses. The README rejected list and Limits now match the rule. |
| C-WR-02 | medium | fixed: requires human verification | de99321 | The `*Repository` name ban now covers only value imports from local modules. |
| C-WR-03 | medium | fixed | 9558c9a | New `restrictedImports` merge option, an apps/api guard test, CODEOWNERS and README updates. |
| C-WR-04 | medium | fixed | 65a6601, plus fixtures in the commits above | Bad and clean fixtures for each contract item, and a per-extension check. |
| S-R-1 | medium | fixed: requires human verification | 48eea77 (part b in af49e93) | Adapters may not use namespace imports or `import()` of local modules. Production code may not import test helpers. |
| S-R-2 | medium | deferred | — | The fix is minimatch ≥ 11.0.1, a major version outside eslint 10.x's range. Overrides are forbidden. |

"Requires human verification" marks the logic changes: new or narrowed selector semantics. The tests prove each case, but a reviewer should confirm the policy trade-offs listed below.

## Fixed Issues

### C-CR-01: `.mts`/`.cts`/`.jsx` files were never linted

**Files modified:** `packages/config/eslint/base.js`, `packages/config/eslint/nest.js`, `packages/config/eslint/next.js`, `package.json`, `packages/config/README.md`, `packages/config/test/eslint-presets.test.js`, `test/fixtures/nest/src/tasks/direct.service.mts`, `test/fixtures/next/components/legacy.jsx`
**Commit:** 455a44b
**Reproduced:** In nest, `esm.service.mts`, `cjs.service.cts` and `m.controller.mts` did not appear in the `eslint .` results at all. `js.service.js` passed because `SOURCE` matched only `.ts`. In next, `legacy.jsx` was not linted, and a conditional hook in `legacy.js` passed.
**Applied fix:**
- `CODE_FILES` and `TEST_FILES` cover `{ts,tsx,mts,cts,js,jsx,mjs,cjs}`. `e2e-spec` is folded into the test glob for every extension. `disableTypeChecked` applies to `JS_FILES`, which is `{js,jsx,mjs,cjs}`.
- nest(): `SOURCE`, `ADAPTERS`, `PRISMA_OWNERS` and `no-extraneous-class` cover every module extension.
- next(): untyped `react.configs.recommended` applies to JS files. The a11y rules apply to `tsx,jsx,js`. The typed `no-misused-promises` override is split out and stays on `.tsx`.
- lint-staged: `*.{ts,tsx,mts,cts,js,jsx,mjs,cjs}`.
- Test: `every module extension is linted and no preset rule is warn-level` resolves a config for each extension in each preset (and for nest, the layering rule too). A mutation check confirmed it: restoring the old glob makes 3 tests fail.

### C-WR-01: Layering bypasses the README claimed were covered

**Files modified:** `packages/config/eslint/nest.js`, `packages/config/README.md`, the test file, `test/fixtures/nest/src/tasks/bypass.service.ts`, `test/fixtures/nest/src/core/prisma/alias.ts`
**Commit:** af49e93
**Reproduced:** These all linted clean: `ns.service.ts` (`core.PrismaService`), `importtype.service.ts`, `barrel.service.ts` (`export *`), `barrel.controller.ts`, `alias.service.ts` (`Db`) and `dyn.controller.ts`.
**Applied fix:**
- Services and adapters: `:matches(ImportExpression, TSImportType)[source.value=<banned path>]`, plus `MemberExpression` / `TSQualifiedName` on `^Prisma(Service|Client)$`.
- Services: `import * as` and `export *` of `src/core/prisma` are rejected. Named imports from it stay legal, so `PrismaModule` and health indicators still work.
- Owners (`src/core/prisma/**`, repositories): `export { PrismaService as X }` is rejected. That closes the `Db` alias at its source.
- README: the rejected list and Limits now match the rule. Still open, and documented: `import()` with a computed path, injection by string token, renaming in code (`const Db = PrismaService`), and misnamed files.

### S-R-1: Namespace barrels and test helpers bypassed nest()

**Files modified:** `packages/config/eslint/nest.js`, `packages/config/README.md`, the test file, `test/fixtures/nest/src/messages/index.ts`, `test/fixtures/nest/src/test/db.ts`, `test/fixtures/nest/src/tasks/tasks.gateway-handlers.ts`
**Commit:** 48eea77. Part (b), `core.PrismaService` in a service, was already closed by af49e93.
**Reproduced:** `nsbarrel.controller.ts` (`m.MessagesRepository` through `./index.js`) and `helper.controller.ts` (a Prisma helper from `src/test/`) both linted clean.
**Applied fix:**
- Adapters may not use `import * as` or `import()` of local modules: relative, `#`, `@/`, `~/` or `src/` paths.
- Every non-test file in `src/` may not import test files or `test/`, `tests/`, `__tests__/` helpers. Adapter rules now skip test files, like the services block does.
- Not applied: the suggested ban on re-exporting `*Repository` from barrels outside `*.repository.ts`. With the namespace ban and the local value-import ban (WR-02), an adapter can no longer reach a repository through a barrel, so that ban would only add friction to legitimate service-level barrels.

### C-WR-02: `Repository$` name ban flagged domain types

**Files modified:** `packages/config/eslint/nest.js`, `packages/config/README.md`, the test file, `test/fixtures/nest/src/contracts.d.ts`, `test/fixtures/nest/src/github/github.controller.ts`, `test/fixtures/nest/src/github/barrel.controller.ts`
**Commit:** de99321
**Reproduced:** `github.controller.ts` with `import type { GitHubRepository } from './github.types.js'` failed with the adapter message.
**Applied fix:** `*Repository` names are banned in adapters only as **value** imports or re-exports from **local** modules. Nest injection needs a value import, and type-only imports from a `*.repository` path are still caught by the path rule. This is narrower than the review's suggestion (relative imports only), because the reviewer's own probe, a local `import type`, now passes too. `PrismaService` / `PrismaClient` stay banned by name from any module. Fixtures: a decorated `github.controller.ts` importing `GitHubRepository` from `@app/contracts` (clean), and `barrel.controller.ts`, a value import of `MessagesRepository` from a barrel (bad).

### C-WR-03: App-level rules silently replaced the layering

**Files modified:** `packages/config/eslint/nest.js`, `packages/config/README.md`, the test file, `packages/config/turbo.json` (new), `.github/CODEOWNERS`
**Commit:** 9558c9a
**Reproduced:** With an app-level `no-restricted-imports: ['error', 'lodash']`, `messages.controller.ts` went from 3 import hits to 0.
**Applied fix:**
- `nest({ tsconfigRootDir, restrictedImports })` merges extra `patterns` into every block that sets `no-restricted-imports`. `apps/api/eslint.config.js` is unchanged, since it passes none.
- Guard test: the resolved config of `apps/api/eslint.config.js` for a controller, a service and a repository must keep every preset entry of both rules, and the merge must work. Mutation check: an app override makes it fail.
- New `packages/config/turbo.json` adds `$TURBO_ROOT$/apps/*/eslint.config.js` to the `test` inputs, so CI's turbo cache cannot skip the guard. Checked with `turbo --dry=json`.
- CODEOWNERS: `/apps/*/eslint.config.js @soadap`.
- README: apps must not set these two rules themselves; the section explains how to use `restrictedImports`.

### C-WR-04: Preset tests left the contract unproven

**Files modified:** the test file, plus fixtures `nest/src/realtime/realtime.gateway.ts`, `nest/src/messages/messages.service.spec.ts`, `nest/src/app.e2e-spec.ts`, `nest/src/tasks/legacy.service.js`, `next/next.config.mjs`
**Commit:** 65a6601. The earlier commits added `.mts`, `.jsx`, the bypasses, the decorated controller and the per-extension warn check.
**Applied fix:** The gaps the review listed now have tests:
- the `*.gateway` glob, an `@prisma/*` package and raw SQL in an adapter;
- the `PRISMA_SERVICE` path in a service (`direct.service.mts`);
- the spec and e2e-spec Prisma exemption;
- a `.js` service;
- a clean `.mjs` file under next();
- a decorated controller;
- the warn-level check over every extension.

The preset suite now has 5 tests.

## Skipped Issues

### S-R-2: minimatch@10.2.6 advisory GHSA-g3hv-75wg-m249 (deferred)

**File:** `pnpm-lock.yaml`
**Reason:** This is out of scope for a fix now, and it was not introduced by this task. Confirmed:
- The lockfile resolves a single `minimatch@10.2.6`.
- The advisory's fix is in 11.x only. Version 11.0.1 was published 2026-10-27, but the 11.x line is outside eslint 10's `^10.2.6` range. The latest eslint, 10.14.0, still depends on `^10.2.6`.
- A pnpm `overrides` key is forbidden by the `scripts/check-pins.mjs` allowlist.
- Exposure is limited to dev and CI tooling, and the glob patterns come from committed config.

Track it: bump eslint and eslint-plugin-jsx-a11y-x once releases that depend on minimatch ≥ 11.0.1 are at least 14 days old. Do not add overrides without a reviewed change to `check-pins.mjs`.
**Original issue:** The pre-existing moderate advisory gained one more dependency path, through eslint-plugin-jsx-a11y-x.

## Verification

All gates ran in the **main checkout** on branch `chore/UL-5-eslint-presets` (`workflow.use_worktrees: false`, so no worktree was created). The numbers can be reproduced from this tree.

- Per fix: re-read, then `pnpm exec prettier --check`, `tsc --noEmit -p packages/config/tsconfig.json`, `eslint . --max-warnings=0` in packages/config, and the preset tests. Every commit went through the husky pre-commit hook (lint-staged); none used `--no-verify`.
- `pnpm install --frozen-lockfile`: exit 0, "Lockfile passes supply-chain policies". The lockfile, catalog and `pnpm-workspace.yaml` are unchanged.
- `pnpm check:all`: exit 0. Format OK, `check-pins` reports 17 catalog entries OK, `lint:root` is clean, turbo ran 15/15 tasks successfully, `@app/config` tests passed 5/5, `check-product-name` reports 98 tracked files clean, and root tests passed 51/51.
- ci.yml is unchanged. The required job names lint/typecheck/test/build/name-guard are unchanged. `.planning/phases/01-*` is untouched.

## Notes for the reviewer

- **Diff size:** the fixes add +383/−63 lines, excluding the lockfile and `.planning`. The branch now totals 51 files, +965/−45 against origin/main, well above the 600-line warning. IN-06's suggestion to split the PR (base+lint gate / nest() / next()+docs) is now more pressing.
- **Policy choices to confirm:**
  1. Adapters may not use `import * as` or `import()` of local modules.
  2. A local value import named `*Repository` in an adapter is rejected.
  3. Production `src/` may not import `test/` helpers.
  4. next() applies the a11y rules to `.js` files, since Next allows JSX in `.js`.
- **Out of scope:** the Info findings IN-01..06 were not addressed.

---

_Fixed: 2026-11-12T02:49:03Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
