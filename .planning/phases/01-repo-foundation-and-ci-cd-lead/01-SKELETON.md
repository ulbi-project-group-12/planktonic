# Walking Skeleton — ulbigram (working name)

**Phase:** 1
**Generated:** 2026-11-08

> Adapted skeleton. For this project the walking skeleton is the **delivery pipeline**, not an app feature. The usual "one real DB read/write + one UI interaction" does not apply here: the database, the Next.js UI and the NestJS API are the team's Phase 1.1 skeletons and are out of scope per D-02. Every later phase ships through this pipeline without changing its architecture.

## Capability Proven End-to-End

A developer clones the repo and gets a green pipeline with two commands: `pnpm install --frozen-lockfile` and `pnpm turbo run lint typecheck test build` (14 tasks, 4 packages). Every PR and push to `main` runs the same checks in GitHub Actions as five stable checks: `lint`, `typecheck`, `test`, `build` and `name-guard`. Publishing a GitHub Release turns the tagged commit into two container images in GHCR.

The path is: clone → install → lint / typecheck / test / build → pre-commit → CI → release → GHCR images → deploy stub (Phase 4).

## Architectural Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Monorepo | pnpm 12.15.0 workspaces (`apps/*`, `packages/*`) + one `catalog:` of exact pins in `pnpm-workspace.yaml` | D-01, D-07, D-28. A single source of versions that CODEOWNERS can review |
| Supply-chain policy | `minimumReleaseAge: 20160` (14 days, transitive deps included), `engineStrict: true`, `savePrefix: ''`, `catalogMode: strict`, committed lockfile, frozen installs, `scripts/check-pins.mjs` | D-07. pnpm enforces the rules natively; the guard catches hand-edited ranges |
| Runtime | Node 26.13.0 LTS (`.nvmrc`, `engines`), documented exception to the 14-day rule | D-06, D-29 |
| Task runner | Turborepo 2.11.10 with transit nodes; local cache persisted in CI via actions/cache; no remote cache | D-11. Remote cache is deferred |
| Language | TypeScript 6.0.3, shared `@app/config/tsconfig/base.json` (nodenext, strict, `types: []`); packages add `types: ["node"]` and `erasableSyntaxOnly` | D-06, D-08. typescript-eslint supports TS < 6.1 |
| Lint / format | ESLint 10.13.0 flat-config factory `base({ tsconfigRootDir })` (typescript-eslint 8.72.0 strictTypeChecked + stylistic) and Prettier 3.9.10, both shared from `@app/config`; 2-line consumer per package | D-04 |
| Local gate | husky 9.1.7 + lint-staged 17.6.0 (staged files: prettier --write + eslint --fix) | D-09. CI is authoritative |
| Contracts | `@app/contracts` compiled package: exports `types` → `src`, `default` → `dist`; zod 4.6.7; Vitest 5.0.5 with an explicit vite 8.3.5 peer; first schema `TicketKey` (`UL-<n>`) | D-03, STACK §3.4 |
| Product name | Single source `packages/config/product.ts` (`@app/config/product`), env `PRODUCT_NAME` / `PRODUCT_SLUG` (names only), CI `name-guard` (zero-dep script + node:test) | D-33, D-35, D-36 |
| Package scope | Neutral `@app/*`, every package `private: true`, internal deps `workspace:*` | D-05, dependency-confusion guard |
| CI | `.github/workflows/ci.yml` on `pull_request` + `push: main`; local composite `.github/actions/setup`; SHA-pinned actions; `contents: read`; concurrency; timeouts; non-blocking `pr-hygiene` | D-11..D-14, D-24 |
| Images | Placeholder Dockerfiles per app, root build context, allow-list `.dockerignore`, `node:26.13.0-alpine3.24@sha256:8996…`, `USER node`, version and product name as build-args only | D-17, D-34 |
| Registry | GHCR `ghcr.io/<owner>/<repo>-{web,api}`, derived from the repository context (today `ghcr.io/ulbi-project-group-12/ulbigram-{web,api}`); tags `<tag>`, `<version>`, `sha-<7>`, `latest` (stable only) | D-15, D-34 |
| Release | `release.yml` on `release: published`, triggered by a human pressing Publish on a Release cut from `release/x.y` | D-15, D-18, TZ-CICD-03 |
| Deploy | Stub job, `TODO(Phase 4)`: compose pull → one-shot migrate → up -d api×2 → /health smoke | D-16 |
| Repo rules | Settings, rulesets (`main`, `release/*`) and CODEOWNERS kept as code, applied by `scripts/apply-repo-rules.sh`. Rulesets are plan-gated (403) while private on Free; bypass is org admin via PR only | D-19..D-22, D-30, D-31 |
| Directory layout | `apps/web`, `apps/api`, `packages/contracts`, `packages/config`, `scripts/`, `.github/` | STACK §3 |

## Stack Touched in Phase 1

- [x] Project scaffold: workspace, shared build/lint/format/test config, test runner (Vitest in contracts, node:test for root scripts)
- [ ] Routing: N/A in Phase 1. The Next.js App Router skeleton is Phase 1.1 (D-02)
- [ ] Database: N/A in Phase 1. Postgres + Prisma is Phase 1.1 (D-02)
- [ ] UI: N/A in Phase 1. The FSD skeleton is Phase 1.1 (D-02)
- [x] Deployment, adapted: a documented local full-pipeline command, CI on every PR/push, and Release → GHCR images. The server deploy is Phase 4

## Out of Scope (Deferred to Later Slices)

- Next.js 16 / NestJS 12 code and dependencies, docker-compose dev services, CodeRabbit, Storybook, Steiger (Phase 1.1, team)
- Postgres/Redis service containers in CI, the two-instance socket test, Playwright smoke (later phases)
- Renovate/Dependabot, Turbo remote cache (CONTEXT deferred ideas)
- Server, Traefik, real deploy, `production` environment (Phase 4; environments need a public repo on Free)
- Ruleset and CODEOWNERS enforcement, secret scanning (blocked by plan until the repo goes public, D-30)
- The actual rename of the working name (a later `/gsd-quick` task, D-36)

## Subsequent Slice Plan

Each later phase adds one vertical slice on top of this pipeline without changing it:

- Phase 1.1: team skeletons. Next.js FSD web and NestJS api with `/api/health`, docker-compose, Steiger/Storybook as checks
- Phase 2: realtime prototype (two clients, two instances)
- Phase 3: access and workspaces
- Phase 4: prod and observability. Replaces the deploy stub with the real deploy behind the same `release.yml`
- Phases 5–14: product slices, each shipped through the same CI checks and release images

## Artifacts

All files this phase creates, with the plan that creates each:

| Plan | Files |
|------|-------|
| 01-01 | `package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`, `turbo.json`, `.gitignore`, `.nvmrc`, `packages/config/{package.json, tsconfig/base.json, tsconfig.json, eslint/index.js, eslint.config.js}` |
| 01-02 | `packages/config/prettier/index.js`, `.prettierignore`, `.husky/pre-commit`, `eslint.config.js`, `scripts/check-pins.mjs`, `.editorconfig`, `.gitattributes`, `.env.example` |
| 01-03 | `packages/config/product.ts`, `scripts/check-product-name.mjs`, `scripts/check-product-name.test.mjs` |
| 01-04 | `packages/contracts/{package.json, tsconfig.json, tsconfig.build.json, eslint.config.js, vitest.config.ts, src/index.ts, src/ticket-key.ts, src/ticket-key.test.ts}` |
| 01-05 | `apps/api/{package.json, src/main.ts, tsconfig.json, tsconfig.build.json, eslint.config.js, README.md, Dockerfile}`, `.dockerignore` |
| 01-06 | `apps/web/{package.json, src/main.ts, tsconfig.json, tsconfig.build.json, eslint.config.js, README.md, Dockerfile}` |
| 01-07 | `.github/actions/setup/action.yml`, `.github/workflows/ci.yml`, `.github/workflows/release.yml`, `scripts/pr-hygiene.sh` |
| 01-08 | `.github/repo-settings.json`, `.github/rulesets/main.json`, `.github/rulesets/release.json`, `scripts/apply-repo-rules.sh`, `.github/CODEOWNERS`, `.github/pull_request_template.md` |
| 01-09 | `README.md`, `CONTRIBUTING.md` (plus status updates in `01-VALIDATION.md`) |

Root scripts: `build`, `lint`, `typecheck`, `test`, `format`, `format:check`, `check:pins`, `lint:root`, `check:name`, `test:root`, `prepare`.
Required CI checks: `lint`, `typecheck`, `test`, `build`, `name-guard`.
Env var names: `NODE_ENV`, `APP_VERSION`, `PRODUCT_NAME`, `PRODUCT_SLUG`.
Optional repo variables: `PRODUCT_SLUG`, `PRODUCT_NAME`.
