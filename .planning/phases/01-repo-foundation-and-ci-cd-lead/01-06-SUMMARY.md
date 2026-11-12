---
phase: 01-repo-foundation-and-ci-cd-lead
plan: 06
subsystem: web
tags: [web, placeholder, docker, turbo, typescript, sc1]
status: complete

requires:
  - phase: 01-01
    provides: pnpm workspace + catalog pins, @app/config tsconfig base and ESLint base(), Turbo transit-node pipeline
  - phase: 01-02
    provides: husky + lint-staged pre-commit gate
  - phase: 01-03
    provides: product-name single source and the name guard (pnpm check:name)
  - phase: 01-05
    provides: apps/api placeholder as the template, root allow-list .dockerignore
provides:
  - "@app/web placeholder package with real lint, typecheck, test and build scripts (4/4 Turbo tasks)"
  - "apps/web/src/main.ts printing name, APP_VERSION and PRODUCT_NAME with empty-string-safe fallbacks"
  - "apps/web/Dockerfile: placeholder image structurally identical to apps/api/Dockerfile (digest-pinned base, uid 1000, build-args only)"
  - "SC1 proven from a clean clone: frozen install + 14/14 Turbo tasks across the 4 packages"
affects: [01-07, 01-08, 01-09, phase-1.1]

actuals:
  tokens: 1184
  tasks: 2
  commits: 2
plan_head_before: 3fcab83e7592f8c0fe2bd89a90ba8c0685885a70
plan_head_after: 0849e5546b297c9086e2de9781df1b971694d055

tech-stack:
  added: []
  patterns:
    - "The two app placeholders stay structurally identical: sed 's/web/APP/' vs sed 's/api/APP/' of the Dockerfiles diff to nothing"

key-files:
  created:
    - apps/web/package.json
    - apps/web/src/main.ts
    - apps/web/tsconfig.json
    - apps/web/tsconfig.build.json
    - apps/web/eslint.config.js
    - apps/web/README.md
    - apps/web/Dockerfile
  modified:
    - pnpm-lock.yaml

key-decisions:
  - "apps/web is a byte-for-byte mirror of apps/api apart from the name and the Next.js / ticket 1.4 wording; no UI dependencies until Phase 1.1 (D-02)"

requirements-completed: [TZ-FE-02, TZ-PROCESS-06, TZ-FE-16, TZ-BE-15]

metrics:
  duration: 2min
  completed: 2026-11-08
---

# Phase 1 Plan 06: apps/web placeholder, web image and clean-clone SC1 Summary

**`@app/web` mirrors the api placeholder. It has no framework, passes 4/4 Turbo tasks and prints its name, `APP_VERSION` and `PRODUCT_NAME`. Its image has the same structure as the api image: digest-pinned and running as uid 1000. A clean clone of the branch passes `pnpm install --frozen-lockfile` and all 14 Turbo tasks.**

## Performance

- **Duration:** about 2 min
- **Started:** 2026-11-08T17:07:29Z
- **Completed:** 2026-11-08T17:08:42Z
- **Tasks:** 2
- **Files:** 7 created, 1 modified (pnpm-lock.yaml)

## Accomplishments

- `@app/web` is private and ESM. It has no `dependencies` and no `next`, `react` or `react-dom`. It has the scripts `build`, `typecheck`, `lint`, `test` and `start`. `pnpm turbo run lint typecheck test build --filter=@app/web` reports `Tasks: 4 successful, 4 total`.
- With no env set, `node apps/web/dist/main.js` prints exactly `@app/web dev for this project: placeholder, the Next.js skeleton arrives in Phase 1.1`. With `APP_VERSION=v9.9.9 PRODUCT_NAME=acme` it prints `@app/web v9.9.9 for acme: ...`.
- The README points at Phase 1.1 ticket 1.4: the Next.js 16 App Router + FSD skeleton with `_app`/`_pages`, shadcn `shared/ui` and Steiger.
- `apps/web/Dockerfile` is the api Dockerfile with `apps/api` replaced by `apps/web`. The structural diff is empty, and the base digest `@sha256:8996bb58…ce216` appears once. Local checks:
  - with build-args it prints `@app/web v0.0.0-ci for acme: placeholder, the Next.js skeleton arrives in Phase 1.1`;
  - without build-args it prints the `dev` / `this project` fallbacks;
  - `id -u` is 1000;
  - `/app` contains exactly `package.json src`;
  - stderr is empty, so type stripping prints no warning.
- `pnpm check:name` is green: 42 tracked files clean after staging.

## SC1: clean-clone proof

- I cloned the local repo on branch `gsd/phase-01-repo-foundation-and-ci-cd-lead` at `af6a1ae` (Task 1 committed) into the session scratchpad. The toolchain was Node v26.13.0 and pnpm 12.15.0.
- `pnpm install --frozen-lockfile` exited 0 (`Done in 343ms using pnpm v12.15.0`, from the warm local store).
- `pnpm turbo run lint typecheck test build` exited 0:

```
 Tasks:    14 successful, 14 total
Cached:    0 cached, 14 total
  Time:    1.514s
```

- The 14 tasks were `@app/config` lint and typecheck (2), and lint, typecheck, test and build for each of `@app/contracts`, `@app/api` and `@app/web` (3 × 4 = 12). None came from the cache.
- Wall time was about 0s for the install and about 2s for Turbo. The clone was deleted afterwards.

## Task Commits

1. **Task 1 (tracer): apps/web placeholder through the Turbo pipeline**: `af6a1ae` (feat). The tracer gate re-ran the full `<verify>` (frozen install, Turbo 4/4, the exact printed line and the name guard) and it passed before Task 2 started.
2. **Task 2: placeholder web image, structurally identical to api**: `0849e55` (feat)

## Decisions Made

- I copied the api files verbatim and changed only the name, the description, the test echo, the comment, the printed framework name and the README wording. Nothing else differs, so the two placeholders can't drift before Phase 1.1 replaces them.

## Deviations from Plan

None. The plan was executed exactly as written. Per the session rules, the clean clone went into the session scratchpad rather than a `mktemp -d` directory. The steps were the same.

## Issues Encountered

- One probe measured 84 bytes of "stderr". As in 01-05, the cause was zsh MULTIOS (`2>&1 1>/dev/null |` also copies stdout into the pipe). Redirecting stderr to a file gave 0 bytes. Nothing to fix.

## Threat Mitigations

- T-01-16: `USER node`, and `id -u` = 1000 was checked. The digest pin and the allow-list context are inherited from 01-05, and the `/app` contents check (`package.json src`) confirmed them again.
- T-01-SC: no new packages. The lockfile grew only by the `apps/web` importer, which uses the existing catalog entries `@types/node`, `eslint` and `typescript`.

## Cleanup

I removed the local probe images `local/web:ci` and `local/web:noarg`. No `local/*` images remain and nothing was pushed. I also deleted the clean clone and its logs from the scratchpad.

## Next Phase Readiness

- Plan 01-07 (release.yml) now has both `apps/api/Dockerfile` and `apps/web/Dockerfile` to build, each with `APP_VERSION` and `PRODUCT_NAME` as build-args.
- TZ-CICD-03 stays open until release.yml lands (01-07).

## Self-Check: PASSED

- All 7 created files exist.
- Commits `af6a1ae` and `0849e55` are ancestors of HEAD.
- `git rev-list --count 3fcab83..HEAD` = 2.

---
*Phase: 01-repo-foundation-and-ci-cd-lead*
*Completed: 2026-11-08*
