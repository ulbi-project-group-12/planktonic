---
phase: quick-261111-esl
verified: 2026-11-11T21:30:00Z
status: passed
score: 10/10 must-haves verified
covered_files:
  - .planning/quick/261111-esl-eslint-presets/261111-esl-PLAN.md
  - .planning/quick/261111-esl-eslint-presets/261111-esl-SUMMARY.md
  - apps/api/eslint.config.js
  - package.json
  - packages/config/README.md
  - packages/config/eslint.config.js
  - packages/config/eslint/base.js
  - packages/config/eslint/index.js
  - packages/config/eslint/nest.js
  - packages/config/eslint/next.js
  - packages/config/package.json
  - packages/config/test/eslint-presets.test.js
  - packages/config/test/fixtures/nest/prisma/seed.ts
  - packages/config/test/fixtures/nest/scripts/backfill.ts
  - packages/config/test/fixtures/nest/src/messages/messages.controller.ts
  - packages/config/test/fixtures/nest/src/messages/messages.repository.ts
  - packages/config/test/fixtures/nest/tsconfig.json
  - packages/config/tsconfig.json
  - packages/config/turbo.json
  - pnpm-lock.yaml
  - pnpm-workspace.yaml
covered_digest: "v4:sha256:94e1789496a0e931162f8c66730f019bbd528528c7fd20db94b0b262a51751f4"
behavior_unverified: 0
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 9/10
  gaps_closed:
    - "Removing a preset rule makes the preset tests fail (mutation check), in particular the STACK §3.1 rule that adapters must not import a repository. M1 is now killed (a38b254), and so is the M12 warning (03134a5)."
  gaps_remaining: []
  regressions: []
---

# Quick Task 261111-esl: ESLint presets (UL-5) Verification Report

**Goal:** Finish the shared ESLint setup in packages/config: `next()` and `nest()` next to a
hardened `base()`, all exported from `@app/config/eslint` as `fn({ tsconfigRootDir })`. Lint
fails on warnings and on unused disable directives. nest() enforces the STACK §3.1 layering,
and next() does not overlap Steiger. Fixture tests run in CI and in check:all. Docs are written
for UL-6 and UL-7.
**Verified:** 2026-11-11
**Status:** passed
**Re-verification:** Yes. This pass follows the gap closure in a38b254, 03134a5, a4b1386 and e6b0b5c.
**Method:** a fresh clone of `chore/UL-5-eslint-presets` @ e6b0b5c at
/private/tmp/claude-501/gsd-reverify-clone, removed afterwards. All probes and mutations ran
there. SUMMARY claims were not used as evidence.

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `import { base, next, nest } from '@app/config/eslint'` resolves. Each preset is `fn({ tsconfigRootDir })`. | ✓ VERIFIED | Regression check: the export map and index.js did not change. The tests import the package by name and pass. |
| 2 | nest() layering: adapters are blocked from Prisma, PrismaService, core/prisma and repositories. Other code is blocked from Prisma and raw SQL. Owners and tests are exempt. Services may import repositories. | ✓ VERIFIED | Regression check plus the new scope. The real apps/api config flagged `scripts/backfill.ts` (TS, with scripts/ added to the tsconfig) on every line that touches `@prisma/client`, `generated/prisma`, `prisma.service`, `$queryRawUnsafe` or `$executeRaw`. It flagged `scripts/bad.mjs` (no tsconfig needed) for `@prisma/client`. `scripts/ok.ts`, which imports a repository, passed, and so did `prisma/seed.ts` and `src/**/*.repository.ts`. |
| 3 | next(): the required rules are errors, a clean App Router page passes, and no boundary rule is active. | ✓ VERIFIED | next.js did not change. Test 3 passes, and it now also asserts `settings.next.rootDir`. |
| 4 | Lint fails on warnings everywhere. | ✓ VERIFIED | Regression check: the lint scripts and lint-staged did not change. M5 is killed. |
| 5 | An unused disable directive is an error. Test files are relaxed, but `.only` is rejected. | ✓ VERIFIED | base.js did not change. M2, M4 and M7 are killed. |
| 6 | The preset tests run as `@app/config#test` in `turbo run test`, in CI and in check:all. | ✓ VERIFIED | Fresh clone: `pnpm check:all` exited 0 with `Tasks: 15 successful, 15 total` and `Cached: 0`. `@app/config:test` reported ok 1–5 and the root tests passed 51/51. ci.yml did not change. |
| 7 | 3 exact catalog pins, each released at least 14 days ago, deps of packages/config only, and a frozen install that passes. | ✓ VERIFIED | `git diff c15f40d HEAD` shows no change to pnpm-lock.yaml or pnpm-workspace.yaml. `pnpm install --frozen-lockfile` exited 0, and check:pins passed inside check:all. |
| 8 | The README tells UL-6 and UL-7 how to use the presets, which file names and Prisma paths nest() relies on, and what next() leaves to Steiger. | ✓ VERIFIED | The README now describes the package-wide scope (scripts/ included) and the `prisma/**` and `prisma.config.ts` exemptions. Line 32 says every linted TS file must be in the tsconfig. My probes match these claims. |
| 9 | The pre-commit hook blocks a staged lint error. | ✓ VERIFIED | In the clone (`core.hooksPath=.husky/_`), committing a staged `x!.length` exited 1 (`no-non-null-assertion`, "husky - pre-commit script failed"). Committing a staged `apps/api/scripts/bad.mjs` that imports `@prisma/client` also exited 1 (`no-restricted-imports` and `no-restricted-syntax`). HEAD did not change. |
| 10 | Removing a preset rule makes the preset tests fail (mutation check). | ✓ VERIFIED | All 16 original mutations are killed, M1 and M12 included. New M17 and M18, aimed at the gap-closure code, are killed too. M19 and M20 survive: they each drop one secondary branch of a rule that is still active, so they are warnings (see below). |

**Score:** 10/10 truths verified (0 present, behavior-unverified)

### Mutation Results (re-run)

Each mutation is an exact string replacement in the clone, followed by
`node --test test/eslint-presets.test.js`, and then the file is restored.

| # | Mutation | Tests |
|---|----------|-------|
| M1 | nest: drop REPOSITORY from the adapter no-restricted-imports patterns | killed (was: survived) |
| M2 | base: `reportUnusedDisableDirectives: 'off'` | killed |
| M3 | next: delete `jsx-a11y-x/alt-text` | killed |
| M4 | base: `.only` ban property renamed | killed |
| M5 | base: errorsOnly no longer raises warn | killed |
| M6 | nest: drop RAW_SQL selectors (both blocks) | killed |
| M7 | base: test files no longer allow non-null assertions | killed |
| M8 | next: drop `core-web-vitals` | killed |
| M9 | nest: services may import the Prisma client | killed |
| M10 | nest: repositories no longer exempt | killed |
| M11 | next: `checksVoidReturn.attributes: true` | killed |
| M12 | next: drop `settings.next.rootDir` | killed (was: survived) |
| M13 | nest: drop the `generated/prisma` global ignore | killed |
| M14 | nest: drop hiddenImports for services | killed |
| M15 | nest: services may import the prisma.service path | killed |
| M16 | nest: PRISMA_CLIENT narrowed to `^@prisma/` | killed |
| M17 | nest: PACKAGE_CODE back to `src/**` (scripts/ uncovered) | killed (new) |
| M18 | nest: drop PRISMA_TOOLING from the owner-block ignores | killed (new) |
| M19 | nest: drop REPOSITORY from the adapter hiddenImports | ⚠️ survived (new) |
| M20 | nest: test-import-only block narrowed to `src/**/*.ts` | ⚠️ survived (new) |

What the survivors let through: I ran the real preset and each mutant on the same files in the clone.
- M19: `export type Repo = import('./zz.repository.js').Row;` in a controller. The real preset
  reports `no-restricted-syntax`, the mutant reports nothing. No fixture has an adapter using an
  `import('…repository')` type. The README promises that this kind of import is banned. It is a
  type-only hole with no runtime coupling, and `import type { … } from './x.repository.js'` is
  still caught by the path ban that M1 now guards.
- M20: `prisma/seed2.mjs` importing `../test/factories.js`. The real preset reports
  `no-restricted-imports`, the mutant reports nothing. No fixture has a `prisma/**` file that
  imports a test helper. In `scripts/` that import is still caught, because the owner block
  carries TEST_IMPORT.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `packages/config/eslint/nest.js` | nest() with the layering rule | ✓ VERIFIED | `PACKAGE_CODE = **/*`, `PRISMA_TOOLING` exempt. Used by apps/api. |
| `packages/config/test/eslint-presets.test.js` | Node API tests | ✓ VERIFIED | Asserts controller line 3 (`listRows` from a repository) gets only `no-restricted-imports`, `settings.next.rootDir === cwd`, the scripts/backfill.ts hits, and that prisma/seed.ts is clean. |
| `packages/config/test/fixtures/nest/{scripts,prisma}/` | fixtures outside src/ | ✓ VERIFIED | Both are in the fixture tsconfig `include`, so typed lint runs on them. |
| `packages/config/README.md` | docs | ✓ VERIFIED | Matches the new scope. |
| base.js, next.js, index.js, apps/api/eslint.config.js | unchanged | ✓ VERIFIED | Regression check only. |

### Key Link Verification

| From | To | Via | Status |
|------|----|-----|--------|
| apps/api/eslint.config.js | nest.js | `nest({ tsconfigRootDir })`. Package lint (`eslint .`) and root lint-staged both apply it to `apps/api/scripts/` | ✓ WIRED |
| packages/config `scripts.test` | check:all and the CI test job | `turbo run test` → `@app/config#test` | ✓ WIRED |
| next.js `settings.next.rootDir` | the next() test | `calculateConfigForFile` assertion | ✓ WIRED (now tested) |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Frozen install | `pnpm install --frozen-lockfile` | exit 0 | ✓ PASS |
| Full gate | `pnpm check:all` | exit 0, 15/15 tasks, 0 cached, preset tests ok 1–5, root tests 51/51 | ✓ PASS |
| scripts/ under layering | `eslint` in apps/api on probe scripts/, prisma/ and repository files | violations flagged, clean files silent | ✓ PASS |
| Hook blocks a lint error | `git commit` with a staged non-null assertion, and with a staged scripts/ Prisma import | both exit 1, HEAD unchanged | ✓ PASS |
| Mutations | 20 mutations + `node --test` | 18 killed, 2 survived (secondary branches) | ✓ PASS (warnings) |

### Probe Execution

Step 7c: no `scripts/*/tests/probe-*.sh` probe is declared. The ad-hoc probes are listed above.

### Requirements Coverage

| Requirement | Description | Status | Evidence |
|-------------|-------------|--------|----------|
| QUICK-261111-esl | Finish ESLint presets (UL-5) | ✓ SATISFIED | Truths 1–10 |
| TZ-FE-10 | Frontend lint preset | ✓ SATISFIED | Truth 3 |
| TZ-BE-10 | Backend lint and layering | ✓ SATISFIED | Truths 2 and 10 |

### Scope and Hygiene

| Check | Result |
|-------|--------|
| Gap-closure commits | 4 commits. Every subject has `[UL-5]` and the required Co-Authored-By trailer. |
| Files touched | packages/config (presets, test, fixtures, README) and SUMMARY only. Lockfile, workspace, ci.yml and `.planning/phases/` are untouched. |
| Debt markers in added lines | none |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| packages/config/test/eslint-presets.test.js | nest test | No adapter fixture uses an `import('…repository')` type (M19 survives) | ⚠️ Warning | A regression in that one type-position branch would go unnoticed. Value and `import type` repository imports stay guarded. |
| packages/config/test/eslint-presets.test.js | nest test | No `prisma/**` fixture imports a test helper (M20 survives) | ⚠️ Warning | The block widened in a4b1386 is guarded only where the owner block overlaps it. |
| apps/api/tsconfig.json | include | `["src"]` only, so a future `scripts/*.ts` fails with a project-service parsing error until it is added | ℹ️ Info | Fails closed. README line 32 documents this. A UL-7 concern, since apps/api has no scripts/ yet. |
| packages/config/eslint/nest.js | adapter block | `prisma.service` matches both PRISMA_SERVICE and CORE_PRISMA (duplicate message) | ℹ️ Info | Cosmetic. Carried from the previous pass. |

Optional hardening for the two warnings. For M19, add
`export type R = import('./messages.repository.js').MessagesRepository;` to an adapter fixture and
assert `no-restricted-syntax` on that line. For M20, add an `import` of `../test/…` to
`prisma/seed.ts` (or a second seed file) and assert `no-restricted-imports`.

### Human Verification Required

None.

### Gaps Summary

The previous gap is closed. The adapter → `*.repository` path ban (M1) now has its own fixture
line and assertion, and the mutant fails test 1. The M12 warning is closed as well. The
package-wide Prisma ban added in a4b1386 works in the real apps/api config and through the
pre-commit hook, and M17 and M18 show that its tests guard it. The full gate is green on a cold
clone, and pins, lockfile and CI did not change. Two new mutants (M19 and M20) survive. Each
drops one secondary branch of a rule that is still active, so both are warnings with the
hardening above, not blockers.

---

_Verified: 2026-11-11_
_Verifier: Claude (gsd-verifier)_
