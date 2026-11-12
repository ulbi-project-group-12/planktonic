---
phase: 01-repo-foundation-and-ci-cd-lead
plan: 02
subsystem: tooling
tags: [prettier, husky, lint-staged, eslint, supply-chain, hygiene]

requires:
  - phase: 01-01
    provides: pnpm 12 workspace root, strict catalog (husky, lint-staged, prettier, eslint pins), @app/config ESLint factory
provides:
  - "@app/config/prettier shared Prettier config (singleQuote, trailingComma all, printWidth 100)"
  - Root scripts format, format:check, prepare (husky), check:pins, lint:root
  - husky 9 pre-commit hook running lint-staged 17 on staged files only (core.hooksPath=.husky/_)
  - scripts/check-pins.mjs exact-pin guard (manifest specs and catalog versions)
  - Root eslint.config.js so root-level JS (scripts/) is linted
  - .editorconfig, .gitattributes (LF), names-only .env.example (NODE_ENV, APP_VERSION, PRODUCT_NAME, PRODUCT_SLUG)
affects: [01-03, 01-04, 01-05, 01-06, 01-07, 01-08, 01-09, ci]

actuals:
  tokens: 2900
  tasks: 3
  commits: 3
plan_head_before: 07a7e73f85039237b43b7fbb5d953d7efd00af79
plan_head_after: bd5818b9693f3d032a7c6ed0be20c3ad87005fb5

tech-stack:
  added: [prettier 3.9.10, husky 9.1.7, lint-staged 17.6.0]
  patterns:
    - "Root prettier key points at @app/config/prettier; no per-package Prettier copies (D-04)"
    - "Pre-commit = prettier --write + eslint --fix on staged files only; typecheck/test stay in CI"
    - "Every manifest dependency is catalog: or workspace:*, enforced by pnpm check:pins"

key-files:
  created:
    - packages/config/prettier/index.js
    - .prettierignore
    - .husky/pre-commit
    - scripts/check-pins.mjs
    - eslint.config.js
    - .editorconfig
    - .gitattributes
    - .env.example
  modified:
    - package.json
    - pnpm-lock.yaml
    - packages/config/package.json
    - packages/config/tsconfig.json

key-decisions:
  - "check-pins also covers peerDependencies and fails closed on an unparseable or empty catalog block, not only on ranges"
  - "No root tsconfig.json was needed: the shared factory disables type-aware linting for .js/.mjs/.cjs, so root JS lints without a project"

patterns-established:
  - "Root-level JS gets linted by the root eslint.config.js (same 2-line base consumer); packages keep their own nearest config"
  - "New env vars go into .env.example as NAME= only, with context in # comments"

requirements-completed: [TZ-FE-11, TZ-BE-11, TZ-FE-12, TZ-BE-12, TZ-BE-16, TZ-PROD-10, TZ-PROCESS-06]

coverage:
  - id: D1
    description: "pnpm format:check is green repo-wide through the one shared config"
    requirement: TZ-FE-11
    verification:
      - kind: other
        ref: "pnpm format:check -> All matched files use Prettier code style!"
        status: pass
    human_judgment: false
  - id: D2
    description: "Pre-commit hook blocks a staged lint error and only touches staged files"
    requirement: TZ-FE-12
    verification:
      - kind: other
        ref: "sh .husky/pre-commit on staged probe-bad.js -> exit 1, no-unused-vars (probe deleted)"
        status: pass
    human_judgment: false
  - id: D3
    description: "A version range in a manifest or the catalog makes check:pins fail"
    requirement: TZ-BE-16
    verification:
      - kind: other
        ref: "throwaway-copy probes: eslint ^10.13.0 and zod ~4.6.7 -> exit 1"
        status: pass
    human_judgment: false
  - id: D4
    description: ".env and nested .env.* are ignored, .env.example is tracked and holds names only"
    requirement: TZ-PROD-10
    verification:
      - kind: other
        ref: "Task 3 automated verify (git check-ignore, no value on non-comment lines, no tracked env files)"
        status: pass
    human_judgment: false

duration: 3min
completed: 2026-11-08
status: complete
---

# Phase 1 Plan 02: Local Quality Gates Summary

**Shared Prettier config as `@app/config/prettier`, a husky 9 + lint-staged 17 pre-commit hook that is proven to block a staged lint error, an exact-pin guard (`pnpm check:pins`) with a root ESLint config for `scripts/`, plus `.editorconfig`, LF `.gitattributes` and a names-only `.env.example`.**

## Performance

- **Duration:** about 3 min (2026-11-08T16:49:49Z to 16:52:15Z)
- **Completed:** 2026-11-08
- **Tasks:** 3/3
- **Files:** 8 created, 4 modified

## Accomplishments

- `packages/config/prettier/index.js` (JSDoc-typed `import('prettier').Config`), exported as `./prettier` and typechecked through the `@app/config` tsconfig include.
- Root `package.json`: `"prettier": "@app/config/prettier"`, scripts `format`, `format:check`, `prepare: husky`, `check:pins`, `lint:root`, and a `lint-staged` map (`*.{ts,tsx,js,mjs,cjs}` → prettier + `eslint --fix --no-warn-ignored`; `*.{json,md,yml,yaml}` → prettier). New root devDependencies: `@app/config` (`workspace:*`), plus `eslint`, `prettier`, `husky` and `lint-staged` (all `catalog:`).
- `pnpm install` ran `husky`, which set `core.hooksPath=.husky/_`. All three task commits in this plan went through the new hook and passed it.
- `.prettierignore`: `pnpm-lock.yaml`, `.planning/`, `.claude/`, `dist/`, `coverage/`, `.turbo/`.
- `scripts/check-pins.mjs`: reads the root and every `apps/*` / `packages/*` manifest. It checks `dependencies`, `devDependencies`, `optionalDependencies` and `peerDependencies`, and every `catalog:` entry. On the real tree it prints `check-pins: 2 manifests OK`.
- Root `eslint.config.js` (the 2-line `base({ tsconfigRootDir: import.meta.dirname })` consumer). `pnpm lint:root` lints `eslint.config.js` and `scripts/`.
- `.editorconfig`, `.gitattributes` (`* text=auto eol=lf`; all tracked files were already LF in the index, so nothing needed renormalising), and `.env.example` with `NODE_ENV=`, `APP_VERSION=`, `PRODUCT_NAME=`, `PRODUCT_SLUG=` and no values. The product name does not appear in it (D-35).

## Task Commits

1. **Task 1 (tracer): shared Prettier config + husky/lint-staged gate.** `be87c5d`. Tracer gate (auto mode): after the commit, the verify was re-run end to end and passed (`Tasks: 2 successful, 2 total`, format:check green, hooksPath `.husky/_`).
2. **Task 2: exact-pin guard and root ESLint config.** `cc00e76`.
3. **Task 3: editorconfig, LF endings, names-only .env.example.** `bd5818b`.

## Probes (all cleaned up, nothing committed)

**Pre-commit block probe (Task 1).** I staged `packages/config/probe-bad.js` (`const unused = 1;`) and ran `sh .husky/pre-commit`. It exited **1**:
```
✖ eslint --fix --no-warn-ignored:
/Users/soadap/Developer/ulbigram/packages/config/probe-bad.js
  1:7  error  'unused' is assigned a value but never used  @typescript-eslint/no-unused-vars
✖ 1 problem (1 error, 0 warnings)
```
lint-staged reported "Reverting to original state because of errors… Done". Afterwards I ran `git reset -q -- packages/config/probe-bad.js` and deleted the file. `refs/stash` does not exist, so lint-staged left no stash entry.

**`pnpm format` on 01-01 files.** No 01-01 file was reformatted. The only file Prettier rewrote was `packages/config/tsconfig.json`, and only my own new `include` line in it, which Prettier collapsed back to a one-line array.

**check-pins negative probe (Task 2).** This ran in a throwaway copy created with `mktemp -d` in the session scratchpad, using `rsync` and excluding `node_modules`, `.git` and `.planning`. The copy was deleted afterwards.
- With `packages/config/package.json` `devDependencies.eslint = "^10.13.0"`, `node scripts/check-pins.mjs` exited **1** and printed `packages/config/package.json: devDependencies.eslint = "^10.13.0"`.
- With that edit reverted and the catalog set to `zod: ~4.6.7`, it exited **1** and printed `pnpm-workspace.yaml: catalog zod = "~4.6.7"`.

**lint:root has teeth.** A temporary `scripts/probe-bad.mjs` with an unused const made `pnpm lint:root` exit 1 (`@typescript-eslint/no-unused-vars`), which shows `scripts/` is linted rather than ignored. The file was deleted.

## Decisions Made

- check-pins goes beyond the RESEARCH example. It adds `peerDependencies` (as the plan asks), and it fails closed on an unparseable catalog line, a missing `catalog:` block or an empty catalog. Without that, a reformatted workspace file could pass silently.
- No root `tsconfig.json`. Pitfall 11 suggested one for type-aware linting of `scripts/`, but the shared factory applies `disableTypeChecked` to `*.{js,mjs,cjs}`, so root JS lints without a project. A root tsconfig will only be needed if root-level `.ts` files are ever added.

## Deviations from Plan

**1. [Rule 3 - Environment] Throwaway copy location and excludes**
- The plan's `mktemp -d` copy was created inside the session scratchpad, per the environment's temp-file rule. The rsync also excluded `.git` and `.planning`, which check-pins does not read. The probe semantics are unchanged.

**2. [Rule 2 - Hardening] check-pins fails closed on malformed catalog input**
- **Found during:** Task 2
- **Fix:** errors are reported for a missing catalog block, an empty catalog, or a non-comment line that does not parse as `name: version`.
- **Files modified:** scripts/check-pins.mjs
- **Commit:** cc00e76

Otherwise the plan was executed exactly as written.

## Issues Encountered

None.

## Threat Surface

- **T-01-06 (manifest tampering):** mitigated by `scripts/check-pins.mjs`, with the negative proofs recorded above. CI wiring comes in 01-07.
- **T-01-07 (secrets):** mitigated. `.env*` is ignored (a nested `apps/api/.env.local` is confirmed ignored), `.env.example` is tracked with names only, and no env files are tracked.
- **T-01-08 (`--no-verify`):** accepted per plan.
- **T-01-SC (supply chain):** the three new packages are catalog pins from 01-01 that already passed the 14-day gate (`✓ Lockfile passes supply-chain policies`). No new package names were introduced.

No new surface beyond the threat model.

## Next Phase Readiness

Plans 01-03..01-09 now commit through the pre-commit hook. New packages should copy the 2-line `eslint.config.js`, and their dependencies must be `catalog:` or `workspace:*`, or `pnpm check:pins` fails. Plan 01-07's lint job should run `pnpm format:check`, `pnpm check:pins` and `pnpm lint:root` with `HUSKY=0`. TZ-BE-16 and TZ-PROD-10 are covered locally here. Their CI halves (the required `lint` check, and the secret scan in 01-09) are still to come.

## Self-Check: PASSED

- All 8 created files exist on disk, and `packages/config/probe-bad.js` / `scripts/probe-bad.mjs` are absent.
- Commits `be87c5d`, `cc00e76` and `bd5818b` are ancestors of HEAD.
- `git rev-list --count 07a7e73..HEAD` = 3.
