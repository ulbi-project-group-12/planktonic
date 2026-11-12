---
phase: 01-repo-foundation-and-ci-cd-lead
verified: 2026-11-12T06:29:26Z
status: passed
score: 42/42 must-haves verified
covered_files:
  - ".claude/CLAUDE.md"
  - ".dockerignore"
  - ".editorconfig"
  - ".env.example"
  - ".gitattributes"
  - ".github/CODEOWNERS"
  - ".github/actions/setup/action.yml"
  - ".github/pull_request_template.md"
  - ".github/repo-settings.json"
  - ".github/rulesets/main.json"
  - ".github/rulesets/release-create.json"
  - ".github/rulesets/release.json"
  - ".github/rulesets/tags.json"
  - ".github/workflows/ci.yml"
  - ".github/workflows/main-push-guard.yml"
  - ".github/workflows/release.yml"
  - ".gitignore"
  - ".husky/pre-commit"
  - ".husky/pre-push"
  - ".nvmrc"
  - ".planning/phases/01-repo-foundation-and-ci-cd-lead/01-01-PLAN.md"
  - ".planning/phases/01-repo-foundation-and-ci-cd-lead/01-01-SUMMARY.md"
  - ".planning/phases/01-repo-foundation-and-ci-cd-lead/01-02-PLAN.md"
  - ".planning/phases/01-repo-foundation-and-ci-cd-lead/01-02-SUMMARY.md"
  - ".planning/phases/01-repo-foundation-and-ci-cd-lead/01-03-PLAN.md"
  - ".planning/phases/01-repo-foundation-and-ci-cd-lead/01-03-SUMMARY.md"
  - ".planning/phases/01-repo-foundation-and-ci-cd-lead/01-04-PLAN.md"
  - ".planning/phases/01-repo-foundation-and-ci-cd-lead/01-04-SUMMARY.md"
  - ".planning/phases/01-repo-foundation-and-ci-cd-lead/01-05-PLAN.md"
  - ".planning/phases/01-repo-foundation-and-ci-cd-lead/01-05-SUMMARY.md"
  - ".planning/phases/01-repo-foundation-and-ci-cd-lead/01-06-PLAN.md"
  - ".planning/phases/01-repo-foundation-and-ci-cd-lead/01-06-SUMMARY.md"
  - ".planning/phases/01-repo-foundation-and-ci-cd-lead/01-07-PLAN.md"
  - ".planning/phases/01-repo-foundation-and-ci-cd-lead/01-07-SUMMARY.md"
  - ".planning/phases/01-repo-foundation-and-ci-cd-lead/01-08-PLAN.md"
  - ".planning/phases/01-repo-foundation-and-ci-cd-lead/01-08-SUMMARY.md"
  - ".planning/phases/01-repo-foundation-and-ci-cd-lead/01-09-PLAN.md"
  - ".planning/phases/01-repo-foundation-and-ci-cd-lead/01-09-SUMMARY.md"
  - ".prettierignore"
  - "CONTRIBUTING.md"
  - "README.md"
  - "apps/api/Dockerfile"
  - "apps/api/README.md"
  - "apps/api/eslint.config.js"
  - "apps/api/package.json"
  - "apps/api/src/main.ts"
  - "apps/api/tsconfig.build.json"
  - "apps/api/tsconfig.json"
  - "apps/web/Dockerfile"
  - "apps/web/README.md"
  - "apps/web/eslint.config.js"
  - "apps/web/package.json"
  - "apps/web/src/main.ts"
  - "apps/web/tsconfig.build.json"
  - "apps/web/tsconfig.json"
  - "eslint.config.js"
  - "package.json"
  - "packages/config/README.md"
  - "packages/config/eslint.config.js"
  - "packages/config/eslint/base.js"
  - "packages/config/eslint/index.js"
  - "packages/config/eslint/nest.js"
  - "packages/config/eslint/next.js"
  - "packages/config/package.json"
  - "packages/config/prettier/index.js"
  - "packages/config/product.ts"
  - "packages/config/test/eslint-presets.test.js"
  - "packages/config/tsconfig.json"
  - "packages/config/tsconfig/base.json"
  - "packages/config/turbo.json"
  - "packages/contracts/eslint.config.js"
  - "packages/contracts/package.json"
  - "packages/contracts/src/index.ts"
  - "packages/contracts/src/ticket-key.test.ts"
  - "packages/contracts/src/ticket-key.ts"
  - "packages/contracts/tsconfig.build.json"
  - "packages/contracts/tsconfig.json"
  - "packages/contracts/vitest.config.ts"
  - "pnpm-lock.yaml"
  - "pnpm-workspace.yaml"
  - "scripts/apply-repo-rules.sh"
  - "scripts/check-pins.mjs"
  - "scripts/check-pins.test.mjs"
  - "scripts/check-product-name.mjs"
  - "scripts/check-product-name.test.mjs"
  - "scripts/pr-hygiene.sh"
  - "turbo.json"
covered_digest: "v4:sha256:28352f15840c1556cf2f6aba9e6a303b9c0331bd71f50efdbdf84caf775aa7c7"
behavior_unverified: 0
overrides_applied: 0
re_verification:
  previous_status: human_needed
  previous_score: "41/42 (1 present, behavior-unverified: SC5)"
  gaps_closed:
    - "G1: main accepts changes only through a PR with green checks. The 2026-11-08 override (GitHub Free + private, HTTP 403) is retired: the repo is public, the 4 rulesets are active, and a direct push by the lead to main was rejected (rule suite 5063143425)."
    - "SC5: release to GHCR in the republished repo. Release run 43168128460 on 6d63f36 succeeded, and GHCR planktonic-web and planktonic-api, linked to ulbi-project-group-12/planktonic, carry sha-6d63f36, v0.0.1-rc.1 and 0.0.1-rc.1 with no latest (01-UAT test 11, re-read live by the verifier)."
    - "Flagged prohibitions: the lead re-confirmed all 7 on the republished repo (01-UAT test 12)."
  gaps_remaining: []
  regressions: []
---

# Phase 1: Repo foundation and CI/CD (lead) Verification Report

**Phase Goal:** Anyone clones the repo and `pnpm install --frozen-lockfile && pnpm turbo run lint typecheck test build` passes. Every PR and push to `main` runs the same checks in CI, `main` accepts changes only through a PR with green checks, and publishing a GitHub Release builds the images and pushes them to GHCR. `apps/web` and `apps/api` are placeholders; the framework skeletons are Phase 1.1.
**Verified:** 2026-11-12T06:29:26Z
**Status:** passed
**Re-verification:** Yes, the third pass. It supersedes the 2026-11-08 report (the repo was republished on 2026-11-12) and the 2026-11-12T06:21Z pass, which ended `human_needed` with 41/42. Its two human items are now resolved by 01-UAT tests 11 and 12, and the verifier re-read both results live.

## What was verified, and where

- **Local tree:** branch `docs/UL-9-complete-phase-1` at `bf5a508`.
  - The full gate was run on a fresh clone of `9b1c369`.
  - The delta `07515a0..bf5a508` (`5f7b8fd`, `4cf1a0a`, `bf5a508`) was re-checked on its own. It touches `scripts/pr-hygiene.sh`, `.github/repo-settings.json`, `scripts/apply-repo-rules.sh`, `README.md` and `01-UAT.md`.
  - On that delta: `pnpm -s test:root` 51/51; `bash -n scripts/apply-repo-rules.sh` exit 0; `repo-settings.json` parses; `format:check` passes; `check:name` reports "101 tracked files clean".
  - Apply-script probe with a stub `gh`: exit 3 on the gap path, exit 0 on the success path.
  - `pr-hygiene.sh` prints both warnings and exits 0. The size warning now points to CONTRIBUTING.md, and no tracked file outside `.planning/` mentions PROCESS any more.
- **Live GitHub:** `ulbi-project-group-12/planktonic` is public, and `main` = `6d63f36`, the single squashed commit, authored by `2744130+soadap@users.noreply.github.com`. The local docs branch has not been pushed.
- **Archive:** `ulbi-project-group-12/planktonic-archive` (private) holds PRs #1 to #5, `release/0.0`, release run 42520726408 and GHCR `ulbigram-web` / `ulbigram-api`.

## Process note: MVP mode without a user-story goal (warning, carried over)

ROADMAP still marks Phase 1 `**Mode:** mvp`, and `user-story.validate` returns `false`. This is an infrastructure phase with no end-user story, so it is verified goal-backward as written. The developer-flow table below stands in for the User Flow Coverage section. Recommendation: drop `mode: mvp` from Phase 1 in ROADMAP.md.

## Developer Flow Coverage (derived from the goal)

| Step | Expected | Evidence | Status |
|------|----------|----------|--------|
| Clone | Fresh checkout works | `git clone` of `9b1c369` into scratch | VERIFIED |
| Install | `pnpm install --frozen-lockfile` passes | exit 0 (Node v26.13.0, pnpm 12.15.0) | VERIFIED |
| Pipeline | `pnpm turbo run lint typecheck test build` passes | `--force`: `Tasks: 15 successful, 15 total`, `0 cached`; Vitest 13/13; config preset tests 5/5 | VERIFIED |
| Push to main | CI runs and is green | Run 43163922742 (push, main @6d63f36): lint, typecheck, test, build, name-guard success; pr-hygiene skipped (PR-only) | VERIFIED |
| Merge | Only via a PR with green checks | Rulesets active; the lead's direct push `6d63f36 -> 5d6757f` was rejected by the `pull_request` and `required_status_checks` rules (rule suite 5063143425); main is still `6d63f36` | VERIFIED (live) |
| Open a PR | CI runs the same checks on the PR | `on: pull_request` with no filters; no PR exists yet in the new repo, so the live PR evidence comes from archive PR #1 | VERIFIED (config + archive) |
| Release | Publish, then images in GHCR | Run 43168128460 (release, `6d63f36`): verify, images (web), images (api), deploy = success. GHCR `planktonic-web` and `planktonic-api` are linked to `ulbi-project-group-12/planktonic` and tagged `sha-6d63f36,v0.0.1-rc.1,0.0.1-rc.1` | VERIFIED (live) |
| Outcome | Placeholders only | 0 framework deps in apps manifests or the lockfile; both apps print the Phase 1.1 note | VERIFIED |

## Goal Achievement

### Observable Truths

**Roadmap success criteria (the contract)**

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| SC1 | Clean clone with Node 26.13.0 + pnpm 12.15.0: frozen install and pipeline pass; every dep exact-pinned, at least ~14 days old; lockfile committed | VERIFIED | Clone of `9b1c369`: install exit 0, turbo 15/15, 0 cached. The delta changes no manifest, lockfile or workspace file. `check:pins`: "17 catalog entries OK", "5 manifests OK". Registry scan of **all 226 lockfile packages** (both lockfile documents): newest is ignore@7.0.14 at 2026-10-23T23:24Z, 0 lookup errors. `pnpm-lock.yaml` is tracked |
| SC2 | `ci.yml` runs on every PR and push to main (frozen install, then lint/typecheck/test/build via Turbo with caching) and is green on main | VERIFIED | `on: pull_request` + `push: branches [main]`, no path filters; composite setup does a frozen install and caches `.turbo/cache`. Run 43163922742 on main @6d63f36: 5 required jobs success. (The separate `main-push-guard` workflow is red on that commit by design, see Warnings) |
| SC3 | `main` protected by a ruleset (PR required, CI checks required, squash, no force-push, no deletion) or the exact gap reported; CODEOWNERS puts @soadap on `.planning/`, `.github/`, root configs | VERIFIED (live, via the primary branch of the SC) | `GET rulesets`: main, release, release-create, release-tags, all `enforcement: active`. `GET rules/branches/main`: deletion, non_fast_forward, required_linear_history, pull_request (1 approval, code-owner review, thread resolution, `allowed_merge_methods: [squash]`), required_status_checks (lint, typecheck, test, build, name-guard, integration 15368). Committed JSON equals live for all 4 rulesets, except fields the server adds with default values. CODEOWNERS owns `/.planning/`, `/.github/`, `/.husky/`, `/.claude/`, `/scripts/`, `/packages/config/`, root configs, `apps/*/eslint.config.js` and the lockfile; `GET codeowners/errors` returns 0 |
| SC4 | New PR pre-filled with the template (UL-n, "Done when…", test notes); branch naming and UL-n rules in README and CONTRIBUTING | VERIFIED | `.github/pull_request_template.md` is on the new default branch (contents API) with `UL-`, `## Done when…`, `## How to test`, `## Review rules`. The pre-fill mechanism (standard path on the default branch) was confirmed by the lead in 01-UAT test 9. README "Branches, PRs and tickets" and CONTRIBUTING "Workflow" / "Commits and PR titles" document `feat/UL-n-…`, `fix/UL-n-…`, `[no-ticket]` |
| SC5 | Publishing a Release runs `release.yml` and pushes web + api to `ghcr.io/ulbi-project-group-12/planktonic-{web,api}:<tag>`; deploy is a marked stub; release process documented | VERIFIED (live, new repo) | `gh run view 43168128460`: workflow `release`, event `release`, head `6d63f36`, conclusion success; jobs verify, images (api), images (web), deploy all success. `GET orgs/…/packages/container/planktonic-web` and `planktonic-api`: both exist, private, linked to `ulbi-project-group-12/planktonic`, with tags `sha-6d63f36,v0.0.1-rc.1,0.0.1-rc.1` and no `latest`. The test release and tag are gone (`releases` 0, `tags` 0), as README "Test releases" requires. The trigger is `release: types [published]` only; the deploy job is `TODO(Phase 4)`, echo only; README "Releases" documents cut `release/x.y`, Publish, hotfix, rollback and cleanup. 01-UAT test 11 records the lead approving the test release |
| G1 | Goal clause: `main` accepts changes **only** through a PR with green checks | VERIFIED (live; previously PASSED by override) | Rule suite 5063143425, 2026-11-11T23:49:52-06:00: actor soadap pushed refs/heads/main `6d63f36 -> 5d6757f`, result `fail`. `pull_request`: "Changes must be made through a pull request." `required_status_checks`: "5 of 5 required status checks are expected." The ref did not move. The only bypass is `OrganizationAdmin` / `pull_request`, and the org has 1 admin (soadap). Residual: that admin can merge his own PR without approval or green checks; this was accepted in D-31, see Warnings |

**Plan must-haves (merged; 01-06 T3 and 01-09 T1 deduplicated into SC1)**

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 01-01.1 | Frozen install succeeds against the committed lockfile | VERIFIED | Clean-clone install exit 0 |
| 01-01.2 | Every version defined once, bare, in the catalog; pnpm refuses releases younger than 14 days (ERR_PNPM_NO_MATURE_MATCHING_VERSION) | VERIFIED | `minimumReleaseAge: 20160`, `catalogMode: strict`, 17 bare x.y.z pins. **Probe:** `globals: 17.14.0` (published 2026-11-01), then `pnpm install` gives `ERR_PNPM_NO_MATURE_MATCHING_VERSION`, exit 1 |
| 01-01.3 | Node outside `>=26.13.0 <27` fails with ERR_PNPM_UNSUPPORTED_ENGINE | VERIFIED | **Probe:** `--config.node-version=25.9.0` gives `ERR_PNPM_UNSUPPORTED_ENGINE`, exit 1 |
| 01-01.4 | lint + typecheck use the shared TS 6.0.3 / ESLint 10 flat config and pass | VERIFIED | `base.json` nodenext/strict; every package's `eslint.config.js` consumes `@app/config/eslint`; tasks pass |
| 01-02.1 | `format:check` passes with the one shared Prettier config | VERIFIED | "All matched files use Prettier code style!" (also on `bf5a508`) |
| 01-02.2 | Pre-commit hook blocks a staged lint error; staged files only | VERIFIED | **Probe:** staged `export const x: any = 1;` in contracts src, then commit exit 1 (`@typescript-eslint/no-explicit-any`, "Reverting to original state"); HEAD unchanged |
| 01-02.3 | A range or off-catalog dependency fails `check:pins` | VERIFIED | `check-pins.test.mjs` is part of test:root (51/51 on `bf5a508`) and runs in the required `lint` job |
| 01-02.4 | `.env`/`.env.*` ignored; `.env.example` tracked, names only, incl. PRODUCT_NAME/PRODUCT_SLUG | VERIFIED | `.gitignore` has `.env*` and `!.env.example`; `.env.example` is the only env file tracked and holds 4 empty names |
| 01-03.1 | Name, slug, prefix defined once in `packages/config/product.ts`, exported as `@app/config/product` | VERIFIED | `PRODUCT_DISPLAY_NAME = 'planktonic'`, `PRODUCT_SLUG`, `PRODUCT_IMAGE_PREFIX = PRODUCT_SLUG` |
| 01-03.2 | `check:name` passes the real tree and fails with file:line on an any-case literal | VERIFIED | "101 tracked files clean" on `bf5a508`; guard test suite passes |
| 01-03.3 | Allowlist exact; nested docs/README.md not exempt | VERIFIED | Test passes; 0 hits for the name in `apps/`, `.github/workflows`, `.github/actions` |
| 01-03.4 | Guard fails closed (exit 2) on a missing or invalid source | VERIFIED | Fail-closed tests pass (51/51) |
| 01-04.1 | Real TicketKey zod schema, Vitest valid + invalid cases | VERIFIED | 13/13 pass |
| 01-04.2 | Builds to dist; validates at runtime in plain Node | VERIFIED | **Spot-check:** `dist/index.js`: `UL-12` true, `UL-01` false |
| 01-04.3 | Plain string not assignable to TicketKey | VERIFIED | `@ts-expect-error` in the test; typecheck passes |
| 01-04.4 | Typed ESLint fires on explicit any in src | VERIFIED | The hook probe hit exactly this rule on contracts src |
| 01-05.1 | api placeholder runs 4 tasks, prints name/version/PRODUCT_NAME (fallback) + NestJS Phase 1.1 note | VERIFIED | `PRODUCT_NAME=Acme APP_VERSION=1.2.3 node apps/api/dist/main.js` prints "@app/api 1.2.3 for Acme: placeholder, the NestJS skeleton arrives in Phase 1.1" |
| 01-05.2 | api image: root context, build-args only, uid 1000, only package.json + src | VERIFIED | Same structure as the web Dockerfile rebuilt and run today (row 01-06.2); built and pushed by release run 43168128460 |
| 01-05.3 | No NestJS in apps/api; no name literal; check:name green | VERIFIED | 0 framework deps; guard green |
| 01-06.1 | web placeholder runs 4 tasks and prints the Next.js note | VERIFIED | `node apps/web/dist/main.js` prints "@app/web dev for this project: placeholder, the Next.js skeleton arrives in Phase 1.1" |
| 01-06.2 | web image: same structure as api | VERIFIED | **Spot-check today:** `docker build` (root context, build-args) and `run` print "@app/web 9.9.9 for Acme…"; `id -u` gives 1000; `/app` holds only `package.json` and `src/main.ts`; `touch /app/src/x` gives Permission denied. The image was removed afterwards |
| 01-07.1 | PR + push run 5 separately named checks, no path filters, no matrix | VERIFIED | `ci.yml`; check names on main run 43163922742 match |
| 01-07.2 | Frozen install (pnpm from packageManager, Node from .nvmrc), store + Turbo cache; lint job runs format:check, check:pins, lint:root | VERIFIED | `action.yml`; lint job steps present |
| 01-07.3 | Third-party actions SHA-pinned with version comment; contents: read; PR concurrency cancel; per-job timeouts | VERIFIED | 8 distinct external actions, 0 without `@<40-hex> # v…`; `sha_pinning_required: true` live (and the release run passed under it); `timeout-minutes` on all 10 jobs across 3 workflows |
| 01-07.4 | Missing UL-n / [no-ticket] or more than 600 lines gives a non-blocking warning only | VERIFIED | Local run on `bf5a508`: both `::warning` lines, exit 0. Live evidence from archive PR #1's size warning; the delta changed only the comment and the warning's pointer text |
| 01-07.5 | Release pushes web + api to `ghcr.io/<owner>/<repo-or-PRODUCT_SLUG>-{app}` tagged tag/version/sha, names from the repo context | VERIFIED (live) | No repo variables are set, and the names resolved from the repo name to `planktonic-{web,api}` with all 3 tag types (run 43168128460). The archive run had resolved `ulbigram-*` from the old repo name, so the mechanism is shown under two names |
| 01-07.6 | Only the images job can write packages; deploy is a TODO(Phase 4) stub | VERIFIED | Top-level `permissions: {}`; `packages: write` only in `images`; deploy job success with echo-only steps |
| 01-08.1 | Squash only, auto-delete, PR_TITLE, applied and read back | VERIFIED (live, new repo) | `GET repos`: squash true, merge commit false, rebase false, delete_branch_on_merge true, title PR_TITLE. Since `4cf1a0a`, `repo-settings.json` also carries `security_and_analysis`, and live reads `secret_scanning: enabled` and `secret_scanning_push_protection: enabled` |
| 01-08.2 | main ruleset as code: PR (1 approval, code-owner review, resolved threads, squash only), 5 checks, no force-push or deletion, linear history | VERIFIED (live) | See SC3; committed equals live |
| 01-08.3 | One idempotent apply script; on Free + private it reports the exact 403 gap and exits 3 | VERIFIED | `bash -n` OK on `bf5a508`. **Probe** with a stub `gh` (no network): gap mode exits 3 with the GAP message and 0 ruleset writes; OK mode upserts by name and exits 0. Step 1 now also prints the two secret-scanning fields; the live state matches the lead's reported "Done: settings and rulesets applied." |
| 01-08.4 | Only bypass: OrganizationAdmin in pull_request mode on main | VERIFIED (live) | main and release: `OrganizationAdmin/pull_request`; `always` appears only on release-create and release-tags (D-31) |
| 01-08.5 | CODEOWNERS @soadap on .planning/.github/scripts/root configs; PR template pre-filled | VERIFIED | See SC3 and SC4. The team-owned commented lines were dropped by the lead (scope change, not a Phase 1 requirement) |
| 01-09.2 | README names the product, points at product.ts, has a 5-step Renaming checklist | VERIFIED (wording superseded) | The "working name ulbigram" wording was superseded by the rename to planktonic (archive PR #4). README "Product name" points at `packages/config/product.ts`; "Renaming the project" has the 5 D-36 steps |
| 01-09.3 | README documents the release process, the Node 26.13.0 exception and the plan gap | VERIFIED (gap clause superseded) | "Prerequisites" (D-29), "Releases". The 403 gap is closed, so README "Repository rules" correctly states the rules are enforced (`GH013`) and now lists secret scanning and push protection. Repeating the 403 text now would be false |
| 01-09.4 | README + CONTRIBUTING: branch naming, UL-n + [no-ticket], squash, review SLA, GSD optional, one-driver rule | VERIFIED | CONTRIBUTING "Workflow", "Commits and PR titles", "Review" (24 h / 48 h), "GSD" (one-driver rule) |
| 01-09.5 | Phase pushed with the gate green, no secrets, CODEOWNERS 0 errors | VERIFIED | New main has CI green; `git log -p --all` token/PEM/AWS/Slack/sk- regex finds 0 hits; `codeowners/errors` returns 0; secret scanning and push protection now enabled live |

**Score:** 42/42 truths verified (0 by override; 0 present-but-behavior-unverified)

### Prohibitions (ADR-550)

| Plan | Prohibition (must-NOT) | Tier | Enforcement | Evidence (re-run 2026-11-12) | Disposition |
|------|------------------------|------|-------------|------------------------------|-------------|
| 01-05 | No NestJS or framework code/deps in apps/api | test | none wired | 0 `@nestjs/`, `next`, `react`, `express`, `fastify` in apps manifests or lockfile package keys | flagged, resolved by human (01-UAT test 12) |
| 01-05 | No product name in apps/api or its Dockerfile | test | `name-guard` required check + tests | 0 hits; guard clean | verified (wired) |
| 01-06 | No Next.js/React/UI framework in apps/web | test | none wired | as above (the ESLint React/Next plugins live only in `packages/config` as lint presets) | flagged, resolved by human (01-UAT test 12) |
| 01-07 | No automatic release/deploy path | test | none wired | release.yml trigger is `release: [published]` only; run 43168128460 followed a lead-approved, human-published test release | flagged, resolved by human (01-UAT test 12) |
| 01-07 | No product name in any workflow or composite action | test | `name-guard` | 0 hits | verified (wired) |
| 01-08 | Executor must not change visibility, add collaborators/teams, Apps or webhooks | judgment | n/a | 0 direct and 0 outside collaborators, 0 hooks, 0 org app installations. Visibility, the `devs` push grant and secret scanning were the lead's own changes after execution | flagged, resolved by human (01-UAT test 12) |
| 01-08 | No ruleset bypass that permits direct push to main | test | none wired (live rule suite is evidence, not a test) | live main bypass is `OrganizationAdmin/pull_request` only; the direct push was rejected | flagged, resolved by human (01-UAT test 12) |
| 01-09 | Docs must not claim main is protected while the 403 persists | judgment | n/a | The 403 no longer persists and live protection is proven, so the branch docs are accurate | flagged, resolved by human (01-UAT test 12) |
| 01-09 | No secret printed, committed or pushed | test | GitHub secret scanning + push protection now enabled (platform, not a repo test) | history regex scan 0 hits; `.env.example` holds names only | flagged, resolved by human (01-UAT test 12) |

All 7 flagged prohibitions have explicit human resolution. The lead signed them off on 2026-11-08 (01-UAT test 10) and re-confirmed them on the republished repo (01-UAT test 12). None is silently absorbed into `passed`.

### Required Artifacts

`gsd-tools verify.artifacts`, all exit 0: 01-01 7/7, 01-02 5/5, 01-03 3/3, 01-04 5/5, 01-05 4/4, 01-06 3/3, 01-07 4/4, 01-08 6/6, 01-09 2/2. **39/39 pass.** The delta keeps the `contains` markers of `repo-settings.json` (`PR_TITLE`), `pr-hygiene.sh` (`::warning`) and the apply script (min_lines). Every artifact is consumed by a script, workflow or package. No ORPHANED or STUB artifacts; the placeholder apps are intentional (D-02, goal text).

These were added after the 11-08 report and are verified as wired: `.github/workflows/main-push-guard.yml` (it ran on main and opened issue #1, since closed), `.husky/pre-push`, and the `packages/config` ESLint presets with their test (`@app/config:test` 5/5).

### Key Link Verification

`gsd-tools verify.key-links`, all exit 0: 3/3, 3/3, 3/3, 3/3, 2/2, 2/2, 4/4, 3/3, 3/3. **26/26 WIRED.** The release.yml to `apps/${{ matrix.app }}/Dockerfile` link and the release.yml to repository-context link are now confirmed by the live run in the new repo. The apply script to `repo-settings.json` link now also carries `security_and_analysis`, and that is confirmed live.

### Data-Flow Trace (Level 4)

| Artifact | Data | Source | Real data | Status |
|----------|------|--------|-----------|--------|
| release.yml image name | `ghcr.io/<owner>/<slug>-<app>` | `github.repository_owner` + `vars.PRODUCT_SLUG \|\| repo name` (no vars set) | Real packages `planktonic-web` / `planktonic-api` linked to the new repo | FLOWING |
| name-guard `--expect-image-prefix` | repo-derived slug vs `PRODUCT_IMAGE_PREFIX` | same expression as release.yml | name-guard green on main, and the image names it predicts exist | FLOWING |
| apps/*/src/main.ts | PRODUCT_NAME / APP_VERSION | build-args to ENV | web image built today printed the build-arg values | FLOWING |
| repo-settings.json `security_and_analysis` | secret scanning + push protection | `gh api -X PATCH repos/$REPO --input` | live `enabled` / `enabled` | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| SC1 pipeline from a clean clone | clone, then `pnpm install --frozen-lockfile`, then `pnpm turbo run lint typecheck test build --force` | exit 0 / 15 of 15, 0 cached | PASS |
| Root checks on `bf5a508` | `test:root`, `format:check`, `check:name`, `bash -n apply-repo-rules.sh` | 51/51; all exit 0 | PASS |
| Release-age gate | young `globals 17.14.0`, then install | ERR_PNPM_NO_MATURE_MATCHING_VERSION | PASS |
| Engine-strict gate | `--config.node-version=25.9.0` | ERR_PNPM_UNSUPPORTED_ENGINE | PASS |
| Pre-commit blocks a lint error | commit a staged explicit `any` | exit 1, reverted | PASS |
| Apply script, both paths | stub `gh` in gap and ok modes, on `bf5a508` | exit 3 / exit 0 | PASS |
| pr-hygiene | `TITLE='feat: x' ADDITIONS=700 bash scripts/pr-hygiene.sh` | 2 warnings, exit 0, no PROCESS reference | PASS |
| web image | `docker build` + `run` | uid 1000, 2 files, read-only code, correct output | PASS |
| Built contracts | `import dist/index.js` | UL-12 true / UL-01 false | PASS |
| Release to GHCR, new repo | `gh run view 43168128460`; `gh api orgs/…/packages/container/planktonic-{web,api}[/versions]` | 4 jobs success; both packages linked to the repo, 3 tags, no latest | PASS |
| Live rules, settings, secret scanning | read-only `gh api` (rulesets, rules/branches/main, rule-suites, actions/permissions, repos) | facts in SC3, G1, 01-08.x | PASS |

All probes ran in scratch clones or read-only against the working tree and left nothing behind; the test image was removed. The verifier made no GitHub writes.

### Probe Execution

No `scripts/*/tests/probe-*.sh` exist and no plan declares one, so Step 7c does not apply. The ad-hoc probes above were run by the verifier.

### Requirements Coverage

All 21 phase IDs appear in at least one plan's `requirements:` field, and REQUIREMENTS.md maps exactly these 21 IDs to Phase 1. None is ORPHANED.

| Requirement | Plan(s) | Description | Status | Evidence |
|-------------|---------|-------------|--------|----------|
| TZ-FE-02 / TZ-BE-02 | 01-01, 01-04, 01-05/01-06 | typescript | SATISFIED | TS 6.0.3 pinned, shared base, typecheck in every package |
| TZ-FE-10 / TZ-BE-10 | 01-01 | Eslint | SATISFIED | Shared flat config (+ base/next/nest presets), required `lint` check |
| TZ-FE-11 / TZ-BE-11 | 01-02 | prettier | SATISFIED | `@app/config/prettier`, format:check in the lint job |
| TZ-FE-12 / TZ-BE-12 | 01-02 | husky | SATISFIED | Pre-commit probe blocked a lint error; pre-push guards main |
| TZ-FE-16 / TZ-BE-15 | 01-01, 01-06 | pnpm | SATISFIED | `packageManager: pnpm@12.15.0` + engines + engineStrict |
| TZ-BE-16 | 01-02, 01-03, 01-07 | Mandatory linting | SATISFIED | lint is a required check on every PR and push |
| TZ-FE-18 / TZ-BE-17 | 01-08, 01-09 | Mandatory code review for every task | SATISFIED (enforced live) | main ruleset: 1 approval + code-owner review + thread resolution, active. Exception by design (D-31): the single org admin can merge his own PR through the PR-mode bypass |
| TZ-FE-20 / TZ-BE-19 / TZ-CICD-02 | 01-07 | CI pipeline; lint/tests/build/typecheck on every PR | SATISFIED | ci.yml; green on main; required checks enforced |
| TZ-CICD-03 | 01-05, 01-06, 01-07, 01-09 | Releases via cut branch + release button | SATISFIED (build half live; deploy is Phase 4 per traceability) | Human-published test release ran release.yml and pushed both images (run 43168128460) |
| TZ-CICD-04 | 01-08, 01-09 | No direct push to trunk, only PR with review | SATISFIED (enforced live) | Rule suite 5063143425: the direct push was rejected |
| TZ-CICD-05 | 01-08, 01-09 | Trunk-based | SATISFIED | Squash only + auto-delete live; linear history rule |
| TZ-PROD-10 | 01-02, 01-07, 01-09 | .env local, GitHub secrets in CI, no secrets committed | SATISFIED | `.env*` ignored, names-only example, release uses `secrets.GITHUB_TOKEN`, history scan 0 hits, secret scanning + push protection enabled |
| TZ-PROCESS-06 | 01-01 to 01-06, 01-09 | Project init and base config | SATISFIED | Whole monorepo foundation |

**Traceability (info):** the stale rows TZ-FE-18, TZ-BE-17 and TZ-CICD-04 ("Partial — … enforcement blocked (403)") were set to Complete in `a02aad5`, committed after this verification started. That commit touches only `.planning/` docs, and the covered digest is unchanged.

### Decision Coverage

`check.decision-coverage-verify` with 01-CONTEXT.md: **36/36 decisions honored**, not_honored: [].

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| .github/workflows/release.yml | deploy job | `TODO(Phase 4)` | Info | Required by D-16 (the deploy stub is the deliverable); references a roadmap phase |
| apps/*/package.json | test script | `echo "no tests yet (Phase 1.1)"` | Info | Intentional placeholder (D-02, goal text) |

The dangling "PROCESS section 7" reference in `scripts/pr-hygiene.sh` reported in the previous pass is fixed (`5f7b8fd`). No TBD, FIXME or XXX in any tracked file outside `.planning/` and the lockfile; the debt-marker gate passes. No stub output reaches users. No Cyrillic text remains in any tracked file.

### Warnings (non-blocking)

1. **SUMMARY commit references exist only in the archive.** 46 of the 48 hex strings cited in the SUMMARYs resolve as commits in `planktonic-archive`; the other 2 (`8996bb58`, `b1934ee5`) are image digests. None exists in the new repo, which has one squashed commit `6d63f36`. This is expected from the republish, and the commit-count mismatch is not a gap.
2. **Live `main` docs are stale until the docs branch lands.** On `6d63f36`, README still says "`main` is **not** protected" and quotes the 403 text. The corrected text (and the secret-scanning bullet) is only on the unpushed branch `docs/UL-9-complete-phase-1`. It is stale in the safe direction, but land it through a PR.
3. **`main-push-guard` is red on `main` @6d63f36.** The seed commit was pushed directly before the rulesets existed. The guard correctly flagged it and opened issue #1 (now closed). The red check clears with the next merge.
4. **Admin bypass in PR mode.** With `OrganizationAdmin/pull_request`, the only org admin (the lead) can merge a PR without an approval or green checks. This is the accepted design in D-31 and in plan truth 01-08.4.
5. **Process:** ROADMAP `mode: mvp` with a goal that is not a user story (see top).

### Info

- The pipeline is now 15 tasks, not the 14 in 01-06's truth, because `@app/config` gained a `test` task (ESLint preset tests). This is a superset.
- The rc images `planktonic-{web,api}:v0.0.1-rc.1` stay in GHCR, private, as README "Test releases" describes. The test release and its tag were deleted.

### Human Verification Required

None open. Both items from the previous pass are resolved:

1. **First release in the republished repository (SC5).** Resolved by 01-UAT test 11, and the verifier re-read the result live: run 43168128460 succeeded, both packages are linked to the new repo with the 3 expected tags and no `latest`, and the release and tag were cleaned up.
2. **Re-confirm the 7 flagged prohibitions.** Resolved by 01-UAT test 12 (lead).

### Gaps Summary

No gaps, no blockers, no open human items. Every roadmap success criterion, the goal clause G1 and all 36 merged plan must-haves are backed by code and by live evidence in the republished repository:

- A clean clone passes the frozen install and the 15-task pipeline.
- CI is green on `main`.
- `main` rejects direct pushes, the lead's included.
- A human-published release built and pushed `planktonic-web` and `planktonic-api` to GHCR.

What remains are the 5 non-blocking warnings above. The most actionable is landing `docs/UL-9-complete-phase-1` so the docs on `main` match the enforced rules.

---

_Verified: 2026-11-12T06:29:26Z_
_Verifier: Claude (gsd-verifier)_
