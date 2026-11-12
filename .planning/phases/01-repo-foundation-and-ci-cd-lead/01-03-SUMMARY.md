---
phase: 01-repo-foundation-and-ci-cd-lead
plan: 03
subsystem: tooling
tags: [naming, rename-proofing, guard, node-test, supply-chain]

requires:
  - phase: 01-01
    provides: pnpm workspace, @app/config package with exports map and typed lint/typecheck
  - phase: 01-02
    provides: husky + lint-staged pre-commit gate, root ESLint config for scripts/, check-pins style to mirror
provides:
  - "packages/config/product.ts: single source of PRODUCT_DISPLAY_NAME, PRODUCT_SLUG, PRODUCT_IMAGE_PREFIX, exported as @app/config/product (D-33)"
  - "scripts/check-product-name.mjs: zero-dependency name guard over git-tracked files, exit 0 clean / 1 hits / 2 bad source (D-35)"
  - "scripts/check-product-name.test.mjs: node:test suite (10 cases) for the guard contract"
  - "Root scripts check:name and test:root"
affects: [01-04, 01-05, 01-06, 01-07, 01-08, 01-09, phase-1.1]

actuals:
  tokens: 3200
  tasks: 2
  commits: 2
plan_head_before: a3d4cb4fb61e0672bcd1ab59aedc26b1b62c795c
plan_head_after: 3e4a109a3f3f2c40606ecb233e3e4e086d2e076b

tech-stack:
  added: []
  patterns:
    - "Product name is read from @app/config/product (or PRODUCT_NAME / PRODUCT_SLUG env), never written as a literal"
    - "Guards fail closed: anything that prevents a trustworthy scan exits 2, never 0"
    - "Root-level node:test suites run with --test-reporter=tap for stable '# pass N' / '# fail N' lines"

key-files:
  created:
    - packages/config/product.ts
    - scripts/check-product-name.mjs
    - scripts/check-product-name.test.mjs
  modified:
    - packages/config/package.json
    - packages/config/tsconfig.json
    - package.json

key-decisions:
  - "The guard's 'N tracked files clean' counts the files actually scanned (tracked, present, not allowlisted), not every tracked path"
  - "Fail-closed exit 2 also covers a git ls-files failure and bad CLI arguments, not only a missing or invalid product.ts"
  - "Tracked paths that are absent from the working tree (or are gitlink directories) are skipped rather than crashing the scan"

patterns-established:
  - "Fixtures in tests use the neutral name 'Acme Chat' / 'acme-chat' so the test file itself passes the guard"
  - "New guards mirror check-pins.mjs: node: built-ins only, findings on stderr, a one-line OK summary on stdout"

requirements-completed: [TZ-PROCESS-06, TZ-BE-16]

coverage:
  - id: D1
    description: "The product name is defined once, in packages/config/product.ts, exported as @app/config/product"
    requirement: TZ-PROCESS-06
    verification:
      - kind: other
        ref: "jq .exports[\"./product\"] -> ./product.ts; node import of product.ts: PRODUCT_IMAGE_PREFIX ends with /PRODUCT_SLUG; turbo lint typecheck --filter=@app/config -> 2 successful"
        status: pass
    human_judgment: false
  - id: D2
    description: "pnpm check:name is green on the real tree and red (exit 1, path:line) on a planted literal in any case"
    requirement: TZ-BE-16
    verification:
      - kind: other
        ref: "pnpm check:name -> 'check-product-name: 19 tracked files clean'; throwaway copy with uppercase slug in probe.txt -> exit 1, 'probe.txt:1:'"
        status: pass
    human_judgment: false
  - id: D3
    description: "Exact allowlist, tracked-files-only scope and fail-closed exit 2 are covered by automated tests"
    requirement: TZ-BE-16
    verification:
      - kind: test
        ref: "pnpm test:root -> # pass 10, # fail 0"
        status: pass
    human_judgment: false

duration: 5min
completed: 2026-11-08
status: complete
---

# Phase 1 Plan 03: Product-Name Single Source and Name Guard Summary

**The product name now lives in one file, `packages/config/product.ts`, exported as `@app/config/product`. A zero-dependency guard (`pnpm check:name`) imports that file and rejects the name, in any letter case, in every other tracked file outside a fixed allowlist. A 10-case `node:test` suite (`pnpm test:root`) pins down how the guard behaves.**

## Performance

- **Duration:** about 5 min (2026-11-08T16:54:45Z to 16:59Z)
- **Completed:** 2026-11-08
- **Tasks:** 2/2
- **Files:** 3 created, 3 modified

## Accomplishments

- `packages/config/product.ts` exports `PRODUCT_DISPLAY_NAME`, `PRODUCT_SLUG` and `PRODUCT_IMAGE_PREFIX`. The prefix is the template literal `ghcr.io/ulbi-project-group-12/${PRODUCT_SLUG}`, so the slug appears only once. The header comment covers five points: this is the single source, the name is a working name, renaming follows the README "Renaming the project" section, release.yml derives image names from the repository (so the repo name must equal `PRODUCT_SLUG`), and the CI check `name-guard` rejects the name anywhere else. The file uses erasable syntax only, and Node 26 imports it directly.
- `@app/config` adds the export `./product` → `./product.ts`. Its tsconfig now includes `product.ts` and sets `erasableSyntaxOnly: true`, so typed lint and typecheck cover the file (`Tasks: 2 successful, 2 total`). The `@app/*` scope is unchanged.
- `scripts/check-product-name.mjs` uses `node:` built-ins only (checked by the acceptance grep).
  - It accepts `--root <dir>`; the default is the repo root resolved from the script's own location.
  - It loads `product.ts` with `import()` via `pathToFileURL`.
  - It exits 2 in these cases: the file is missing or fails to load, an export is missing or empty, the slug is not `[a-z0-9-]+`, a term is shorter than 3 characters, `git ls-files` fails, or the arguments are bad.
  - It scans `git ls-files -z` and skips files that contain a NUL byte.
  - Matching is per line, with each line lowercased.
  - Hits go to stderr as `<path>:<line>: product name literal, import it from @app/config/product or read PRODUCT_NAME`, followed by a count line, and the exit code is 1. The term itself is never printed.
  - Allowlist: exactly `packages/config/product.ts`, `README.md`, `.claude/CLAUDE.md` and `pnpm-lock.yaml`, plus the prefix `.planning/`.
- Root scripts: `check:name` = `node scripts/check-product-name.mjs`, and `test:root` = `node --test --test-reporter=tap scripts/check-product-name.test.mjs`.
- `scripts/check-product-name.test.mjs` uses `node:test` and `node:assert/strict` only. Each case builds a fixture git repo under `os.tmpdir()` with the neutral name 'Acme Chat' / 'acme-chat', and an `after` hook removes the fixtures. The 10 cases:
  - clean tree → 0;
  - lowercase slug in `src/a.ts` → 1, `src/a.ts:1:`;
  - uppercase display name on line 3 of `notes.txt` → 1, `notes.txt:3:`;
  - literal only in the allowlisted files (`README.md`, `.planning/x.md`, `.claude/CLAUDE.md`, `pnpm-lock.yaml`, `product.ts`) → 0;
  - `docs/README.md` → 1;
  - untracked file only → 0;
  - missing `product.ts` → 2;
  - invalid slug → 2;
  - missing export → 2;
  - NUL-byte binary file → 0.

## Task Commits

1. **Task 1 (tracer): single product-name source and the guard.** `4560669`. Tracer gate: the full automated verify was re-run end to end and passed. The real tree is clean, `@app/config` lint/typecheck passed with 2 successful, `lint:root` is green, and a planted `see <SLUG-UPPERCASE>` in a tracked `probe.txt` made the guard exit exactly 1 with `probe.txt:1:`.
2. **Task 2: node:test suite.** `3e4a109`.

## Probes (all cleaned up, nothing committed)

- **Earlier plans' files:** the first `pnpm check:name` on the real tree found no hits, so nothing from 01-01 or 01-02 needed rewording. `.env.example` carries the names `PRODUCT_NAME=` / `PRODUCT_SLUG=` only.
- **Fail closed on the real tree layout:** in a throwaway copy with `product.ts` deleted, `node scripts/check-product-name.mjs --root <copy>` exited **2** with `cannot load packages/config/product.ts`.
- **The tests catch regressions (RED evidence):** I ran mutation probes on a scratchpad copy of the guard and the test file:
  - with lowercasing removed, 2 tests failed;
  - with exit 2 changed to exit 0, 3 tests failed;
  - with the binary skip removed, 1 test failed.

  Against the real guard, all 10 pass. The scratchpad copies were deleted.

## Decisions Made

- The summary count is the number of scanned files (tracked, present, not allowlisted). The plan's wording "N tracked files clean" is kept.
- Fail-closed covers every case where the scan cannot be trusted. That includes `git ls-files` failing and unknown CLI arguments, not only a bad `product.ts`.
- A tracked path that cannot be read (deleted in the working tree, or a submodule gitlink directory) is skipped instead of crashing.

## Deviations from Plan

**1. [Rule 2 - Hardening] Wider fail-closed and unreadable-path handling**
- **Found during:** Task 1
- **Fix:** exit 2 on a `git ls-files` failure and on bad arguments. Unreadable tracked paths are skipped. Three extra tests (invalid slug, missing export, binary skip) were added beyond the seven behaviours the plan requires.
- **Files modified:** scripts/check-product-name.mjs, scripts/check-product-name.test.mjs
- **Commits:** 4560669, 3e4a109

**2. [Environment] Throwaway copy location**
- The Task 1 verify block uses `mktemp -d`. On this macOS run it created the copies in the system temp dir (`/var/folders/...`), not the session scratchpad, even though `TMPDIR` was exported. Both copies were removed in the same command, and none remain. The mutation probes did run in the scratchpad and were deleted.

Otherwise the plan was executed exactly as written.

## Issues Encountered

None.

## Threat Surface

- **T-01-14 (rename drift):** mitigated. The guard covers all tracked files, the test suite covers the allowlist and the fail-closed paths, and the required CI check `name-guard` is wired in 01-07 and 01-08.
- **T-01-15 (guard executes `product.ts` from a PR):** the guard does import that file as code. The mitigation from the plan belongs to 01-07: the `name-guard` job runs on `pull_request` with `contents: read`, no secrets and `persist-credentials: false`.
- **T-01-SC (npm installs):** mitigated. No packages were added, and both scripts import only `node:` built-ins.

No new surface beyond the threat model.

## Next Phase Readiness

From now on, every later plan's files are checked by `pnpm check:name`. Workflows and Dockerfiles (01-04..01-07) must derive names from the repository or from `@app/config/product`. CONTRIBUTING.md is not allowlisted and must say "this project". Plan 01-07 should run `pnpm check:name` and `pnpm test:root` in the `name-guard` job (plain Node; the guard needs a full checkout with `.git`). Plan 01-09 adds the README "Renaming the project" checklist that the `product.ts` header points to.

## Self-Check: PASSED

- `packages/config/product.ts`, `scripts/check-product-name.mjs` and `scripts/check-product-name.test.mjs` exist.
- Commits `4560669` and `3e4a109` are ancestors of HEAD.
- `git rev-list --count a3d4cb4..HEAD` = 2.
