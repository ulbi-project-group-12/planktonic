---
phase: 01-repo-foundation-and-ci-cd-lead
verified: 2026-11-12T06:21:03Z
status: human_needed
score: 41/42 must-haves verified (1 present, behavior-unverified in the republished repo)
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
covered_digest: "v4:sha256:2e57f13d82b03d1fdf0e8ffe418d8cc645157ddeba993f487e94018af1bcb05c"
behavior_unverified: 1
overrides_applied: 0
re_verification:
  previous_status: passed
  previous_score: "42/42 (1 by override: platform gap)"
  gaps_closed:
    - "G1: main accepts changes only through a PR with green checks. The 2026-11-08 override (GitHub Free + private, HTTP 403) is retired: the repo is public, the 4 rulesets are active, and a direct push by the lead to main was rejected (rule suite 5063143425)."
  gaps_remaining: []
  regressions: []
behavior_unverified_items:
  - truth: "SC5: publishing a GitHub Release runs release.yml, which builds the web and api images and pushes them to ghcr.io/ulbi-project-group-12/planktonic-{web,api}:<tag>"
    test: "In ulbi-project-group-12/planktonic, publish a test pre-release (e.g. tag v0.0.1-rc.1 targeting main, or a release/0.0 branch cut by the org admin), then watch the release workflow run."
    expected: "Jobs verify, images (web), images (api) and deploy all succeed. GHCR packages planktonic-web and planktonic-api appear under the org, linked to ulbi-project-group-12/planktonic, tagged v0.0.1-rc.1, 0.0.1-rc.1 and sha-<short>, with no latest tag. Clean up the test release and tag afterwards per README Test releases."
    why_human: "The republished repository has never run release.yml and no planktonic-* package exists (GET packages/container/planktonic-web returns 404). The only live proof is archive run 42520726408, which pushed ulbigram-{web,api} from the old repo. release.yml, both Dockerfiles, .dockerignore and both src/main.ts are byte-identical to that run's commit, but the new repo differs in name, visibility, active release rulesets and sha_pinning_required, so presence and identity cannot prove the push. Triggering it is a GitHub write that is the lead's call."
human_verification:
  - test: "Publish a test pre-release in ulbi-project-group-12/planktonic and watch release.yml (see behavior_unverified_items, SC5)."
    expected: "verify, images (web), images (api), deploy = success; ghcr.io/ulbi-project-group-12/planktonic-web and planktonic-api exist with the release tag, the bare version and sha-<short>, no latest."
    why_human: "No release has run in the republished repo; the GHCR push for the planktonic-* names has never happened. It needs a human-published release, which the verifier must not create."
  - test: "Re-confirm the 7 flagged prohibitions (table Prohibitions below) against the republished repository. The lead signed them off in 01-UAT.md test 10 on 2026-11-08, before the squash republish, the rename and the ESLint preset work."
    expected: "Each must-NOT still holds. The verifier re-ran the deterministic evidence today and found no violation. The visibility change and the devs team grant were made by the lead after execution, which the 01-08 prohibition reserves to the lead."
    why_human: "5 are test-tier with no wired enforcing test and 2 are judgment-tier, so under ADR-550 D4 they stay flagged and cannot be absorbed into passed automatically."
---

# Phase 1: Repo foundation and CI/CD (lead) Verification Report

**Phase Goal:** Anyone clones the repo and `pnpm install --frozen-lockfile && pnpm turbo run lint typecheck test build` passes. Every PR and push to `main` runs the same checks in CI, `main` accepts changes only through a PR with green checks, and publishing a GitHub Release builds the images and pushes them to GHCR. `apps/web` and `apps/api` are placeholders; the framework skeletons are Phase 1.1.
**Verified:** 2026-11-12T06:21:03Z
**Status:** human_needed
**Re-verification:** Yes. The 2026-11-08 report is superseded because the repository was republished on 2026-11-12. Its frontmatter said `passed` while its body said `human_needed`; this report fixes that inconsistency.

## What was verified, and where

- **Local tree:** branch `docs/UL-9-complete-phase-1` at `9b1c369`. HEAD moved from `3945ee7` to `9b1c369` while this verification ran: a lead commit changed README, CONTRIBUTING, CODEOWNERS, `.husky/pre-push`, the `main-push-guard.yml` header and the `apply-repo-rules.sh` header. The full gate was re-run on a fresh clone of `9b1c369`, and so was the apply-script probe. The hook, engine and release-age probes ran on a clone of `3945ee7`; none of the 6 changed files affects them.
- **Live GitHub:** `ulbi-project-group-12/planktonic` is public, created 2026-11-12T05:49:13Z, and `main` = `6d63f36`, the single squashed commit, authored by `2744130+soadap@users.noreply.github.com`. The local docs branch (`3945ee7`, `9b1c369`) has **not** been pushed.
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
| Release | Publish, then images in GHCR | release.yml unchanged and proven in the archive (ulbigram-*); never run in the new repo, no planktonic-* package | PRESENT_BEHAVIOR_UNVERIFIED |
| Outcome | Placeholders only | 0 framework deps in apps manifests or the lockfile; both apps print the Phase 1.1 note | VERIFIED |

## Goal Achievement

### Observable Truths

**Roadmap success criteria (the contract)**

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| SC1 | Clean clone with Node 26.13.0 + pnpm 12.15.0: frozen install and pipeline pass; every dep exact-pinned, at least ~14 days old; lockfile committed | VERIFIED | Clone of `9b1c369`: install exit 0, turbo 15/15, 0 cached. `check:pins`: "17 catalog entries OK", "5 manifests OK". Registry scan of **all 226 lockfile packages** (both lockfile documents): newest is ignore@7.0.14 at 2026-10-23T23:24Z, 0 lookup errors. The new catalog pins `@eslint-react/eslint-plugin` 5.28.8 and `@next/eslint-plugin-next` 16.4.3 (2026-10-23) and `eslint-plugin-jsx-a11y-x` 0.2.0 (2026-05-10) are all older than 14 days. `pnpm-lock.yaml` is tracked |
| SC2 | `ci.yml` runs on every PR and push to main (frozen install, then lint/typecheck/test/build via Turbo with caching) and is green on main | VERIFIED | `on: pull_request` + `push: branches [main]`, no path filters; composite setup does a frozen install and caches `.turbo/cache`. Run 43163922742 on main @6d63f36: 5 required jobs success. (The separate `main-push-guard` workflow is red on that commit by design, see Warnings) |
| SC3 | `main` protected by a ruleset (PR required, CI checks required, squash, no force-push, no deletion) or the exact gap reported; CODEOWNERS puts @soadap on `.planning/`, `.github/`, root configs | VERIFIED (live, via the primary branch of the SC) | `GET rulesets`: main, release, release-create, release-tags, all `enforcement: active`. `GET rules/branches/main`: deletion, non_fast_forward, required_linear_history, pull_request (1 approval, code-owner review, thread resolution, `allowed_merge_methods: [squash]`), required_status_checks (lint, typecheck, test, build, name-guard, integration 15368). Committed JSON equals live for all 4 rulesets, except fields the server adds with default values (`dismissal_restriction`, `required_reviewers: []`, `require_extra_approval_for_unattributed_changes`). CODEOWNERS owns `/.planning/`, `/.github/`, `/.husky/`, `/.claude/`, `/scripts/`, `/packages/config/`, root configs, `apps/*/eslint.config.js` and the lockfile; `GET codeowners/errors` returns 0 |
| SC4 | New PR pre-filled with the template (UL-n, "Done when…", test notes); branch naming and UL-n rules in README and CONTRIBUTING | VERIFIED | `.github/pull_request_template.md` is on the new default branch (contents API) with `UL-`, `## Done when…`, `## How to test`, `## Review rules`. The pre-fill mechanism (standard path on the default branch) was confirmed by the lead in 01-UAT test 9. README "Branches, PRs and tickets" and CONTRIBUTING "Workflow" / "Commits and PR titles" document `feat/UL-n-…`, `fix/UL-n-…`, `[no-ticket]` |
| SC5 | Publishing a Release runs `release.yml` and pushes web + api to `ghcr.io/ulbi-project-group-12/planktonic-{web,api}:<tag>`; deploy is a marked stub; release process documented | PRESENT_BEHAVIOR_UNVERIFIED | Present and wired: trigger `release: types [published]` only; names come from `github.repository_owner` + `vars.PRODUCT_SLUG \|\| github.event.repository.name`. No repo variables are set, so the name resolves to `planktonic`, and name-guard (green on main) proves `PRODUCT_IMAGE_PREFIX` equals that repo-derived slug. The deploy job is `TODO(Phase 4)`, echo only. README "Releases" documents cut `release/x.y`, Publish, hotfix, rollback and cleanup. **Behavior:** archive run 42520726408 (verify, images web/api, deploy = success) pushed `ulbigram-{web,api}` tagged `sha-2277304,v0.0.1-rc.1,0.0.1-rc.1` (re-read today). `release.yml`, both Dockerfiles, `.dockerignore`, both `src/main.ts` and the setup action are byte-identical to that run's commit `2277304`. In the new repo: 0 release runs, and `GET packages/container/planktonic-web` returns 404. See human item 1 |
| G1 | Goal clause: `main` accepts changes **only** through a PR with green checks | VERIFIED (live; previously PASSED by override) | Rule suite 5063143425, 2026-11-11T23:49:52-06:00: actor soadap pushed refs/heads/main `6d63f36 -> 5d6757f`, result `fail`. `pull_request`: "Changes must be made through a pull request." `required_status_checks`: "5 of 5 required status checks are expected." The ref did not move. The only bypass is `OrganizationAdmin` / `pull_request` (`current_user_can_bypass: pull_requests_only`), and the org has 1 admin (soadap). Residual: that admin can merge his own PR without approval or green checks; this was accepted in D-31, see Warnings |

**Plan must-haves (merged; 01-06 T3 and 01-09 T1 deduplicated into SC1)**

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 01-01.1 | Frozen install succeeds against the committed lockfile | VERIFIED | Clean-clone install exit 0 |
| 01-01.2 | Every version defined once, bare, in the catalog; pnpm refuses releases younger than 14 days (ERR_PNPM_NO_MATURE_MATCHING_VERSION) | VERIFIED | `minimumReleaseAge: 20160`, `catalogMode: strict`, 17 bare x.y.z pins. **Probe:** `globals: 17.14.0` (published 2026-11-01), then `pnpm install` gives `ERR_PNPM_NO_MATURE_MATCHING_VERSION`, exit 1. (A first probe with typescript-eslint 8.72.2 also exited 1, with `ERR_PNPM_NO_MATCHING_VERSION`: its young transitive deps were filtered out) |
| 01-01.3 | Node outside `>=26.13.0 <27` fails with ERR_PNPM_UNSUPPORTED_ENGINE | VERIFIED | **Probe:** `--config.node-version=25.9.0` gives `ERR_PNPM_UNSUPPORTED_ENGINE`, exit 1 |
| 01-01.4 | lint + typecheck use the shared TS 6.0.3 / ESLint 10 flat config and pass | VERIFIED | `base.json` nodenext/strict; every package's `eslint.config.js` consumes `@app/config/eslint`; tasks pass |
| 01-02.1 | `format:check` passes with the one shared Prettier config | VERIFIED | Clone run: "All matched files use Prettier code style!" |
| 01-02.2 | Pre-commit hook blocks a staged lint error; staged files only | VERIFIED | **Probe:** staged `export const x: any = 1;` in contracts src, then commit exit 1 ("Unexpected any … @typescript-eslint/no-explicit-any", "Reverting to original state"); HEAD unchanged |
| 01-02.3 | A range or off-catalog dependency fails `check:pins` | VERIFIED | `check-pins.test.mjs` is part of test:root (51/51 pass) and runs in the required `lint` job |
| 01-02.4 | `.env`/`.env.*` ignored; `.env.example` tracked, names only, incl. PRODUCT_NAME/PRODUCT_SLUG | VERIFIED | `.gitignore` has `.env*` and `!.env.example`; `.env.example` is the only env file tracked and holds 4 empty names |
| 01-03.1 | Name, slug, prefix defined once in `packages/config/product.ts`, exported as `@app/config/product` | VERIFIED | `PRODUCT_DISPLAY_NAME = 'planktonic'`, `PRODUCT_SLUG`, `PRODUCT_IMAGE_PREFIX = PRODUCT_SLUG` |
| 01-03.2 | `check:name` passes the real tree and fails with file:line on an any-case literal | VERIFIED | Clone: "101 tracked files clean"; guard test suite passes |
| 01-03.3 | Allowlist exact; nested docs/README.md not exempt | VERIFIED | Test passes; 0 hits for the name in `apps/`, `.github/workflows`, `.github/actions` |
| 01-03.4 | Guard fails closed (exit 2) on a missing or invalid source | VERIFIED | Fail-closed tests pass (51/51) |
| 01-04.1 | Real TicketKey zod schema, Vitest valid + invalid cases | VERIFIED | 13/13 pass |
| 01-04.2 | Builds to dist; validates at runtime in plain Node | VERIFIED | **Spot-check:** `dist/index.js`: `UL-12` true, `UL-01` false |
| 01-04.3 | Plain string not assignable to TicketKey | VERIFIED | `@ts-expect-error` in the test; typecheck passes |
| 01-04.4 | Typed ESLint fires on explicit any in src | VERIFIED | The hook probe hit exactly this rule on contracts src |
| 01-05.1 | api placeholder runs 4 tasks, prints name/version/PRODUCT_NAME (fallback) + NestJS Phase 1.1 note | VERIFIED | `PRODUCT_NAME=Acme APP_VERSION=1.2.3 node apps/api/dist/main.js` prints "@app/api 1.2.3 for Acme: placeholder, the NestJS skeleton arrives in Phase 1.1" |
| 01-05.2 | api image: root context, build-args only, uid 1000, only package.json + src | VERIFIED | The Dockerfile is byte-identical to the archive commit that the 11-08 verifier built and ran (uid 1000, 2 files, code read-only), and its structure equals the web Dockerfile rebuilt today (row 01-06.2) |
| 01-05.3 | No NestJS in apps/api; no name literal; check:name green | VERIFIED | 0 framework deps; guard green |
| 01-06.1 | web placeholder runs 4 tasks and prints the Next.js note | VERIFIED | `node apps/web/dist/main.js` prints "@app/web dev for this project: placeholder, the Next.js skeleton arrives in Phase 1.1" |
| 01-06.2 | web image: same structure as api | VERIFIED | **Spot-check today:** `docker build` (root context, build-args) and `run` print "@app/web 9.9.9 for Acme…"; `id -u` gives 1000; `/app` holds only `package.json` and `src/main.ts`; `touch /app/src/x` gives Permission denied. The image was removed afterwards |
| 01-07.1 | PR + push run 5 separately named checks, no path filters, no matrix | VERIFIED | `ci.yml`; check names on main run 43163922742 match |
| 01-07.2 | Frozen install (pnpm from packageManager, Node from .nvmrc), store + Turbo cache; lint job runs format:check, check:pins, lint:root | VERIFIED | `action.yml` unchanged from the archive run commit; lint job steps present |
| 01-07.3 | Third-party actions SHA-pinned with version comment; contents: read; PR concurrency cancel; per-job timeouts | VERIFIED | 8 distinct external actions, 0 without `@<40-hex> # v…`; `sha_pinning_required: true` live; `timeout-minutes` on all 10 jobs across 3 workflows |
| 01-07.4 | Missing UL-n / [no-ticket] or more than 600 lines gives a non-blocking warning only | VERIFIED | `pr-hygiene.sh` is byte-identical to the archive run commit (where PR #1 got the live size warning). Local run: both `::warning` lines, exit 0 |
| 01-07.5 | Release pushes web + api to `ghcr.io/<owner>/<repo-or-PRODUCT_SLUG>-{app}` tagged tag/version/sha, names from the repo context | VERIFIED (generic mechanism, archive run) | The archive run proved the repo-name-derived naming and all 3 tag types with today's identical workflow. The concrete planktonic-* push is SC5 (human item 1) |
| 01-07.6 | Only the images job can write packages; deploy is a TODO(Phase 4) stub | VERIFIED | Top-level `permissions: {}`; `packages: write` only in `images` |
| 01-08.1 | Squash only, auto-delete, PR_TITLE, applied and read back | VERIFIED (live, new repo) | `GET repos`: squash true, merge commit false, rebase false, delete_branch_on_merge true, title PR_TITLE, message PR_BODY, allow_update_branch true, which equals `repo-settings.json` |
| 01-08.2 | main ruleset as code: PR (1 approval, code-owner review, resolved threads, squash only), 5 checks, no force-push or deletion, linear history | VERIFIED (live) | See SC3; committed equals live |
| 01-08.3 | One idempotent apply script; on Free + private it reports the exact 403 gap and exits 3 | VERIFIED | **Probe** on `9b1c369` with a stub `gh` (no network): gap mode prints "GAP: … HTTP 403: Upgrade to GitHub Pro or make this repository public …", exit 3, 0 ruleset writes. OK mode: upsert by name (1 PUT, 3 POST), "Done", exit 0. The live result (4 active rulesets, sha pinning on) matches the lead's reported exit 0 |
| 01-08.4 | Only bypass: OrganizationAdmin in pull_request mode on main | VERIFIED (live) | main and release: `OrganizationAdmin/pull_request`; `always` appears only on release-create and release-tags (D-31) |
| 01-08.5 | CODEOWNERS @soadap on .planning/.github/scripts/root configs; PR template pre-filled | VERIFIED | See SC3 and SC4. The team-owned commented lines were dropped by the lead (scope change, not a Phase 1 requirement) |
| 01-09.2 | README names the product, points at product.ts, has a 5-step Renaming checklist | VERIFIED (wording superseded) | The "working name ulbigram" wording was superseded by the rename to planktonic (archive PR #4). README title and intro say planktonic; "Product name" points at `packages/config/product.ts`; "Renaming the project" has the 5 D-36 steps |
| 01-09.3 | README documents the release process, the Node 26.13.0 exception and the plan gap | VERIFIED (gap clause superseded) | "Prerequisites" (D-29), "Releases" (cut, Publish, hotfix, rollback, test-release cleanup). The 403 gap is closed, so on `9b1c369` README "Repository rules" correctly states the rules are enforced (applied 2026-11-12, `GH013`). Repeating the 403 text now would be false |
| 01-09.4 | README + CONTRIBUTING: branch naming, UL-n + [no-ticket], squash, review SLA, GSD optional, one-driver rule | VERIFIED | CONTRIBUTING "Workflow", "Commits and PR titles", "Review" (24 h / 48 h), "GSD" (one-driver rule) |
| 01-09.5 | Phase pushed with the gate green, no secrets, CODEOWNERS 0 errors | VERIFIED | New main has CI green; `git log -p --all` token/PEM/AWS/Slack/sk- regex finds 0 hits over all 3 commits; `codeowners/errors` returns 0 |

**Score:** 41/42 truths verified (0 by override; 1 present, behavior-unverified: SC5)

### Prohibitions (ADR-550)

| Plan | Prohibition (must-NOT) | Tier | Enforcement | Evidence (re-run 2026-11-12) | Disposition |
|------|------------------------|------|-------------|------------------------------|-------------|
| 01-05 | No NestJS or framework code/deps in apps/api | test | none wired | 0 `@nestjs/`, `next`, `react`, `express`, `fastify` in apps manifests or lockfile package keys | unverified-prohibition, human review recommended |
| 01-05 | No product name in apps/api or its Dockerfile | test | `name-guard` required check + tests | 0 hits; guard clean | verified (wired) |
| 01-06 | No Next.js/React/UI framework in apps/web | test | none wired | as above (the ESLint React/Next plugins live only in `packages/config` as lint presets) | unverified-prohibition, human review recommended |
| 01-07 | No automatic release/deploy path | test | none wired | release.yml trigger is `release: [published]` only; no workflow creates releases or tags; main-push-guard only opens issues | unverified-prohibition, human review recommended |
| 01-07 | No product name in any workflow or composite action | test | `name-guard` | 0 hits | verified (wired) |
| 01-08 | Executor must not change visibility, add collaborators/teams, Apps or webhooks | judgment | n/a | 0 direct and 0 outside collaborators, 0 hooks, 0 org app installations. Visibility (public) and the `devs` push grant were done by the lead after execution, the case the prohibition reserves to him | LLM verdict: honored (non-authoritative), **flagged** |
| 01-08 | No ruleset bypass that permits direct push to main | test | none wired (live rule suite is evidence, not a test) | live main bypass is `OrganizationAdmin/pull_request` only; the direct push was rejected | unverified-prohibition, human review recommended |
| 01-09 | Docs must not claim main is protected while the 403 persists | judgment | n/a | The 403 no longer persists and live protection is proven, so the `9b1c369` docs are accurate. Live main docs still say "not protected" (stale in the safe direction, see Warnings) | LLM verdict: honored (non-authoritative), **flagged** |
| 01-09 | No secret printed, committed or pushed | test | none wired in CI | history regex scan 0 hits; `.env.example` holds names only | unverified-prohibition, human review recommended |

Complete with 7 flagged prohibitions (5 test-tier with no wired enforcement, 2 judgment-tier). The lead signed them off on 2026-11-08 (01-UAT test 10). Re-confirmation on the republished repo is human item 2.

### Required Artifacts

`gsd-tools verify.artifacts` on `9b1c369`, all exit 0: 01-01 7/7, 01-02 5/5, 01-03 3/3, 01-04 5/5, 01-05 4/4, 01-06 3/3, 01-07 4/4, 01-08 6/6, 01-09 2/2. **39/39 pass.** Every artifact is consumed by a script, workflow or package and was exercised in the clone run, a probe or on GitHub. No ORPHANED or STUB artifacts; the placeholder apps are intentional (D-02, goal text).

Added after the 11-08 report (not plan artifacts, verified as wired): `.github/workflows/main-push-guard.yml` (it ran on main and opened issue #1, since closed), `.husky/pre-push` (blocks pushes to `refs/heads/main` locally), and the `packages/config` ESLint presets `base/next/nest` with their test (`@app/config:test` 5/5 in the pipeline).

### Key Link Verification

`gsd-tools verify.key-links`, all exit 0: 3/3, 3/3, 3/3, 3/3, 2/2, 2/2, 4/4, 3/3, 3/3. **26/26 WIRED.** Confirmed by running code: root scripts to turbo (15 tasks); ci.yml to the setup action and name guard (live check runs on main); ruleset contexts to CI job names (live `required_status_checks` equals the job names); apply script to `rulesets/*.json` and `repo-settings.json` (stub call log); release.yml to `apps/${{ matrix.app }}/Dockerfile` (archive run).

### Data-Flow Trace (Level 4)

| Artifact | Data | Source | Real data | Status |
|----------|------|--------|-----------|--------|
| release.yml image name | `ghcr.io/<owner>/<slug>-<app>` | `github.repository_owner` + `vars.PRODUCT_SLUG \|\| repo name` (no vars set in the new repo) | Archive: real `ulbigram-*` packages. New repo: resolves to `planktonic-*`, not yet pushed | FLOWING (archive) / unexercised (new repo) |
| name-guard `--expect-image-prefix` | repo-derived slug vs `PRODUCT_IMAGE_PREFIX` | same expression as release.yml | name-guard green on main @6d63f36, so `planktonic` matches | FLOWING |
| apps/*/src/main.ts | PRODUCT_NAME / APP_VERSION | build-args to ENV | web image built today printed the build-arg values | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| SC1 pipeline from a clean clone | clone `9b1c369`, then `pnpm install --frozen-lockfile`, then `pnpm turbo run lint typecheck test build --force` | exit 0 / 15 of 15, 0 cached | PASS |
| Remaining required-job steps | `format:check`, `check:pins`, `lint:root`, `check:name`, `test:root` | all exit 0; test:root 51 pass, 0 fail | PASS |
| Release-age gate | young `globals 17.14.0`, then install | ERR_PNPM_NO_MATURE_MATCHING_VERSION | PASS |
| Engine-strict gate | `--config.node-version=25.9.0` | ERR_PNPM_UNSUPPORTED_ENGINE | PASS |
| Pre-commit blocks a lint error | commit a staged explicit `any` | exit 1, reverted | PASS |
| Apply script, both paths | stub `gh` in gap and ok modes | exit 3 + GAP / exit 0 + upsert | PASS |
| web image | `docker build` + `run` | uid 1000, 2 files, read-only code, correct output | PASS |
| Built contracts | `import dist/index.js` | UL-12 true / UL-01 false | PASS |
| Live rules, CI, settings | read-only `gh api` (rulesets, rules/branches/main, rule-suites, actions/permissions, runs) | facts in SC2, SC3, G1, 01-08.x | PASS |
| Release to GHCR in the new repo | (needs a published release, a GitHub write) | not run | SKIP, human item 1 |

All probes ran in scratch clones and were reverted (`git status` clean); the test image was removed. The verifier made no GitHub writes.

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
| TZ-CICD-03 | 01-05, 01-06, 01-07, 01-09 | Releases via cut branch + release button | SATISFIED as code; build half proven in the archive, new-repo run pending (human item 1); deploy is Phase 4 | release.yml + release/release-create rulesets active |
| TZ-CICD-04 | 01-08, 01-09 | No direct push to trunk, only PR with review | SATISFIED (enforced live) | Rule suite 5063143425: the direct push was rejected |
| TZ-CICD-05 | 01-08, 01-09 | Trunk-based | SATISFIED | Squash only + auto-delete live; linear history rule |
| TZ-PROD-10 | 01-02, 01-07, 01-09 | .env local, GitHub secrets in CI, no secrets committed | SATISFIED | `.env*` ignored, names-only example, release uses `secrets.GITHUB_TOKEN`, history scan 0 hits |
| TZ-PROCESS-06 | 01-01 to 01-06, 01-09 | Project init and base config | SATISFIED | Whole monorepo foundation |

**Orchestrator action (info):** REQUIREMENTS.md still shows TZ-FE-18, TZ-BE-17 and TZ-CICD-04 as `[ ]` and "Partial — built as code, enforcement blocked until the repo is public (rulesets 403 on Free)". That is no longer true. Update all three to Complete.

### Decision Coverage

`check.decision-coverage-verify` with 01-CONTEXT.md: **36/36 decisions honored**, not_honored: [].

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| .github/workflows/release.yml | deploy job | `TODO(Phase 4)` | Info | Required by D-16 (the deploy stub is the deliverable); references a roadmap phase |
| apps/*/package.json | test script | `echo "no tests yet (Phase 1.1)"` | Info | Intentional placeholder (D-02, goal text) |
| scripts/pr-hygiene.sh | 2, 28 | "PROCESS section 7" | Info | Points at `.planning/research/PROCESS.md`, which was intentionally removed from the repo; the reference is now dangling in a user-visible CI warning |

No TBD, FIXME or XXX in any tracked file outside `.planning/` and the lockfile; the debt-marker gate passes. No stub output reaches users. No Cyrillic text remains in any tracked file.

### Warnings (non-blocking)

1. **SUMMARY commit references exist only in the archive.** 46 of the 48 hex strings cited in the SUMMARYs resolve as commits in `planktonic-archive`; the other 2 (`8996bb58`, `b1934ee5`) are image digests, not commits. None exists in the new repo, which has one squashed commit `6d63f36`. This is expected from the republish, and the commit-count mismatch is not a gap.
2. **Live `main` docs are stale.** On `6d63f36`, README still says "`main` is **not** protected" and quotes the 403 text, and CONTRIBUTING, CODEOWNERS comments, `.husky/pre-push` and the `main-push-guard.yml` header describe the gap. The corrected text is only on the unpushed local branch `docs/UL-9-complete-phase-1` (`9b1c369`). It is stale in the safe direction (it understates protection), but land it through a PR.
3. **`main-push-guard` is red on `main` @6d63f36.** The seed commit was pushed directly before the rulesets existed, so the guard correctly flagged it and opened issue #1 (now closed). The commit shows a red check until the next merge.
4. **Admin bypass in PR mode.** With `OrganizationAdmin/pull_request`, the only org admin (the lead) can merge a PR without an approval or green checks. This is the accepted design in D-31 and in plan truth 01-08.4. It is a residual edge on "only through a PR with green checks" for one actor.
5. **Process:** ROADMAP `mode: mvp` with a goal that is not a user story (see top).

### Info

- Secret scanning and push protection report `disabled` in `security_and_analysis`. Both are free for a public repo; enabling them would add wired enforcement for the 01-09 secrets prohibition.
- The pipeline is now 15 tasks, not the 14 in 01-06's truth, because `@app/config` gained a `test` task (ESLint preset tests). This is a superset.
- The new repo has no `release/*` branch and no tags yet. `release-create` lets only the org admin cut `release/x.y`; a test release can also target `main` (README "Releases").

### Human Verification Required

#### 1. First release in the republished repository (SC5)

**Test:** In `ulbi-project-group-12/planktonic`, publish a test pre-release (for example `v0.0.1-rc.1` targeting `main`, or a `release/0.0` branch cut by the org admin) and watch the `release` workflow.
**Expected:** `verify`, `images (web)`, `images (api)` and `deploy` succeed. GHCR shows `planktonic-web` and `planktonic-api` under the org, linked to `ulbi-project-group-12/planktonic`, tagged `v0.0.1-rc.1`, `0.0.1-rc.1` and `sha-<short>`, with no `latest`. Clean up the test release and tag as in README "Test releases".
**Why human:** Nothing has run in the new repo. The workflow and all image inputs are byte-identical to the archive run that succeeded, but the repository name, visibility, active release rulesets and `sha_pinning_required` all differ, and only a human-published release can trigger it.

#### 2. Re-confirm the 7 flagged prohibitions on the republished repo

**Test:** Read the Prohibitions table and confirm each must-NOT against today's evidence; optionally add wired tests for the 5 test-tier items, and/or enable secret scanning.
**Expected:** All confirmed honored (the deterministic re-check found no violation).
**Why human:** Fail-closed ADR-550 rule. The 2026-11-08 sign-off (01-UAT test 10) predates the republish, the rename and the preset work.

### Gaps Summary

No code gaps and no blockers. Every roadmap success criterion and plan must-have is backed by code. The goal clause that carried an override on 2026-11-08 (G1, `main` only through a PR with green checks) is now **proven live**: the rulesets are active, committed JSON equals live, and the lead's own direct push was rejected with `pull_request` and `required_status_checks` failures. The one remaining open item is behavioral, not structural. The release-to-GHCR clause (SC5, `planktonic-{web,api}`) has never run in the republished repository. Its workflow and image inputs are byte-identical to the archive run that pushed `ulbigram-{web,api}` successfully, so it is reported as present but behavior-unverified, and closing it needs one human-published test release.

---

_Verified: 2026-11-12T06:21:03Z_
_Verifier: Claude (gsd-verifier)_
