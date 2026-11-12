---
phase: 01-repo-foundation-and-ci-cd-lead
plan: 05
subsystem: api
tags: [api, placeholder, docker, turbo, typescript, supply-chain]
status: complete

requires:
  - phase: 01-01
    provides: pnpm workspace + catalog pins, @app/config tsconfig base and ESLint base(), Turbo transit-node pipeline
  - phase: 01-02
    provides: husky + lint-staged pre-commit gate
  - phase: 01-03
    provides: product-name single source (packages/config/product.ts) and the name guard (pnpm check:name)
provides:
  - "@app/api placeholder package with real lint, typecheck, test and build scripts (4/4 Turbo tasks)"
  - "apps/api/src/main.ts printing name, APP_VERSION and PRODUCT_NAME with empty-string-safe fallbacks"
  - "apps/api/Dockerfile: placeholder image on the digest-pinned node:26.13.0-alpine3.24, uid 1000, name and version only as build-args"
  - "Root .dockerignore allow-list (only apps/*/package.json and apps/*/src) shared by both apps"
affects: [01-06, 01-07, 01-08, 01-09, phase-1.1]

actuals:
  tokens: 830
  tasks: 2
  commits: 2
plan_head_before: f0aa1ce97ca06ec5baa2e78ad7f567ecf9dc07a9
plan_head_after: 972406c0270c63b58b0ccc91d6656f59bb285e75

tech-stack:
  added: []
  patterns:
    - "Placeholder app source runs both compiled (tsc to dist) and directly via Node 26 type stripping (erasable TS only)"
    - "fromEnv(key, fallback) treats '' like undefined, because a Docker ENV from an unset ARG is the empty string"
    - "Images build from the repo-root context with a per-app -f; the context is an allow-list .dockerignore"
    - "Product name reaches images only via the PRODUCT_NAME build-arg; OCI labels come from metadata-action (D-34)"

key-files:
  created:
    - apps/api/package.json
    - apps/api/src/main.ts
    - apps/api/tsconfig.json
    - apps/api/tsconfig.build.json
    - apps/api/eslint.config.js
    - apps/api/README.md
    - apps/api/Dockerfile
    - .dockerignore
  modified:
    - pnpm-lock.yaml

key-decisions:
  - "ARG PRODUCT_NAME has no default, so an image built without it prints the 'this project' fallback instead of any name"
  - "No name LABEL in the Dockerfile; release.yml derives OCI labels from the repository (D-34)"

requirements-completed: [TZ-BE-02, TZ-PROCESS-06]

metrics:
  duration: 2min
  completed: 2026-11-08
---

# Phase 1 Plan 05: apps/api placeholder and placeholder image Summary

**`@app/api` is a framework-free placeholder. It passes lint, typecheck, test and build through Turbo and prints its name, `APP_VERSION` and `PRODUCT_NAME`. Its image is built from the repo root on the digest-pinned `node:26.13.0-alpine3.24`, runs as uid 1000 and gets only `package.json` and `src` through an allow-list `.dockerignore`.**

## Performance

- **Duration:** about 2 min
- **Started:** 2026-11-08T17:04:08Z
- **Completed:** 2026-11-08T17:06Z
- **Tasks:** 2
- **Files:** 8 created, 1 modified (pnpm-lock.yaml)

## Accomplishments

- `@app/api` (private, ESM, no runtime dependencies, no framework packages) with `build`, `typecheck`, `lint`, `test` and `start` scripts. `pnpm turbo run lint typecheck test build --filter=@app/api` reports `Tasks: 4 successful, 4 total`.
- `src/main.ts` prints `@app/api dev for this project: placeholder, the NestJS skeleton arrives in Phase 1.1` with no env set, and `@app/api v9.9.9 for acme: ...` when overridden.
- `apps/api/Dockerfile` (exact tag plus multi-arch index digest, `ARG APP_VERSION=dev`, `ARG PRODUCT_NAME`, `USER node`, `CMD ["node", "src/main.ts"]`). Checked locally:
  - with build-args it prints `v0.0.0-ci for acme`;
  - without build-args it prints the `dev` / `this project` fallbacks;
  - `id -u` is 1000;
  - `/app` contains exactly `package.json src`;
  - stderr is empty, so type stripping prints no warning.
- Root `.dockerignore`: `**`, `!apps/*/package.json`, `!apps/*/src/**`. `.env*`, `.git`, `node_modules`, `.planning` and `dist` cannot enter a build context.
- `pnpm check:name` is green (34 tracked files clean). No file in `apps/api` spells the product name.

## Task Commits

1. **Task 1 (tracer): apps/api placeholder through the Turbo pipeline**: `3056ea5` (feat). The tracer gate re-ran the full `<verify>`: install, Turbo 4/4, both printed lines and the name guard all passed.
2. **Task 2: placeholder api image with allow-list build context**: `972406c` (feat)

## Decisions Made

- `ARG PRODUCT_NAME` has no default. Combined with `fromEnv` treating `''` as unset, an image built without the arg prints "this project" and never a name.
- `tsconfig.json` includes only `src`, as the plan says. `eslint.config.js` still lints cleanly through the shared base, so no root `*.ts` include was needed (contracts needed one only for `vitest.config.ts`).

## Deviations from Plan

None. The plan was executed exactly as written.

## Issues Encountered

- One probe measured 83 bytes of "stderr" from the container. The cause was zsh MULTIOS: `2>&1 >/dev/null |` copies stdout into the pipe. Re-checking with `2>&1 1>/dev/null` showed empty stderr. Nothing to fix.

## Threat Mitigations

- T-01-11: `USER node`, and `id -u` = 1000 was checked.
- T-01-12: the base image is pinned to the exact tag plus `@sha256:8996bb58…ce216`.
- T-01-13: the `.dockerignore` allow-list was used, and `/app` contents were checked to be exactly `package.json src`.
- T-01-SC: no new packages. Only the existing catalog entries `@types/node`, `eslint` and `typescript` are used. The lockfile grew by the `apps/api` importer only.

## Cleanup

The local probe images `local/api:ci`, `local/api:noarg` and `local/api:probe` were removed, and none remain. Nothing was pushed.

## Next Phase Readiness

- Plan 01-07 (release.yml) has a real `apps/api/Dockerfile` to build, with `APP_VERSION` and `PRODUCT_NAME` as build-args.
- The web placeholder can reuse the root `.dockerignore` unchanged.
- TZ-CICD-03 stays open until release.yml lands (01-07).

## Self-Check: PASSED

- All 8 created files exist.
- Commits `3056ea5` and `972406c` are ancestors of HEAD.
- `git rev-list --count f0aa1ce..HEAD` = 2.

---
*Phase: 01-repo-foundation-and-ci-cd-lead*
*Completed: 2026-11-08*
