# planktonic

Welcome to planktonic, a Slack-like work messenger for development teams, built by
ulbi-project-group-12. Status: Phase 1.1, app skeletons (a Next.js web app, a NestJS api and the
dev services in Docker) on top of the Phase 1 foundation (monorepo, CI, release pipeline).

## Prerequisites

- **Node 26.13.0**, the version in `.nvmrc` (`nvm use` or `fnm use`). This is a documented exception
  to the 14-day rule (D-29): it is the only Node 26 LTS release and comes from nodejs.org, not npm.
- **pnpm 12.15.0**. Node 26 does not bundle corepack, so install it with npm:

  ```sh
  npm i -g pnpm@12.15.0
  ```

  The alternative is the official standalone installer with `PNPM_VERSION=12.15.0` set. Any pnpm 12
  switches itself to the `packageManager` version in `package.json`.

- **Docker** with **Compose v2.24 or newer** (Docker Desktop, or Docker Engine with the compose
  plugin). It runs Postgres, Redis and the S3 store for local development, so it is required.
- **Git.**

On Windows, run the commands in WSL2 or PowerShell; `cp` works in both. nvm-windows does not read
`.nvmrc`, so run `nvm use 26.13.0` there.

## Quick start

From zero to a running stack:

```sh
git clone https://github.com/ulbi-project-group-12/planktonic.git
cd planktonic
nvm use                          # or: fnm use
pnpm install --frozen-lockfile
cp .env.example .env
pnpm services:up
pnpm db:migrate
pnpm dev
```

- `pnpm services:up` starts Postgres, Redis and SeaweedFS (S3) in the background. It returns once
  all three are healthy and the one-shot `s3-init` job has created the dev bucket.
- `pnpm db:migrate` applies the committed database migrations.
- `pnpm dev` starts the web app and the api together and keeps running.

Then open:

- the web app: http://localhost:3000
- the api health check: http://localhost:3001/api/health (and http://localhost:3001/api/health/ready
  for the database check)

To stop, press `Ctrl+C` in the `pnpm dev` terminal, then run `pnpm services:down`. The data stays
in Docker volumes; `pnpm services:reset` deletes it (database, Redis and bucket).

The install also enables the husky pre-commit hook.

## Local services

`compose.yaml` (dev only; the production compose arrives in Phase 4) runs these services. The
compose project is named after the checkout directory, and every port binds to `127.0.0.1` only.

| Service     | Image (pinned by digest)       | Host port                 | Purpose                                                  |
| ----------- | ------------------------------ | ------------------------- | -------------------------------------------------------- |
| `postgres`  | `pgvector/pgvector:0.8.6-pg18` | `55432` (`POSTGRES_PORT`) | Postgres 18 with the `vector` extension (init SQL)       |
| `redis`     | `redis:8.10.2`                 | `56379` (`REDIS_PORT`)    | Redis 8, append-only; no consumer until Phase 2 realtime |
| `seaweedfs` | `chrislusf/seaweedfs:4.51`     | `58333` (`S3_PORT`)       | S3-compatible object storage (`server -s3`)              |
| `s3-init`   | `chrislusf/seaweedfs:4.51`     | none                      | One-shot job: creates the dev bucket, safe to re-run     |

Why SeaweedFS and not Garage (D-09): SeaweedFS is Apache-2.0 and runs the whole S3 store in a
single container, and it is the first option in the stack research. MinIO CE no longer ships
images.

`pnpm services:up` returns when `s3-init` exits 0, which happens only after the other three are
healthy (plain `docker compose up --wait` fails on a one-shot job). `pnpm services:down` stops the
stack and keeps the data; `pnpm services:reset` also deletes the volumes (database, Redis and the
bucket), so run `pnpm db:migrate` again afterwards.

## Environment variables

`cp .env.example .env` gives you working local values; compose, the api and the Prisma CLI read
the root `.env` (the api and the Prisma CLI only in development, never under `NODE_ENV` `test` or
`production`). `.env` is git-ignored. Every value below is an obviously-dev default: real secrets
never go into `.env.example` or the repository, and CI/CD reads them from GitHub secrets. Compose
uses the same values as its defaults, so the services also start without a `.env`.

| Variable               | Purpose                                                               | Local example value                                     | Read by                          |
| ---------------------- | --------------------------------------------------------------------- | ------------------------------------------------------- | -------------------------------- |
| `NODE_ENV`             | Node environment (`development`, `test` or `production`)              | empty (each tool's default)                             | `@app/api` env schema            |
| `APP_VERSION`          | Version string of a release image                                     | empty                                                   | release images (build-arg)       |
| `PRODUCT_NAME`         | Unread by the apps; they bake in `packages/config/product.ts` instead | empty                                                   | release images (env, no reader)  |
| `PRODUCT_SLUG`         | Slug override (URLs, image names)                                     | empty                                                   | reserved (no local reader yet)   |
| `API_PORT`             | Port the api listens on                                               | `3001`                                                  | `@app/api`                       |
| `API_HOST`             | Interface the api binds to (the api image sets `0.0.0.0`)             | empty (`127.0.0.1`, loopback only)                      | `@app/api`                       |
| `POSTGRES_DB`          | Database created on the first start                                   | `app`                                                   | compose `postgres`               |
| `POSTGRES_USER`        | Database owner role created on the first start                        | `app`                                                   | compose `postgres`               |
| `POSTGRES_PASSWORD`    | Dev-only password for `POSTGRES_USER`                                 | `app_dev_password`                                      | compose `postgres`               |
| `POSTGRES_PORT`        | Host port for Postgres                                                | `55432`                                                 | compose `postgres`               |
| `DATABASE_URL`         | Connection string; must match the four values above                   | `postgresql://app:app_dev_password@127.0.0.1:55432/app` | `@app/api`, Prisma CLI           |
| `REDIS_PORT`           | Host port for Redis                                                   | `56379`                                                 | compose `redis`                  |
| `REDIS_URL`            | Redis connection; must match `REDIS_PORT`                             | `redis://127.0.0.1:56379`                               | reserved for Phase 2 (realtime)  |
| `S3_PORT`              | Host port for the S3 gateway                                          | `58333`                                                 | compose `seaweedfs`              |
| `S3_ENDPOINT`          | S3 endpoint; must match `S3_PORT`                                     | `http://127.0.0.1:58333`                                | reserved for Phase 7 (files)     |
| `S3_REGION`            | S3 region (SeaweedFS accepts any)                                     | `us-east-1`                                             | reserved for Phase 7 (files)     |
| `S3_BUCKET`            | Dev bucket                                                            | `app-dev`                                               | compose `s3-init`; Phase 7 api   |
| `S3_ACCESS_KEY_ID`     | Dev-only S3 access key (the gateway's admin identity)                 | `dev-access-key`                                        | compose `seaweedfs`; Phase 7 api |
| `S3_SECRET_ACCESS_KEY` | Dev-only S3 secret key paired with `S3_ACCESS_KEY_ID`                 | `dev-secret-key`                                        | compose `seaweedfs`; Phase 7 api |
| `S3_FORCE_PATH_STYLE`  | Path-style S3 URLs (bucket in the path), needed by SeaweedFS          | `true`                                                  | reserved for Phase 7 (files)     |

Use `127.0.0.1`, not `localhost`, in `DATABASE_URL`, `REDIS_URL` and `S3_ENDPOINT`: the services
bind to IPv4 loopback only.

## Health endpoints

- `GET /api/health`: liveness. It never touches the database, so it answers 200 while the process
  runs.
- `GET /api/health/ready`: readiness. It runs `SELECT 1` through Prisma and answers 503
  (`database unreachable`, no connection details) when Postgres is down. The api log names the
  cause without values, e.g. `database readiness failed: P2010 AuthenticationFailed 28P01`.

Phase 4 smoke-checks `GET /api/health` on each api replica after a deploy; `/api/health/ready` is
what a load balancer can gate traffic on (D-12).

## Troubleshooting

- **A port is already in use** (`port is already allocated` from Docker, or `EADDRINUSE` from
  `pnpm dev`). Find the process with `lsof -i :<port>` (macOS, Linux) or
  `netstat -ano | findstr :<port>` (Windows) and stop it. Or pick other ports in your `.env`:
  `POSTGRES_PORT`, `REDIS_PORT`, `S3_PORT` or `API_PORT`. When you change `POSTGRES_PORT`, change
  the port in `DATABASE_URL` too; for `REDIS_PORT` and `S3_PORT`, change `REDIS_URL` and
  `S3_ENDPOINT`. Then run `pnpm services:down && pnpm services:up`.
- **Docker is not running** (`Cannot connect to the Docker daemon`, or `docker info` fails). Start
  Docker Desktop, or the daemon on Linux (`sudo systemctl start docker`), and run
  `pnpm services:up` again.
- **Wrong Node version.** `pnpm install` stops with `ERR_PNPM_UNSUPPORTED_ENGINE`. Run `nvm use`
  (or `fnm use`; `nvm use 26.13.0` on nvm-windows) and check that `node -v` prints `v26.13.0`.
- **`pnpm services:up` hangs or fails.** A service did not become healthy. Look at its log with
  `docker compose logs postgres` (or `redis`, `seaweedfs`, `s3-init`) and `docker compose ps`. A
  stale volume from an old setup is fixed with `pnpm services:reset`.
- **`/api/health/ready` returns 503.** Postgres is not reachable: check that `pnpm services:up`
  succeeded and that `DATABASE_URL` matches `POSTGRES_PORT`, then run `pnpm db:migrate`.
- **Dependency errors.** `ERR_PNPM_IGNORED_BUILDS` and `ERR_PNPM_NO_MATURE_MATCHING_VERSION` come
  from the supply-chain rules; see [Dependency rules](#dependency-rules).

## Scripts

| Script                                     | What it does                                                           |
| ------------------------------------------ | ---------------------------------------------------------------------- |
| `pnpm dev`                                 | Web (:3000) and api (:3001) in watch mode through Turbo (never cached) |
| `pnpm services:up`                         | Start the dev services and wait until the bucket exists                |
| `pnpm services:down`                       | Stop the dev services, keep the data                                   |
| `pnpm services:reset`                      | Stop the dev services and delete their volumes                         |
| `pnpm db:migrate`                          | Apply the committed migrations (`prisma migrate deploy`)               |
| `pnpm db:migrate:dev`                      | Create and apply a new migration after a schema change (interactive)   |
| `pnpm build`                               | `turbo run build` in every package                                     |
| `pnpm lint`                                | `turbo run lint` (ESLint, shared config)                               |
| `pnpm typecheck`                           | `turbo run typecheck` (`tsc --noEmit`)                                 |
| `pnpm test`                                | `turbo run test` (Vitest, ESLint preset tests)                         |
| `pnpm format` / `pnpm format:check`        | Prettier write / check over the whole repo                             |
| `pnpm check:pins`                          | Fails on any `^`/`~` range or a dependency outside the catalog         |
| `pnpm check:name`                          | Product-name guard (see [Product name](#product-name))                 |
| `pnpm lint:root`                           | ESLint for the root config and `scripts/`                              |
| `pnpm test:root`                           | Tests for the name and pin guards (`node --test`)                      |
| `pnpm turbo run lint typecheck test build` | The full pipeline, the same tasks CI runs                              |
| `pnpm check:all`                           | Every check the required CI jobs run; use it before pushing            |
| `pnpm --filter @app/web lint:fsd`          | Steiger: FSD layers and slice boundaries in `apps/web`                 |
| `pnpm --filter @app/web storybook`         | Storybook for the UI kit on http://localhost:6006                      |
| `pnpm --filter @app/web build-storybook`   | Static Storybook build into `apps/web/storybook-static/`               |

## Checks

Before pushing, run `pnpm check:all`: every check the required CI jobs run (see
[CONTRIBUTING.md](CONTRIBUTING.md#local-checks) for the order). To run only the Turbo pipeline that
CI's `lint`, `typecheck`, `test` and `build` jobs share, use
`pnpm turbo run lint typecheck test build`; a second run with no changes is served from the Turbo
cache (`FULL TURBO`).

## Repository layout

| Path                      | Contents                                                                                           |
| ------------------------- | -------------------------------------------------------------------------------------------------- |
| `apps/web`                | Next.js 16 App Router web app, FSD layers, shadcn UI kit, Storybook ([README](apps/web/README.md)) |
| `apps/api`                | NestJS 12 api (ESM) with Prisma 7 and health endpoints ([README](apps/api/README.md))              |
| `packages/contracts`      | Shared zod schemas, compiled package `@app/contracts`                                              |
| `packages/config`         | ESLint presets (see its README), TS and Prettier config, `product.ts`                              |
| `scripts`                 | Repo tooling: pin check, name guard, PR hygiene, `apply-repo-rules.sh`                             |
| `.github`                 | CI and release workflows, rulesets as code, CODEOWNERS, PR template                                |
| `compose.yaml`, `docker/` | Dev services (Postgres, Redis, SeaweedFS) and the Postgres init SQL                                |
| `.coderabbit.yaml`        | CodeRabbit config: the AI first-pass review (Russian, never approves)                              |

## Dependency rules

- One catalog in `pnpm-workspace.yaml` holds every version. Versions are exact (no `^` or `~`), and
  packages refer to them with `catalog:`; internal packages use `workspace:*`.
- `minimumReleaseAge` is 14 days (20160 minutes, never less): pnpm refuses any release younger
  than that, transitive ones included. `minimumReleaseAgeExclude` is not allowed. For an urgent
  security fix that cannot wait, the lead changes `scripts/check-pins.mjs` and the workspace file
  together in a reviewed PR, and reverts both once the release ages out. A pin that is too young
  fails the install with `ERR_PNPM_NO_MATURE_MATCHING_VERSION`; the fix is the newest version
  older than 14 days, never an exclusion.
- Overrides (`overrides:`, `pnpm.overrides`, `resolutions`) may only pin exact versions, for
  example to bump a vulnerable transitive dependency. `packageExtensions`, `patchedDependencies`,
  named `catalogs`, pnpmfile hooks, `configDependencies`, `include` and
  `dangerouslyAllowAllBuilds` are not allowed.
- `pnpm-workspace.yaml` may hold only the top-level keys it has today (`packages`, `catalog`,
  `minimumReleaseAge`, `engineStrict`, `savePrefix`, `catalogMode`, `updateNotifier`) plus
  `overrides` and `allowBuilds`. Any other key fails until the guard's allowlist is extended in a
  reviewed PR.
- Build scripts: pnpm 12 runs a dependency's install scripts only when `allowBuilds:` in
  `pnpm-workspace.yaml` lists it `true`. A dependency with an install script that is not listed
  fails `pnpm install` with `ERR_PNPM_IGNORED_BUILDS`. List it `true` only when a feature needs
  the script (for example the Prisma engines download), otherwise `false`, and say why in the PR.
  Entries are bare package names mapped to `true` or `false` (no versions, ranges or wildcards).
  `onlyBuiltDependencies` is ignored since pnpm 11 and fails the guard.
- `pnpm check:pins` enforces the rules above for the root and every package matched by the
  `packages:` globs. `pnpm-lock.yaml` is committed, and CI installs with
  `--frozen-lockfile --ignore-pnpmfile`, so no pnpmfile hook runs there even if one slips in.

## Product name

- The single source of the name is `packages/config/product.ts`, imported as `@app/config/product`
  (display name, slug, image name prefix). The apps import it at build time: `next build` bakes the
  display name into the web app's HTML and metadata. `release.yml` passes `PRODUCT_NAME` to the
  images as a build-arg and env var, but no app code reads it yet, so it does not change the UI;
  `PRODUCT_SLUG` is reserved locally (CI uses the repo variable for image names).
- The image name prefix holds no registry or owner: images are
  `ghcr.io/<repository owner>/<prefix>-{web,api}`. The `name-guard` CI check fails when the prefix
  differs from the repo variable `PRODUCT_SLUG` or, if that is unset, the repository name.
- Workflows never contain the name. `release.yml` derives image names from the repository
  (`ghcr.io/<owner>/<repo>-web`), and the optional repo variables `PRODUCT_SLUG` / `PRODUCT_NAME`
  override it.
- The `name-guard` CI check (`pnpm check:name`, `scripts/check-product-name.mjs`) fails when the
  name appears in any tracked file outside its allowlist: `packages/config/product.ts`, `README.md`,
  `.claude/CLAUDE.md`, `pnpm-lock.yaml` and `.planning/**`. Everywhere else, write "this project" or
  import the constant.

## Renaming the project

The product name lives in `packages/config/product.ts`. To rename the product, follow this
checklist:

1. Rename the GitHub repository (Settings → General).
2. Update `packages/config/product.ts`; the apps bake the name in from it at build time. Update the
   `PRODUCT_*` repo variables too, if they are set (they name the images, not the UI). Until this
   lands, `name-guard` fails, because the image prefix no longer matches the repository name.
3. In each clone, run `git remote set-url origin <new-url>`.
4. Run `pnpm check:name` and fix every hit.
5. Publish a test release and check that the images appear in GHCR under the new name.

## Branches, PRs and tickets

- Branch from `main` as `feat/UL-n-short-slug` or `fix/UL-n-short-slug`; `chore/` and `docs/`
  prefixes are also fine.
- Put the ticket key `UL-n` in the PR title. The tracker webhook moves the ticket: PR opened →
  IN_REVIEW, merged → DONE. For work without a ticket, add `[no-ticket]` to the title.
- PRs are squash-merged, and the PR title becomes the commit subject on `main`.
- Full workflow, review SLA and PR rules: [CONTRIBUTING.md](CONTRIBUTING.md).

## CI

`ci.yml` runs on every pull request and every push to `main`:

- Seven checks: `lint` (format, pins, root lint, ESLint), `typecheck`, `test`, `build`,
  `name-guard`, `steiger` (FSD lint of `apps/web`) and `storybook` (the Storybook build). These are
  the required checks in the ruleset (see below).
- CodeRabbit reviews every non-draft PR in Russian as the AI first pass. Answer or resolve its
  comments before asking a teammate; it never approves, so the human approval stays required.
- `pr-hygiene` only warns: a missing `UL-n` / `[no-ticket]` in the title, or more than 600 changed
  lines. It never blocks.
- Each job restores the local Turbo cache (`.turbo/cache`) through `actions/cache`, so unchanged
  packages are not rebuilt.

## Releases

1. Cut a release branch from `main` and push it:
   `git switch -c release/x.y origin/main && git push -u origin release/x.y`.
2. In GitHub → Releases, draft a new release targeting `release/x.y` with the tag `vx.y.0`.
3. Press **Publish**.

`release.yml` then pushes `ghcr.io/<owner>/<repo>-web` and `ghcr.io/<owner>/<repo>-api`, today
`ghcr.io/ulbi-project-group-12/planktonic-{web,api}`. Each image is tagged with the release tag
(`vx.y.0`), the bare version (`x.y.0`) and `sha-<short>`. There is no `latest` tag: a hotfix on an
older line would move it backwards, so deploys always name an explicit version (Phase 4).

- **Pre-releases** work the same way: tick "Set as a pre-release" and use a full semver tag such as
  `v0.2.0-rc.1`.
- **The source is checked first.** The `verify` job fails the run, and nothing is pushed, unless
  the tag is `vX.Y.Z` or `vX.Y.Z-<pre-release>` and the tagged commit is on `main` or on
  `release/X.Y` for the same `X.Y` (`v0.2.1` needs `main` or `release/0.2`). Once the rulesets
  are applied, only an org admin can create a `release/*` branch
  (`.github/rulesets/release-create.json`), and only a reviewed PR can change one, so a tag on a
  feature branch or an unmerged commit never becomes an image. Until then, any writer can push a
  `release/X.Y` branch, so check the branch before you publish.
- **Release tags are immutable** once the rulesets are applied (`.github/rulesets/tags.json`): a
  `v*` tag cannot be moved or deleted, except by an org admin.
- **A human publishes.** A release created by a workflow's `GITHUB_TOKEN` does not trigger
  `release.yml`, so publish in the UI or with `gh release create` and your own token.
- **Hotfix:** fix it in a PR to `main`, cherry-pick the commit to `release/x.y` through a PR, then
  publish `vx.y.1`.
- **Rollback:** redeploy the previous tag. Deploy is a stub until Phase 4 (server), so rollback
  arrives with it in Phase 4.
- **Never push images to GHCR from a laptop.** The first push must come from `release.yml`, or the
  package is not linked to the repository and the workflow loses push access.
- **Release branches are kept.** `release/x.y` is where hotfixes land, and once the rulesets are
  applied the `release` ruleset forbids deleting it. Its only bypass works through pull requests,
  and a pull request cannot delete a branch.
- **Test releases:** a pipeline test such as `v0.0.1-rc.1` from `release/0.0` is deleted together
  with its tag once the images are verified (`gh release delete v0.0.1-rc.1 --cleanup-tag --yes`;
  after the rulesets are applied, only an org admin can delete a `v*` tag). Once a `release/x.y`
  branch exists, leave it in place: the `release` ruleset forbids deleting it. The rc images stay in GHCR: they are private
  and free, and deleting them needs a token with `delete:packages`.

## Repository rules

The rules live as code in `.github/repo-settings.json` and `.github/rulesets/`, applied by
`scripts/apply-repo-rules.sh`. The repository is public, so GitHub enforces all of them (applied
2026-11-12; the script exits 0):

- **Merge settings:** squash is the only merge method, the PR title becomes the squash commit
  title, and branches are deleted on merge.
- **SHA-pinned actions:** required at the repository level, so GitHub rejects any action that is
  not pinned to a full commit SHA.
- **`main`:** changes land only through a pull request with green required checks and one
  approval, plus code-owner review on the paths in [CODEOWNERS](.github/CODEOWNERS). No force
  pushes, no deletion, linear history. A direct push is rejected (`GH013`), for the lead too.
- **Secret scanning and push protection:** on, so GitHub flags committed secrets and rejects a
  push that contains a known token format.
- **`release/*` and `v*` tags:** only an org admin creates a `release/*` branch; tags cannot be
  moved or deleted except by an org admin.

**Who approves.** The team is horizontal: every developer has write access through the org team
`devs`, so any teammate's approval counts. CODEOWNERS names the lead only on CI, repository rules,
tooling, root configs and the lockfile. The only bypass is an org admin, and only through a pull
request, except for `v*` tags and creating a `release/*` branch, which never go through a PR.

The pre-push hook and the `main-push-guard` workflow stay as a second line of defence (see
[CONTRIBUTING.md](CONTRIBUTING.md#protecting-main)).

The GitHub Free limit that still applies: Actions minutes come from the free allowance, and every
CI run bills the 7 required jobs (plus `pr-hygiene` on PRs).

## Planning

`.planning/` holds the GSD planning files (requirements, roadmap, phase plans). Only the lead
changes it on `main`; CODEOWNERS names the lead as its owner, and the `main` ruleset enforces it. GSD is
optional for everyone; see [CONTRIBUTING.md](CONTRIBUTING.md#gsd).
