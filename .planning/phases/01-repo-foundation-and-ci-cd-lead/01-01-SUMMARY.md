---
phase: 01-repo-foundation-and-ci-cd-lead
plan: 01
subsystem: infra
tags: [pnpm, turborepo, typescript, eslint, monorepo, supply-chain]

requires: []
provides:
  - pnpm 12.15.0 workspace root (apps/*, packages/*) with a strict catalog of 14 exact pins
  - Supply-chain gates enforced by pnpm itself (minimumReleaseAge 20160, engineStrict, frozen catalog)
  - Turbo task graph (transit, build, typecheck, lint, test) and root turbo-backed scripts
  - "@app/config: shared TS 6 tsconfig/base.json and ESLint 10 flat-config factory base({ tsconfigRootDir })"
  - .nvmrc Node 26.13.0 pin
affects: [01-02, 01-03, 01-04, 01-05, 01-06, 01-07, 01-08, 01-09, ci, tooling]

actuals:
  tokens: 10800
  tasks: 2
  commits: 2
plan_head_before: 0ad44870bfcfa18d2e8f0b6282928c14fba53cb1
plan_head_after: a2927220e8de1a7b26bf0f2d1dcb10ea42635fd2

tech-stack:
  added: [pnpm 12.15.0, turbo 2.11.10, typescript 6.0.3, eslint 10.13.0, typescript-eslint 8.72.0, "@eslint/js 10.0.1", eslint-config-prettier 10.1.8, globals 17.13.0, "@types/node 26.6.5"]
  patterns:
    - "Catalog as single source of pins: every manifest dependency is \"catalog:\""
    - "2-line per-package eslint.config.js consuming base({ tsconfigRootDir: import.meta.dirname })"
    - "Turbo transit nodes: lint/typecheck/test depend on transit, build on ^build"

key-files:
  created:
    - package.json
    - pnpm-workspace.yaml
    - pnpm-lock.yaml
    - turbo.json
    - .gitignore
    - .nvmrc
    - packages/config/package.json
    - packages/config/tsconfig/base.json
    - packages/config/tsconfig.json
    - packages/config/eslint/index.js
    - packages/config/eslint.config.js
  modified: []

key-decisions:
  - "Root manifest is named @app/root (neutral, per D-05/D-33); the product name will live only in packages/config/product.ts (plan 01-03)"
  - "The minimumReleaseAgeExclude escape hint is commented out above catalog:, and the catalog block has no comments, so the 01-02 pin guard can parse it line by line"

patterns-established:
  - "Consumer ESLint config: import { base } and export default base({ tsconfigRootDir: import.meta.dirname })"
  - "Shared tsconfig base keeps erasableSyntaxOnly out (NestJS parameter properties); packages add types: [\"node\"] explicitly"

requirements-completed: [TZ-PROCESS-06, TZ-FE-16, TZ-BE-15, TZ-FE-02, TZ-BE-02, TZ-FE-10, TZ-BE-10]

coverage:
  - id: D1
    description: "Frozen install with pnpm 12.15.0 succeeds against the committed lockfile"
    requirement: TZ-FE-16
    verification:
      - kind: other
        ref: "pnpm install --frozen-lockfile"
        status: pass
    human_judgment: false
  - id: D2
    description: "Turbo runs lint + typecheck on @app/config with the shared TS 6 base and ESLint 10 factory"
    requirement: TZ-PROCESS-06
    verification:
      - kind: other
        ref: "pnpm turbo run lint typecheck -> Tasks: 2 successful, 2 total"
        status: pass
    human_judgment: false
  - id: D3
    description: "TypeScript 6.0.3 pinned; shared tsconfig/base.json typechecks @app/config (checkJs)"
    requirement: TZ-FE-02
    verification:
      - kind: other
        ref: "pnpm turbo run typecheck -> Tasks: 1 successful, 1 total"
        status: pass
    human_judgment: false
  - id: D4
    description: "ESLint has teeth: an unused const fails lint"
    requirement: TZ-FE-10
    verification:
      - kind: other
        ref: "probe-bad.js -> @typescript-eslint/no-unused-vars, exit 1 (probe deleted)"
        status: pass
    human_judgment: false
  - id: D5
    description: "Age, engine and catalog-drift gates fail closed"
    requirement: TZ-BE-15
    verification:
      - kind: other
        ref: "throwaway-copy probes (a)(b)(c) below"
        status: pass
    human_judgment: false

duration: 5min
completed: 2026-11-08
status: complete
---

# Phase 1 Plan 01: Workspace Root and @app/config Summary

**pnpm 12.15.0 + Turborepo 2.11.10 workspace root with a strict 14-pin catalog, 14-day release-age and engine gates, and @app/config (TS 6 nodenext base + ESLint 10 flat-config factory) linting and typechecking itself through Turbo.**

## Performance

- **Duration:** about 5 min (104 s from first write to last commit)
- **Completed:** 2026-11-08T16:47:03Z
- **Tasks:** 2/2
- **Files created:** 11

## Accomplishments

- Root `package.json` (`@app/root`, `packageManager: pnpm@12.15.0`, `engines` node `>=26.13.0 <27` / pnpm `12.15.0`, scripts `turbo run build|lint|typecheck|test`).
- `pnpm-workspace.yaml` with `minimumReleaseAge: 20160`, `engineStrict: true`, `savePrefix: ''`, `catalogMode: strict`, `updateNotifier: false`, and a 14-entry exact catalog as the last key.
- `pnpm-lock.yaml` committed with the pnpm 12 boot document (`packageManagerDependencies: pnpm 12.15.0`).
- `turbo.json` with transit nodes. `.gitignore` covers node_modules, .turbo, dist, coverage, `.env*` (but not `.env.example`), tsbuildinfo, .DS_Store and `.planning/research/.cache/`.
- `@app/config` (private, `exports` for `./eslint` and `./tsconfig/base.json`), with `lint` and `typecheck` scripts both green.
- `.nvmrc` = `26.13.0`.

## Task Commits

1. **Task 1 (tracer): pinned workspace boots and Turbo typechecks @app/config.** `c62280a`. Tracer gate (auto mode): the verify was re-run end to end and passed with `Tasks: 1 successful, 1 total`.
2. **Task 2: shared ESLint lints @app/config, Node pin, policy probes.** `a292722`.

## Fail-closed probes (throwaway copy, deleted afterwards)

(a) Young pin: catalog `eslint: 10.14.0`, then `pnpm install --lockfile-only` exits 1:
```
Error: ERR_PNPM_NO_MATURE_MATCHING_VERSION
  ╰─▶ 1 version does not meet the minimumReleaseAge constraint:
      minimumReleaseAge cutoff (2026-10-25T16:46:32.325Z)
```

(b) Engine: root `engines.node: ">=27"`, then `pnpm install --frozen-lockfile` exits 1:
```
Error: ERR_PNPM_UNSUPPORTED_ENGINE
  × Unsupported engine for <copy>: wanted: {"node":">=27"} (current: {"node":"26.13.0"})
```

(c) Catalog drift: catalog `typescript: 6.0.2` with the lockfile left as is, then `pnpm install --frozen-lockfile` exits 1:
```
Error: ERR_PNPM_LOCKFILE_CONFIG_MISMATCH
  ╰─▶ Cannot proceed with the frozen installation. The current "catalogs"
      configuration doesn't match the value found in the lockfile
```

ESLint probe: `packages/config/probe-bad.js` (`const unused = 1;`) caused `pnpm --filter @app/config lint` to exit 1 with `1:7 error 'unused' is assigned a value but never used @typescript-eslint/no-unused-vars`. The probe file was deleted and never committed.

## Decisions Made

- Root manifest name is `@app/root`, which keeps it product-neutral per D-05/D-33.
- No catalog pin needed a fallback. All 14 pins installed under the 14-day rule (cutoff 2026-10-25).

## Deviations from Plan

**1. [Rule 3 - Environment] Throwaway copy location**
- The probe copy was made with `mktemp -d` inside the session scratchpad instead of the system temp dir, following the environment's temp-file rule. The rsync also excluded `.git` and `.planning`, which pnpm does not need. Probe semantics are unchanged.

**2. Acceptance note: `git status --porcelain` after commit**
- Only pre-existing, orchestrator-owned entries remain (`.planning/STATE.md`, `.planning/config.json`, `.planning/state.json`). They were present at the start of execution and were not touched by this plan. No probe files or stray copies remain.

Otherwise the plan was executed exactly as written.

## Issues Encountered

- `npm i -g pnpm@12.15.0` warned that pnpm's install scripts were skipped (npm allow-scripts). RESEARCH already notes this is harmless: the native binary works, and `pnpm --version` printed 12.15.0.

## Threat Surface

T-01-01 (age gate + exact pins + lockfile), T-01-03 (`private: true` on `@app/config`) and T-01-04 (engines + engineStrict + .nvmrc) are mitigated and proven by the probes above. T-01-02: the install ran with pnpm 12 defaults and no build-script approvals were needed. No new surface beyond the threat model.

## Next Phase Readiness

Plan 01-02 can add prettier/husky/lint-staged/eslint at the root, using the catalog pins already present. Every later package copies the 2-line `eslint.config.js` and extends `@app/config/tsconfig/base.json`.

## Self-Check: PASSED

- All 11 key files exist on disk.
- Commits `c62280a` and `a292722` are ancestors of HEAD.
- `git rev-list --count 0ad4487..HEAD` = 2.
