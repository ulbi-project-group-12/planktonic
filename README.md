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

## Scripts

| Script                                     | What it does                                                   |
| ------------------------------------------ | -------------------------------------------------------------- |
| `pnpm build`                               | `turbo run build` in every package                             |
| `pnpm lint`                                | `turbo run lint` (ESLint, shared config)                       |
| `pnpm typecheck`                           | `turbo run typecheck` (`tsc --noEmit`)                         |
| `pnpm test`                                | `turbo run test` (Vitest, ESLint preset tests)                 |
| `pnpm format` / `pnpm format:check`        | Prettier write / check over the whole repo                     |
| `pnpm check:pins`                          | Fails on any `^`/`~` range or a dependency outside the catalog |
| `pnpm check:name`                          | Product-name guard (see [Product name](#product-name))         |
| `pnpm lint:root`                           | ESLint for the root config and `scripts/`                      |
| `pnpm test:root`                           | Tests for the name and pin guards (`node --test`)              |
| `pnpm turbo run lint typecheck test build` | The full pipeline, the same tasks CI runs                      |
| `pnpm check:all`                           | Every check the required CI jobs run; use it before pushing    |

## Checks

Before pushing, run `pnpm check:all`: every check the required CI jobs run (see
[CONTRIBUTING.md](CONTRIBUTING.md#local-checks) for the order). To run only the Turbo pipeline that
CI's `lint`, `typecheck`, `test` and `build` jobs share, use
`pnpm turbo run lint typecheck test build`; a second run with no changes is served from the Turbo
cache (`FULL TURBO`).

## Repository layout

| Path                 | Contents                                                               |
| -------------------- | ---------------------------------------------------------------------- |
| `apps/web`           | Web app (placeholder; Next.js skeleton in Phase 1.1) + Dockerfile      |
| `apps/api`           | API (placeholder; NestJS skeleton in Phase 1.1) + Dockerfile           |
| `packages/contracts` | Shared zod schemas, compiled package `@app/contracts`                  |
| `packages/config`    | ESLint presets (see its README), TS and Prettier config, `product.ts`  |
| `scripts`            | Repo tooling: pin check, name guard, PR hygiene, `apply-repo-rules.sh` |
| `.github`            | CI and release workflows, rulesets as code, CODEOWNERS, PR template    |

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
  (display name, slug, image name prefix). Apps read the `PRODUCT_NAME` / `PRODUCT_SLUG` env vars,
  which only override those defaults (see `.env.example`).
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
2. Update `packages/config/product.ts` and the `PRODUCT_*` env values (and the `PRODUCT_*` repo
   variables, if they are set). Until this lands, `name-guard` fails, because the image prefix no
   longer matches the repository name.
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

- Five checks: `lint` (format, pins, root lint, ESLint), `typecheck`, `test`, `build` and
  `name-guard`. These are the required checks in the ruleset (see below).
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
CI run bills the 5 required jobs (plus `pr-hygiene` on PRs).

## Planning

`.planning/` holds the GSD planning files (requirements, roadmap, phase plans). Only the lead
changes it on `main`; CODEOWNERS names the lead as its owner, and the `main` ruleset enforces it. GSD is
optional for everyone; see [CONTRIBUTING.md](CONTRIBUTING.md#gsd).
