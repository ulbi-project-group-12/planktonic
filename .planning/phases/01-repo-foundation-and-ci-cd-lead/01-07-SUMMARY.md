---
phase: 01-repo-foundation-and-ci-cd-lead
plan: 07
subsystem: ci-cd
tags: [github-actions, ci, release, ghcr, docker, supply-chain, sc2, sc5]
status: complete

requires:
  - phase: 01-01
    provides: pnpm workspace + packageManager/.nvmrc pins, Turbo pipeline
  - phase: 01-02
    provides: format:check, check:pins, lint:root scripts and the husky gate (HUSKY=0 in CI)
  - phase: 01-03
    provides: name guard (scripts/check-product-name.mjs) and its node:test suite
  - phase: 01-04
    provides: "@app/contracts with real test and build tasks"
  - phase: 01-05
    provides: apps/api/Dockerfile with APP_VERSION and PRODUCT_NAME build-args
  - phase: 01-06
    provides: apps/web/Dockerfile, structurally identical to api
provides:
  - ".github/actions/setup: composite (pnpm/action-setup from packageManager, setup-node from .nvmrc with pnpm cache, frozen install, Turbo local cache)"
  - ".github/workflows/ci.yml: required jobs lint, typecheck, test, build, name-guard on every PR and push to main, plus non-required pr-hygiene"
  - "scripts/pr-hygiene.sh: non-blocking UL-n title and >600-line size warnings"
  - ".github/workflows/release.yml: release published -> ghcr.io/<owner>/<slug>-{web,api}, deploy TODO(Phase 4) stub"
affects: [01-08, 01-09, phase-4]

actuals:
  tokens: 2510
  tasks: 3
  commits: 3
plan_head_before: aa1f47cf5868f984ccc74049d916483e7afb93a6
plan_head_after: afd8df66cdc26ce37220164ca3c2d07243526c10

tech-stack:
  added:
    - "GitHub Actions (SHA-pinned): actions/checkout v7.0.1, actions/setup-node v7.1.0, actions/cache v6.1.0, pnpm/action-setup v6.1.0, docker/setup-buildx-action v4.4.1, docker/login-action v4.7.0, docker/metadata-action v6.2.0, docker/build-push-action v7.4.0"
  patterns:
    - "Every pnpm CI job is checkout (persist-credentials: false) + uses: ./.github/actions/setup + one command; required jobs have stable name: equal to their id and no matrix"
    - "Untrusted event fields (PR title, counts) reach shell only through step env; workflow names derive from github.repository_owner and vars.PRODUCT_SLUG || github.event.repository.name"

key-files:
  created:
    - .github/actions/setup/action.yml
    - .github/workflows/ci.yml
    - .github/workflows/release.yml
    - scripts/pr-hygiene.sh
  modified: []

key-decisions:
  - "All 8 action pins were re-resolved against GitHub (git/ref/tags, annotated tag dereferenced for pnpm/action-setup) before use; all matched the RESEARCH table"
  - "release.yml names step validates the owner as well as the slug, and rejects a multi-line vars.PRODUCT_NAME so it cannot inject extra GITHUB_OUTPUT keys"
  - "pr-hygiene.sh adds counts with 10# so leading-zero values are decimal, not octal errors"

requirements-completed: []

metrics:
  duration: 4min
  completed: 2026-11-08
---

# Phase 1 Plan 07: CI and release workflows Summary

**CI now runs five separately named required checks on every PR and every push to `main`: `lint`, `typecheck`, `test`, `build` and `name-guard`. They share one composite setup with a frozen install and a Turbo cache. A human-published GitHub Release builds the web and api images and pushes them to `ghcr.io/<owner>/<repo>-{web,api}`, with names taken from the repository context. Every action is pinned to a commit SHA that I checked against GitHub, and actionlint reports nothing on either workflow.**

## Performance

- **Duration:** about 4 min
- **Completed:** 2026-11-08
- **Tasks:** 3 of 3
- **Files:** 4 created, 271 lines

## Accomplishments

- **Composite setup** (`.github/actions/setup/action.yml`) runs four steps in order:
  1. pnpm/action-setup with no `version` input, so it reads `packageManager`.
  2. setup-node with `node-version-file: .nvmrc` and `cache: pnpm`. It comes after pnpm is on PATH.
  3. `pnpm install --frozen-lockfile`.
  4. actions/cache on `.turbo/cache`, with key `turbo-<os>-<job>-<sha>` and a prefix restore key.
- **ci.yml** setup:
  - `on: pull_request` with no path filters, plus `push` to `main`.
  - `permissions: contents: read`.
  - Concurrency cancels superseded PR runs only.
  - `HUSKY=0` and `TURBO_TELEMETRY_DISABLED=1`.
  - Each job has `runs-on: ubuntu-24.04`, a timeout, and `persist-credentials: false` on every checkout (6 in total).
- **ci.yml jobs:**
  - `lint` runs `format:check`, `check:pins`, `lint:root` and `turbo run lint`.
  - `typecheck`, `test` and `build` each run their Turbo task.
  - `name-guard` uses plain Node from `.nvmrc` with no install. It runs the guard and its TAP test suite.
- **pr-hygiene:**
  - `scripts/pr-hygiene.sh` (mode 100755) warns when the title has neither `UL-n` nor `[no-ticket]`, and when the PR changes more than 600 lines. It always exits 0.
  - The job runs only on `pull_request`. It takes the title and line counts through step env only, and it is not a required check.
- **release.yml:**
  - Triggers: `release: published` only. Top-level `permissions: {}`. Concurrency is keyed on the tag and never cancels.
  - The `images` matrix (web, api) is the only job with `packages: write`.
  - The `names` step builds `ghcr.io/<owner>/<slug>-<app>` from `github.repository_owner` and `vars.PRODUCT_SLUG || github.event.repository.name`. It lowercases and validates both parts.
  - Tags: the release tag (`type=raw`), the bare version (`type=semver`), `sha-<short>`, and `latest` for stable releases only (`latest=auto`).
  - Build-args: `APP_VERSION` gets the release tag. `PRODUCT_NAME` gets `vars.PRODUCT_NAME` or the repo name.
  - BuildKit uses a `gha` cache per app.
  - `deploy` (`needs: images`, `permissions: {}`) is a `TODO(Phase 4)` stub that only echoes the four planned steps.

## Task Commits

1. **Task 1 (tracer): CI workflow with five required jobs and shared setup.** `7f6db68`
2. **Task 2: non-blocking PR hygiene warnings.** `d815526`
3. **Task 3: release workflow to GHCR with a deploy stub.** `afd8df6`

All three commits went through the live husky/lint-staged hook (prettier on the YAML). None used `--no-verify`.

## Verification Evidence

- **Action pins:** each of the 8 tags was re-resolved with `gh api repos/<a>/git/ref/tags/<v>`. For pnpm/action-setup v6.1.0 I dereferenced the annotated tag. All 8 SHAs match the plan exactly.
- **actionlint** (`rhysd/actionlint@sha256:b1934ee5…`, 1.7.12): exit 0 on both workflows after each task and on the final tree. The image also shellchecks the `run:` blocks.
- **Task 1 static checks:** all five job names are present. Every non-local `uses:` is SHA-pinned. The composite has 3 version-commented pins. ci.yml has no `paths`/`paths-ignore` or `pull_request_target`, has `contents: read`, 5 `persist-credentials: false` (6 after Task 2) and 5 `timeout-minutes` (6 after Task 2). `pnpm check:name` and `pnpm format:check` are green.
- **Task 1 clean-clone replay (tracer gate, auto mode, run after the commit):** I cloned `gsd/phase-01-repo-foundation-and-ci-cd-lead` at `7f6db68` and ran with `CI=true HUSKY=0`. All of these passed:
  - frozen install
  - `format:check`
  - `check:pins` (5 manifests OK)
  - `lint:root`
  - the guard (45 tracked files clean)
  - the guard tests (`# tests 10`, `# pass 10`, `# fail 0`)
  - `Tasks: 14 successful, 14 total`

  Overall rc was 0. A Node `EPIPE` trace was printed because `grep -qx '# fail 0'` exits on its first match and closes the pipe while the TAP tail is still being written. It is harmless, since the pipeline status is grep's, but it is noisy in the plan's verify command.
- **Task 2:** shellcheck is clean.
  - The bad PR (`chore: tweak`, 550+100) gets both warnings, including `This PR changes 650 lines`.
  - The `UL-12` title and the `[no-ticket]` title print nothing.
  - The injection probe `TITLE='$(touch <marker>)'` with junk counts exits 0 and creates no marker.
  - Leading-zero counts (`08`, `09`) do not error.
  - The PR title appears in ci.yml only on the single `TITLE:` step-env line.
- **Task 3 structural checks:** all passed.
  - `types: [published]` and top-level `permissions: {}`.
  - `packages: write` inside `images` and absent from `deploy`.
  - Names come from `github.event.repository.name` and `github.repository_owner`, with the `vars.PRODUCT_SLUG` override.
  - `TODO(Phase 4)` and `needs: images` are present.
  - All three tag rules are present.
  - There is no `gh release create`, no `workflow_run` and no push trigger.
- **Task 3 local images:** both Dockerfiles built with `APP_VERSION=v0.0.1-rc.1 PRODUCT_NAME=acme`.
  - web printed `@app/web v0.0.1-rc.1 for acme: placeholder, the Next.js skeleton arrives in Phase 1.1`.
  - api printed `@app/api v0.0.1-rc.1 for acme: placeholder, the NestJS skeleton arrives in Phase 1.1`.
  - I removed both `local/*:rc` images afterwards.
- **Task 3 `names` step, run locally under bash:**
  - `Acme-Org` / `Some-Repo` gives `image=ghcr.io/acme-org/some-repo-web`.
  - `bad_slug` fails with `::error::`.
  - A two-line `PRODUCT` fails with `::error::` and writes nothing to `GITHUB_OUTPUT`.

## Decisions Made

- I re-checked the pins against GitHub before using them. The 14-day choice (pnpm/action-setup v6.1.0, login-action v4.7.0) stays as RESEARCH decided it.
- The `names` step also validates the owner and rejects a multi-line `PRODUCT_NAME`. Writing `product=<value>` to `$GITHUB_OUTPUT` with an embedded newline would let a bad repo variable add arbitrary output keys, such as a different `image`.
- The `pr-hygiene` timeout is 3 minutes, as the plan says. The RESEARCH sketch had 2.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Security] Multi-line PRODUCT_NAME and owner validation in release.yml `names` step**
- **Found during:** Task 3
- **Issue:** The plan validates only the slug. `product=${PRODUCT}` written to `$GITHUB_OUTPUT` with a newline in `vars.PRODUCT_NAME` could inject extra step outputs, including `image`.
- **Fix:** The step now fails with `::error::` when `PRODUCT` contains CR or LF, and when the lowercased owner is not `[a-z0-9-]+`. The output is written in a single grouped redirect.
- **Files modified:** `.github/workflows/release.yml`
- **Commit:** `afd8df6`

**2. [Rule 1 - Bug] Octal parsing of leading-zero counts in pr-hygiene.sh**
- **Found during:** Task 2
- **Issue:** Bash arithmetic treats `08` as invalid octal, which would print an error. GitHub never sends leading zeros, but the script promises to treat junk as 0 without failing.
- **Fix:** Added with the `10#` prefix after the `^[0-9]+$` check.
- **Files modified:** `scripts/pr-hygiene.sh`
- **Commit:** `d815526`

Otherwise the plan was executed as written.

## Requirements

No requirement IDs are ticked by this plan. Every open requirement in its list can only be proven on GitHub:

| Req | State | Why it stays open / what closes it |
|-----|-------|------------------------------------|
| TZ-CICD-02 | open | The workflow exists and was replayed locally. It needs the jobs green on a real PR and on `main` (01-09, after push). |
| TZ-FE-20 / TZ-BE-19 | open | "Mandatory CI" needs the checks required by the ruleset (01-08) and green on GitHub (01-09). |
| TZ-CICD-03 | open | Needs the test release `v0.0.1-rc.1` published from `release/0.0` after merge, with images present in GHCR (01-09, D-32, Pitfall 7). |
| TZ-BE-16 | already ticked | Ticked earlier (01-02). Its CI half, the `lint` job, now exists. |
| TZ-PROD-10 | already ticked | Ticked earlier. The workflows use only `secrets.GITHUB_TOKEN`, with no stored secrets. |

## Known Stubs

| File | Line | Reason |
|------|------|--------|
| `.github/workflows/release.yml` | `deploy` job | An intentional `TODO(Phase 4)` deploy stub (D-16). There is no server until Phase 4, so the job only echoes the planned steps. Phase 4 replaces it. |

## Threat Flags

None. The only surfaces this plan adds are the ones in its threat model:
- T-01-17: SHA pins.
- T-01-18: env-only title.
- T-01-19: token scopes.
- T-01-20: `persist-credentials: false`.
- T-01-21: cache keys.
- T-01-22: concurrency, timeouts, and no install in `name-guard`/`pr-hygiene`.
- T-01-25: slug validation, now also owner and single-line product.

## Next Phase Readiness

- **01-08 (ruleset):**
  - The required status contexts are exactly `lint`, `typecheck`, `test`, `build` and `name-guard`, from the GitHub Actions app (`integration_id: 15368`).
  - `pr-hygiene` must not be required.
  - A job rename must change `.github/rulesets/main.json` in the same PR.
- **01-09 (push + GitHub-side proof):**
  - Confirm the five checks and `pr-hygiene` on the phase PR, and the five checks on `main` after the squash merge.
  - Then cut `release/0.0` from `main` and publish `v0.0.1-rc.1` as a pre-release from the UI.
  - Expect `ghcr.io/ulbi-project-group-12/<repo>-{web,api}` with tags `v0.0.1-rc.1`, `0.0.1-rc.1`, `sha-<7>` and no `latest`.
  - If `type=gha` caching misbehaves, drop cache-from/to (A14).
- The release images are the first GHCR push, so they link the packages to the repo (Pitfall 6). Nobody should push these image names from a laptop first.

## Self-Check: PASSED

- All 4 created files exist on disk.
- All 3 task commits are ancestors of HEAD: `7f6db68`, `d815526`, `afd8df6`.
- `commits: 3` was measured with `git rev-list --count aa1f47c..afd8df6`.
