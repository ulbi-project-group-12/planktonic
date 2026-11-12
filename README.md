# planktonic

Welcome to planktonic, a Slack-like work messenger for development teams, built by
ulbi-project-group-12. Status: Phase 1 foundation (monorepo, CI, release pipeline).
`apps/web` and `apps/api` are placeholders until the team skeletons land in Phase 1.1.

## Prerequisites

- **Node 26.13.0**, the version in `.nvmrc` (`nvm use` or `fnm use`). This is a documented exception
  to the 14-day rule (D-29): it is the only Node 26 LTS release and comes from nodejs.org, not npm.
- **pnpm 12.15.0**. Node 26 does not bundle corepack, so install it with npm:

  ```sh
  npm i -g pnpm@12.15.0
  ```

  The alternative is the official standalone installer with `PNPM_VERSION=12.15.0` set. Any pnpm 12
  switches itself to the `packageManager` version in `package.json`.

- **Docker** is optional. You only need it to build the app images locally.

## Quick start

```sh
git clone https://github.com/ulbi-project-group-12/planktonic.git
cd planktonic
pnpm install --frozen-lockfile
pnpm turbo run lint typecheck test build
```

The last command should end with `Tasks: 15 successful, 15 total`. A second run is served from the
Turbo cache (`FULL TURBO`). The install also enables the husky pre-commit hook.

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
  together in a reviewed PR, and reverts both once the release ages out.
- Overrides (`overrides:`, `pnpm.overrides`, `resolutions`) may only pin exact versions, for
  example to bump a vulnerable transitive dependency. `packageExtensions`, `patchedDependencies`,
  named `catalogs`, pnpmfile hooks, `configDependencies`, `include` and
  `dangerouslyAllowAllBuilds` are not allowed.
- `pnpm-workspace.yaml` may hold only the top-level keys it has today (`packages`, `catalog`,
  `minimumReleaseAge`, `engineStrict`, `savePrefix`, `catalogMode`, `updateNotifier`) plus
  `overrides`. Any other key fails until the guard's allowlist is extended in a reviewed PR.
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
  after the rulesets are applied, only an org admin can delete a `v*` tag). The test branch
  `release/0.0` may be deleted (`git push origin --delete release/0.0`) **only while the rulesets
  are not applied yet**. After that, leave it in place. The rc images stay in GHCR: they are private
  and free, and deleting them needs a token with `delete:packages`.

## Repository rules and the GitHub Free gap

The rules live as code in `.github/repo-settings.json` and `.github/rulesets/`, applied by
`scripts/apply-repo-rules.sh`.

**Applied now:** merge settings. Squash is the only merge method, the PR title becomes the squash
commit title, and branches are deleted on merge.

**Not applied yet (lead action):** requiring SHA-pinned actions at the repository level. The
workflows already pin every action by SHA, but GitHub does not enforce it. To apply it, the lead
runs `scripts/apply-repo-rules.sh` without `SKIP_SHA_PINNING`.

**Blocked while the repository is private on GitHub Free.** The rulesets API answers HTTP 403:
`Upgrade to GitHub Pro or make this repository public to enable this feature.` So, today:

- `main` is **not** protected: no ruleset and no branch protection, so GitHub does not block a
  direct push.
- Required reviews, CODEOWNERS review and required checks are **not enforced**. CODEOWNERS only
  suggests reviewers. A PR could even weaken `scripts/check-product-name.mjs` and still pass
  `name-guard`, so until rulesets apply, reviewers must check every change to `scripts/` and
  `.github/` by hand.
- Environments (needed for the Phase 4 deploy) are available only on public repositories on Free.
- Secret scanning and push protection are unavailable.
- Actions minutes are limited to the $12/month allowance, and every CI run bills the 5 required
  jobs (plus `pr-hygiene` on PRs).

**How to close the gap:** making the repository public (the lead's call) unlocks all of the above.
Then run `scripts/apply-repo-rules.sh`, which must exit 0, and confirm that a direct push to `main`
is rejected. Once applied, the only bypass is an org admin, and only through a pull request. The
exceptions are `v*` tags and creating a `release/*` branch, which never go through a PR, so there
the admin bypass always applies.
Teammates need write access to the repository before their approvals count.

## Planning

`.planning/` holds the GSD planning files (requirements, roadmap, phase plans). Only the lead
changes it on `main`; CODEOWNERS names the lead as its owner, enforced once rulesets apply. GSD is
optional for everyone; see [CONTRIBUTING.md](CONTRIBUTING.md#gsd).
