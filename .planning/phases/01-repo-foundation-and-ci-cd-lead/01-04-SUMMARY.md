---
phase: 01-repo-foundation-and-ci-cd-lead
plan: 04
subsystem: contracts
tags: [contracts, zod, vitest, typescript, compiled-package, tdd]

requires:
  - phase: 01-01
    provides: pnpm workspace + catalog pins (zod 4.6.7, vitest 5.0.5, vite 8.3.5), @app/config tsconfig base and ESLint base(), Turbo transit-node pipeline
  - phase: 01-02
    provides: husky + lint-staged pre-commit gate (prettier + typed eslint on staged files)
provides:
  - "@app/contracts: compiled package (exports types -> ./src/index.ts, default -> ./dist/index.js)"
  - "TicketKey branded zod schema + TicketKey type + TICKET_KEY_PATTERN, exported from the package entry (D-03)"
  - "Vitest 5 config (node env) and a 13-case test suite including a compile-time brand guard"
  - "The first package where all four pipeline tasks (lint, typecheck, test, build) do real work"
affects: [01-05, 01-06, 01-07, 01-08, 01-09, phase-1.1]

actuals:
  tokens: 8600
  tasks: 2
  commits: 3
plan_head_before: 97511c222206bf3a178b68336b496b2f3db1b19e
plan_head_after: ca7f6d6d64a5fb55ff9150b617996b28cf1d04aa

tech-stack:
  added: [zod 4.6.7, vitest 5.0.5, vite 8.3.5 (explicit vitest peer)]
  patterns:
    - "Compiled workspace package: types from src (consumers typecheck without building), runtime from dist"
    - "nodenext source imports carry the .js extension (./ticket-key.js)"
    - "tsconfig.json covers src + root *.ts (typed lint of vitest.config.ts); tsconfig.build.json sets rootDir ./src, outDir ./dist and excludes tests"
    - "Branded types guarded at compile time with a described @ts-expect-error inside a test (TS2578 if the brand disappears)"

key-files:
  created:
    - packages/contracts/package.json
    - packages/contracts/tsconfig.json
    - packages/contracts/tsconfig.build.json
    - packages/contracts/eslint.config.js
    - packages/contracts/vitest.config.ts
    - packages/contracts/src/index.ts
    - packages/contracts/src/ticket-key.ts
    - packages/contracts/src/ticket-key.test.ts
  modified:
    - pnpm-lock.yaml

key-decisions:
  - "TicketKey grammar is /^UL-[1-9]\\d*$/: literal UL-, positive integer, no leading zero, fully anchored (assumption A11, reversible in one file)"
  - "RED was landed on a permissive stub schema so the target test fails on its assertion, not on a missing module (tdd.md INVALID_RED rule; also the only RED the typed-lint pre-commit hook accepts)"

patterns-established:
  - "New packages copy the contracts shape: private, type module, exports map, build/typecheck/lint/test scripts, catalog: deps, @app/config workspace:*"
  - "Tests import the public entry (./index.js), not internals"

requirements-completed: [TZ-FE-02, TZ-BE-02, TZ-PROCESS-06]

coverage:
  - id: D1
    description: "@app/contracts exports a real TicketKey zod schema that accepts UL-12-style keys and rejects malformed ones, proven by Vitest"
    requirement: TZ-PROCESS-06
    verification:
      - kind: test
        ref: "pnpm --filter @app/contracts test -> Tests 13 passed (13)"
        status: pass
    human_judgment: false
  - id: D2
    description: "The package builds to dist/ and the built module validates ticket keys at runtime in plain Node"
    requirement: TZ-BE-02
    verification:
      - kind: other
        ref: "pnpm turbo run lint typecheck test build --filter=@app/contracts -> Tasks: 4 successful, 4 total; node import of packages/contracts/dist/index.js: UL-7 accepted, ul-7 rejected; dist/index.js + dist/index.d.ts exist, no dist/src"
        status: pass
    human_judgment: false
  - id: D3
    description: "A plain string is not assignable to TicketKey at compile time; typecheck is the guard"
    requirement: TZ-FE-02
    verification:
      - kind: other
        ref: "probe: removing .brand<'TicketKey'>() -> tsc error TS2578 Unused '@ts-expect-error' directive at ticket-key.test.ts(20,5); restored"
        status: pass
    human_judgment: false
  - id: D4
    description: "Typed ESLint rules fire on contracts source"
    requirement: TZ-FE-02
    verification:
      - kind: other
        ref: "probe src/probe-any.ts `export const probe: any = 1;` -> pnpm --filter @app/contracts lint exit 1, 2:21 error Unexpected any @typescript-eslint/no-explicit-any; probe deleted"
        status: pass
    human_judgment: false

duration: 3min
completed: 2026-11-08
status: complete
---

# Phase 1 Plan 04: @app/contracts Compiled Package with TicketKey Schema Summary

**`@app/contracts` is a compiled workspace package. Its types come from `src`, its runtime from `dist`. It ships a branded zod `TicketKey` schema for tracker keys like `UL-12`, anchored to `/^UL-[1-9]\d*$/`. Thirteen Vitest cases cover it, including a compile-time brand guard. It is the first package where lint, typecheck, test and build all do real work (`Tasks: 4 successful, 4 total`).**

## Performance

- **Duration:** about 3 min (2026-11-08T16:59:22Z to 17:02Z)
- **Completed:** 2026-11-08
- **Tasks:** 2/2
- **Files:** 8 created, 1 modified (pnpm-lock.yaml)

## Accomplishments

- `packages/contracts/package.json` follows RESEARCH Pattern 10:
  - `private: true`, `type: module`;
  - `exports["."]` maps `types` to `./src/index.ts` and `default` to `./dist/index.js`;
  - scripts: `build` (`tsc -p tsconfig.build.json`), `typecheck` (`tsc --noEmit`), `lint` (`eslint .`), `test` (`vitest run`);
  - `zod` comes from `catalog:`, and the dev dependencies are `@app/config` `workspace:*` plus `@types/node`, eslint, typescript, vite and vitest, all from `catalog:`. Listing `vite` explicitly keeps the vitest peer on the 8.3.5 pin (Pitfall 4).
- The install brought in 32 packages, and the 14-day `minimumReleaseAge` policy accepted the lockfile. `pnpm check:pins` reports 3 manifests OK.
- `tsconfig.json` extends the shared base and adds `noEmit`, `types: ["node"]` and `erasableSyntaxOnly`. It includes `src` and `*.ts`, so typed lint also covers `vitest.config.ts`.
- `tsconfig.build.json` sets `rootDir ./src` and `outDir ./dist`, with declarations, declaration maps and source maps. It excludes tests. `dist/` contains `index.js`, `index.d.ts` and `ticket-key.*` with no `dist/src`, so Pitfall 3 is avoided. `dist/` is gitignored and not tracked.
- `eslint.config.js` is the 2-line `base({ tsconfigRootDir: import.meta.dirname })` consumer (D-04).
- `vitest.config.ts` uses `defineConfig` from `vitest/config`, includes `src/**/*.test.ts` and runs in the `node` environment.
- `src/ticket-key.ts` exports three things:
  - `TICKET_KEY_PATTERN = /^UL-[1-9]\d*$/`;
  - `TicketKey`, which is `z.string().regex(…, { error: 'Expected a ticket key like UL-12' }).brand<'TicketKey'>()`;
  - the inferred `TicketKey` type under the same name.

  `src/index.ts` re-exports both names from `./ticket-key.js`.
- `src/ticket-key.test.ts` has 13 cases, all importing from `./index.js`:
  - 3 accepted keys: `UL-1`, `UL-42`, `UL-1000`;
  - 8 rejected values: `UL-0`, `ul-1`, `UL-`, `UL-01`, `PR-1`, `' UL-1'`, `UL-1a`, `''`;
  - 1 test that checks the issue message text;
  - 1 brand test. A plain string literal assigned to a `TicketKey` const sits under `// @ts-expect-error -- a plain string literal must not be assignable to the branded TicketKey`, and `TicketKey.parse('UL-1')` is accepted as `TicketKey`.
- The full repo pipeline `pnpm turbo run lint typecheck test build` reports `Tasks: 6 successful, 6 total`. `pnpm format:check` and `pnpm check:name` (28 tracked files clean) are green.

## Task Commits

1. **Task 1 (tracer), RED:** `40d065a` `test(01-04): failing TicketKey cases on a permissive contracts stub`. This adds the package scaffold, the configs, two behaviour tests and a stub schema that accepts any string.
2. **Task 1 (tracer), GREEN:** `f1c87ad` `feat(01-04): TicketKey zod schema with anchored UL-<n> pattern`.
   - **Tracer gate:** auto mode was active (`workflow.auto_advance: true`). After the commit I re-ran the full verify end to end and it passed: frozen install, `Tasks: 4 successful, 4 total`, and the dist runtime smoke (UL-7 accepted, ul-7 rejected). Only then did Task 2 start.
3. **Task 2:** `ca7f6d6` `test(01-04): full TicketKey matrix and compile-time brand check`.

All three commits went through the live husky/lint-staged hook (prettier + typed eslint) without `--no-verify`.

## TDD Gate Compliance

| Plan | RED | GREEN | REFACTOR | Status |
|------|-----|-------|----------|--------|
| 01-04 Task 1 | `40d065a` test(01-04) | `f1c87ad` feat(01-04), descends from RED | not needed | pass |
| 01-04 Task 2 | n/a: the behaviour was already implemented in Task 1, so the expanded matrix passed on first run | n/a | n/a | test-only task, guards proven by probes |

**RED evidence (Task 1):** the command was `pnpm exec vitest run --reporter=tap` with exit 1 and target test `rejects a lowercase prefix` in `packages/contracts/src/ticket-key.test.ts`. The expected result was `safeParse('ul-1').success === false`. The stub returned `true`, and the AssertionError read `expected true to be false`.
- Classifier: `gsd-tools check tdd-red-evidence` returned `RED_EVIDENCE_OK`, reason `target_test_failed`, with 2 tests, 1 pass and 1 fail.
- Semantic assessment: the named target test ran and failed on the planned assertion for the intended reason (the stub accepts lowercase). The other case (`accepts UL-1`) passed. There was no import, collection or fixture fault. The evidence record lived in the gitignored `.turbo/` and was deleted after use.

## Probes (all cleaned up, nothing committed)

- **Typed lint has teeth:** I added a temporary `packages/contracts/src/probe-any.ts` containing `export const probe: any = 1;`. `pnpm --filter @app/contracts lint` exited **1** with `2:21  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any`. The probe was deleted.
- **The brand guard has teeth:** with `.brand<'TicketKey'>()` temporarily removed from `ticket-key.ts`, `tsc --noEmit` failed with `src/ticket-key.test.ts(20,5): error TS2578: Unused '@ts-expect-error' directive.` I restored the file with `git checkout -- packages/contracts/src/ticket-key.ts`, and the diff was empty.

## Decisions Made

- **A11 (ticket key grammar):** `UL-` followed by a positive integer with no leading zero, anchored at both ends: `/^UL-[1-9]\d*$/`. This rejects `UL-0`, `UL-01`, lowercase prefixes, whitespace and suffix smuggling. If the tracker allows other forms, only `ticket-key.ts` and its test matrix change.
- The same name `TicketKey` is used for both the value and the type. `index.ts` re-exports the value binding, and TypeScript carries the type meaning with it, so consumers write `import { TicketKey } from '@app/contracts'` for both uses.

## Deviations from Plan

**1. [Rule 3 - Blocking / TDD contract] RED landed on a permissive stub instead of a missing module**
- **Found during:** Task 1 (RED)
- **Issue:** The plan's RED fails because `ticket-key.ts` does not exist. That has two problems. First, tdd.md classifies an import or load failure as INVALID_RED, which cannot authorize GREEN. Second, the pre-commit hook runs typed ESLint, which rejected the test with 6 `no-unsafe-call` / `no-unsafe-member-access` errors on the unresolved import, so the RED commit could not pass the hook without `--no-verify`, and `--no-verify` is forbidden.
- **Fix:** The RED commit includes a stub `ticket-key.ts` (`TICKET_KEY_PATTERN = /^/`, same exports and same brand). The `ul-1` test fails on its assertion, the hook passes, and the classifier returns `RED_EVIDENCE_OK`. GREEN replaces the stub with the real schema.
- **Files modified:** packages/contracts/src/ticket-key.ts
- **Commits:** 40d065a (stub), f1c87ad (real schema)

Otherwise the plan was executed exactly as written. No pin changes were needed, because every catalog version passed `minimumReleaseAge`.

## Issues Encountered

None.

## Threat Surface

- **T-01-09 (TicketKey tampering):** mitigated. The regex is anchored at both ends with no leading zeros and no whitespace. The invalid matrix covers prefix and suffix smuggling (`' UL-1'`, `'UL-1a'`).
- **T-01-10 (ReDoS):** accepted. The pattern is linear, with a single `\d*` and no nested quantifiers.
- **T-01-SC (npm installs):** mitigated. zod, vitest, vite and @types/node come from the audited catalog pins, `vite` is pinned explicitly, and the lockfile passed the supply-chain policy check.

No new surface beyond the threat model.

## Next Phase Readiness

`@app/contracts` is ready to consume. Apps add `"@app/contracts": "workspace:*"`. Types resolve from `src` through Turbo transit nodes, and runtime imports resolve `dist`, so the consumer's `build` must run after `^build`, which `turbo.json` already declares. The CI plans (01-07/01-08) now have a real `test` and `build` task to run. Phase 1.1 extends the same package shape for `HealthResponse` and the other API DTOs.

## Self-Check: PASSED

- All 8 created files exist under `packages/contracts/`.
- Commits `40d065a`, `f1c87ad` and `ca7f6d6` are ancestors of HEAD.
- `git rev-list --count 97511c2..HEAD` = 3.
- `packages/contracts/src/probe-any.ts` is absent, and the working tree was clean before the docs commit.
