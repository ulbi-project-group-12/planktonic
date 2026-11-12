---
phase: 01-repo-foundation-and-ci-cd-lead
verified: 2026-11-08T20:41:17Z
status: passed
score: 42/42 must-haves verified (1 by override: platform gap)
covered_files:
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
  - ".github/workflows/release.yml"
  - ".gitignore"
  - ".husky/pre-commit"
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
  - "packages/config/eslint.config.js"
  - "packages/config/eslint/index.js"
  - "packages/config/package.json"
  - "packages/config/prettier/index.js"
  - "packages/config/product.ts"
  - "packages/config/tsconfig.json"
  - "packages/config/tsconfig/base.json"
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
covered_digest: "v4:sha256:81d21893c34ca92b825ecacb4d9653f009face885263687aa04618b1d5340267"
behavior_unverified: 0
overrides_applied: 1
overrides:
  - must_have: "main accepts changes only through a PR with green checks (goal clause; enforced by the main ruleset)"
    reason: "GitHub platform gap, not a code gap. The org is on GitHub Free and the repo is private, so GET /repos/{repo}/rulesets and /branches/main/protection both return HTTP 403 'Upgrade to GitHub Pro or make this repository public to enable this feature.' (re-checked by the verifier on 2026-11-08). The ruleset is committed as code (.github/rulesets/main.json: PR required, 1 approval, code-owner review, squash only, the 5 required checks, no deletion, no force-push, linear history, OrganizationAdmin bypass only in pull_request mode). scripts/apply-repo-rules.sh applies it and exits 3 with the exact GAP message while the 403 persists. The gap is documented in README, CONTRIBUTING, CODEOWNERS and SECURITY AR-05. The lead's brief allowed 'set what is possible and report exactly what's missing' (D-20, D-30). Closing action: (1) the lead makes the repo public, (2) runs scripts/apply-repo-rules.sh and confirms exit 0, (3) confirms a direct `git push origin main` is rejected."
    accepted_by: "soadap (lead) via the Phase 1 brief, D-20 and D-30, SECURITY AR-05"
    accepted_at: "2026-11-08T00:00:00Z"
human_verification:
  - test: "Open https://github.com/ulbi-project-group-12/ulbigram/compare/main...release/0.0?expand=1 (or any new branch) in the GitHub web UI and look at the PR description box before typing."
    expected: "The body is pre-filled with .github/pull_request_template.md: the 'Ticket / UL-' line, the 'Done when…' checklist, 'How to test' and 'Review rules'."
    why_human: "Template pre-fill is GitHub web-UI behavior. The file is at the standard path on the default branch, but PR #1 was opened with an explicit body, so no API evidence shows the pre-fill happening."
  - test: "Review and sign off the 7 flagged prohibitions listed under 'Prohibitions' below (5 test-tier with no wired enforcing test, 2 judgment-tier). The verifier's deterministic evidence for each is in that table."
    expected: "Each must-NOT is confirmed not to have happened. Optionally, add a wired test for the test-tier items (e.g. check-pins rejects @nestjs/*, next, react in apps/*; a ruleset lint that fails on bypass_mode 'always' or 'exempt' in main.json; a workflow lint that fails on release/tag creation; a gitleaks-style CI scan)."
    why_human: "Per ADR-550 D4, a test-tier prohibition with no wired enforcement fails closed to 'unverified, flagged'. Judgment-tier items in an orchestrated run get only a non-authoritative LLM verdict. Neither may be silently absorbed into 'passed'."
---

# Phase 1: Repo foundation and CI/CD (lead) Verification Report

**Phase Goal:** Anyone clones the repo and `pnpm install --frozen-lockfile && pnpm turbo run lint typecheck test build` passes. Every PR and push to `main` runs the same checks in CI, `main` accepts changes only through a PR with green checks, and publishing a GitHub Release builds the images and pushes them to GHCR. `apps/web` and `apps/api` are placeholders; the framework skeletons are Phase 1.1.
**Verified:** 2026-11-08T20:41:17Z
**Status:** human_needed
**Re-verification:** No, initial verification

## Process discrepancy: MVP mode without a user-story goal

ROADMAP marks Phase 1 `**Mode:** mvp`, but `user-story.validate` returns `valid: false`: the goal is not in "As a …, I want to …, so that …." form. The MVP rules say to refuse verification and run `/gsd-mvp-phase 1`. The orchestrator asked explicitly for goal-backward verification of this infrastructure phase, so this report verifies the goal as written. The developer-flow table below stands in for the "User Flow Coverage" section. **Recommendation (warning, non-blocking):** drop `mode: mvp` from Phase 1 in ROADMAP.md (an infra phase has no end-user story), or reformat the goal.

## Developer Flow Coverage (derived from the goal)

| Step | Expected | Evidence | Status |
|------|----------|----------|--------|
| Clone | Public instructions work from a fresh checkout | Verifier `git clone` of HEAD 2277304 into scratch | ✓ |
| Install | `pnpm install --frozen-lockfile` passes | exit 0, pnpm v12.15.0, Node v26.13.0 | ✓ |
| Pipeline | `pnpm turbo run lint typecheck test build` passes | `--force` run: `Tasks: 14 successful, 14 total`, 0 cached; Vitest 13/13 | ✓ |
| Open a PR | CI runs the same checks | PR #1: lint, typecheck, test, build, name-guard, pr-hygiene = success on each pushed head (d820129, 888b0f5, 548864e, 6e916c9) | ✓ |
| Merge | Only via PR with green checks | Squash-merged as 2277304. Enforcement blocked by platform (403), so PASSED via override | ✓ (override) |
| Push to main | CI green on main | Run 42520627484 (push, main @2277304): 5 required jobs success, pr-hygiene skipped | ✓ |
| Release | Publish → images in GHCR | Run 42520726408 (release, v0.0.1-rc.1 @2277304): verify, images (web), images (api), deploy = success. GHCR `ulbigram-web` and `ulbigram-api` (private, linked to the repo) carry tags `v0.0.1-rc.1`, `0.0.1-rc.1`, `sha-2277304` | ✓ |
| Outcome | Placeholders only, skeletons in 1.1 | No @nestjs/next/react/express/fastify in any manifest or the lockfile (0 hits); both READMEs point to Phase 1.1 tickets 1.4 and 1.5 | ✓ |

## Goal Achievement

### Observable Truths

**Roadmap success criteria (the contract)**

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| SC1 | Clean clone with Node 26.13.0 + pnpm 12.15.0: frozen install and the pipeline pass; every dependency exact-pinned, ≥ ~14 days old, lockfile committed | ✓ VERIFIED | Verifier clean clone: install exit 0; `turbo run … --force` 14/14. `check:pins` "5 manifests OK". All 14 catalog pins are bare x.y.z. `npm view` dates: newest catalog pin vite 8.3.5 on 2026-10-21. **All 184 lockfile packages** dated ≤ 2026-10-23 (ignore@7.0.14), cutoff 2026-10-25, 0 lookup errors. `pnpm-lock.yaml` tracked |
| SC2 | `ci.yml` runs on every PR and push to main (frozen install, then lint/typecheck/test/build via Turbo with caching) and is green on main | ✓ VERIFIED | `on: pull_request` + `push: branches [main]`, no path filters. Composite setup: `pnpm install --frozen-lockfile --ignore-pnpmfile`, then `actions/cache` on `.turbo/cache`. Run 42520627484 on main green |
| SC3 | `main` protected by a ruleset … **or the exact plan-level gap is reported**; CODEOWNERS puts @soadap on `.planning/`, `.github/`, root configs | ✓ VERIFIED (via the SC's own "or gap reported" branch) | `main.json` holds every listed rule. Live `GET rulesets` and `branches/main/protection` both return 403 with the exact text quoted in README. CODEOWNERS owns `/.planning/`, `/.github/`, `/scripts/`, `/packages/config/`, root configs and the lockfile. `GET codeowners/errors` → 0 |
| SC4 | New PR pre-filled with the template (UL-n, "Done when…", test notes); branch naming and UL-n rules in README and CONTRIBUTING | ✓ VERIFIED (code); UI pre-fill → human item 1 | `.github/pull_request_template.md` holds `UL-`, `## Done when…`, `## How to test` and the review rules. README "Branches, PRs and tickets" and CONTRIBUTING "Workflow" document `feat/UL-n-…`, `fix/UL-n-…`, `[no-ticket]` |
| SC5 | Publishing a Release runs `release.yml` → web + api images to `ghcr.io/ulbi-project-group-12/ulbigram-{web,api}:<tag>`; deploy is a marked stub; release process documented | ✓ VERIFIED | Trigger `release: types [published]` only. Live run 42520726408 pushed both images (log: `pushing manifest for ghcr.io/ulbi-project-group-12/ulbigram-web:v0.0.1-rc.1@sha256:795ffa…`). Deploy job is `# TODO(Phase 4)` with echo-only steps, confirmed in the run log. README "Releases" documents cut `release/x.y`, Publish, hotfix, rollback and test-release cleanup |
| G1 | Goal clause: `main` accepts changes **only** through a PR with green checks | PASSED (override) | Not enforced: GitHub Free + private returns 403 for rulesets and branch protection, so a direct push is possible today. Override: platform gap accepted under D-20/D-30/AR-05. Closing action: make the repo public → run `scripts/apply-repo-rules.sh` (exit 0) → confirm a direct push to `main` is rejected |

**Plan must-haves (merged; 01-06 T3 and 01-09 T1 deduplicated into SC1)**

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 01-01.1 | Frozen install succeeds against the committed lockfile | ✓ VERIFIED | Clean-clone install exit 0 |
| 01-01.2 | Every version defined once, bare, in the catalog; pnpm refuses releases < 14 days with ERR_PNPM_NO_MATURE_MATCHING_VERSION | ✓ VERIFIED | `minimumReleaseAge: 20160`, `catalogMode: strict`. **Probe:** in the clone, changing typescript-eslint to 8.72.1 (2026-10-26) → `ERR_PNPM_NO_MATURE_MATCHING_VERSION`, exit 1 |
| 01-01.3 | Node outside `>=26.13.0 <27` fails with ERR_PNPM_UNSUPPORTED_ENGINE | ✓ VERIFIED | **Probe:** `pnpm install --frozen-lockfile --config.node-version=25.9.0` → `ERR_PNPM_UNSUPPORTED_ENGINE`, exit 1 |
| 01-01.4 | lint + typecheck use shared TS 6.0.3 / ESLint 10 flat config and pass | ✓ VERIFIED | `base.json` (nodenext, strict); `eslint/index.js` `base()` with strictTypeChecked; every package `eslint.config.js` consumes it; tasks pass |
| 01-02.1 | `format:check` passes using the one shared Prettier config | ✓ VERIFIED | Root `"prettier": "@app/config/prettier"`; clone run: "All matched files use Prettier code style!" |
| 01-02.2 | Pre-commit hook blocks a staged lint error; staged files only | ✓ VERIFIED | **Probe:** staged `export const x: any = 1;` → commit exit 1, "✖ eslint --fix … Reverting to original state"; HEAD unchanged |
| 01-02.3 | A range or off-catalog dependency fails `check:pins` | ✓ VERIFIED | `check-pins.test.mjs` 22 cases (part of test:root, 51/51 pass), run in the required `lint` job |
| 01-02.4 | `.env`/`.env.*` ignored, `.env.example` tracked with names only incl. PRODUCT_NAME/PRODUCT_SLUG | ✓ VERIFIED | `.gitignore` has `.env*` and `!.env.example`; `.env.example` holds `NODE_ENV=`, `APP_VERSION=`, `PRODUCT_NAME=`, `PRODUCT_SLUG=` and no values; it is the only tracked env file |
| 01-03.1 | Name, slug, prefix defined once in `packages/config/product.ts`, exported as `@app/config/product` | ✓ VERIFIED | File exports the 3 constants; `exports["./product"] = "./product.ts"` |
| 01-03.2 | `check:name` passes the real tree, fails with file:line on any-case name outside the allowlist | ✓ VERIFIED | Clone: "57 tracked files clean"; test suite covers lowercase, case-insensitive and file:line cases (pass) |
| 01-03.3 | Allowlist exact; nested docs/README.md not exempt | ✓ VERIFIED | Test "does not exempt a nested README.md" passes; verifier grep finds no literal outside the allowlist |
| 01-03.4 | Guard fails closed (exit 2) on missing or invalid source | ✓ VERIFIED | 3 fail-closed tests (missing source, bad slug, missing export) pass |
| 01-04.1 | Real TicketKey zod schema, Vitest valid + invalid cases | ✓ VERIFIED | `/^UL-[1-9]\d*$/` branded schema; 3 valid + 8 invalid + message + brand tests; 13/13 pass |
| 01-04.2 | Builds to dist; built module validates at runtime in plain Node | ✓ VERIFIED | **Spot-check:** `import { TicketKey } from dist/index.js` → `UL-12` true, `UL-01` false |
| 01-04.3 | Plain string not assignable to TicketKey at compile time | ✓ VERIFIED | `@ts-expect-error` in the test; typecheck passes (TS2578 would fire if the brand were gone) |
| 01-04.4 | Typed ESLint fires on explicit any in src | ✓ VERIFIED | The husky probe above hit exactly this rule on a contracts src file |
| 01-05.1 | api placeholder runs 4 tasks, prints name/version/PRODUCT_NAME (fallback) + Phase 1.1 note | ✓ VERIFIED | `main.ts` `fromEnv` fallbacks; 4 scripts; image run printed "@app/api v9.9.9 for Acme: placeholder, the NestJS skeleton arrives in Phase 1.1" |
| 01-05.2 | api image: root context, build-args only, uid 1000, only package.json + src | ✓ VERIFIED | **Spot-check:** local `docker build` + run: `id -u` → 1000; `/app` has only `package.json` and `src/main.ts`; `touch /app/src/x` → Permission denied (root-owned code). Digest-pinned base |
| 01-05.3 | No NestJS in apps/api; no name literal; check:name green | ✓ VERIFIED | Manifest deps are only @app/config, @types/node, eslint, typescript; name guard green |
| 01-06.1 | web placeholder runs 4 tasks, prints the same with the Next.js note | ✓ VERIFIED | `node apps/web/dist/main.js` → "@app/web dev for this project: placeholder, the Next.js skeleton arrives in Phase 1.1"; with env → "1.2.3 for Acme" |
| 01-06.2 | web image: same structure as api | ✓ VERIFIED | `sed s/web/APP/` vs `sed s/api/APP/` Dockerfile diff empty; release run built it |
| 01-07.1 | PR + push to main run 5 separately named checks, no path filters, no matrix | ✓ VERIFIED | `ci.yml` jobs `name: lint/typecheck/test/build/name-guard`, no `paths:`, no matrix; check-run names on PR #1 match |
| 01-07.2 | Frozen install (pnpm from packageManager, Node from .nvmrc), pnpm store + Turbo cache; lint job runs format:check, check:pins, lint:root | ✓ VERIFIED | `action.yml` (no `version` input; `node-version-file: .nvmrc`; `cache: pnpm`; turbo cache); lint job steps present |
| 01-07.3 | Every third-party action SHA-pinned with version comment; contents: read; PR concurrency cancel; per-job timeouts | ✓ VERIFIED | 9 distinct external `uses:`, 0 without `@<40-hex> # v…`; `permissions: contents: read`; `cancel-in-progress: pull_request`; timeouts on 6/6 CI jobs and 3/3 release jobs |
| 01-07.4 | Missing UL-n / [no-ticket] or > 600 lines → non-blocking warning only | ✓ VERIFIED | **Live:** PR #1 (10811 lines, `[no-ticket]` title) got the annotation "warning: PR size: This PR changes 10811 lines (more than 600)…", no title warning, job success |
| 01-07.5 | Release (stable or pre) pushes web + api to `ghcr.io/<owner>/<repo-or-PRODUCT_SLUG>-{app}` tagged tag/version/sha, names from repo context | ✓ VERIFIED | `names` step derives from `github.repository_owner` + `vars.PRODUCT_SLUG \|\| github.event.repository.name`; metadata-action `type=raw` tag, `type=semver`, `type=sha`; live tags `v0.0.1-rc.1`, `0.0.1-rc.1`, `sha-2277304` |
| 01-07.6 | Only the images job can write packages; deploy is a TODO(Phase 4) stub | ✓ VERIFIED | Top level `permissions: {}`; `packages: write` only in `images`; deploy `permissions: {}` |
| 01-08.1 | Squash only, auto-delete, PR_TITLE, applied and read back | ✓ VERIFIED | **Live** `GET repos`: allow_squash_merge true, merge_commit false, rebase false, delete_branch_on_merge true, squash title PR_TITLE (matches `repo-settings.json`) |
| 01-08.2 | main ruleset as code with PR (1 approval, code-owner review, resolved threads, squash only), 5 checks, no force-push or deletion, linear history | ✓ VERIFIED | `.github/rulesets/main.json` holds every listed rule; check contexts equal the CI job names |
| 01-08.3 | One idempotent apply script; on Free + private reports the exact 403 gap and exits 3 | ✓ VERIFIED | **Probe** with a stub `gh` on PATH (no real API calls): Step 1 PATCH, Step 3 list → 403 → "GAP: rulesets are unavailable…", exit 3. Preflight validates every JSON first; upsert by name |
| 01-08.4 | Only bypass is OrganizationAdmin in pull_request mode on main | ✓ VERIFIED | `main.json` and `release.json`: `OrganizationAdmin/pull_request`. `always` appears only on the tags and release-create rulesets, as documented in D-31 and the script header |
| 01-08.5 | CODEOWNERS @soadap on .planning/.github/scripts/root configs; PR template prefilled content | ✓ VERIFIED (UI pre-fill → human item 1) | See SC3 and SC4 |
| 01-09.2 | README "this project (working name ulbigram)", points at product.ts, has a Renaming checklist (5 steps) | ✓ VERIFIED | README intro, "Product name", "Renaming the project" with the 5 D-36 steps |
| 01-09.3 | README documents the release process, the Node 26.13.0 exception and the exact 403 text | ✓ VERIFIED | "Prerequisites" (D-29 exception), "Releases", "Repository rules and the GitHub Free gap" quotes `Upgrade to GitHub Pro or make this repository public to enable this feature.` |
| 01-09.4 | README + CONTRIBUTING: branch naming, UL-n + [no-ticket], squash, review SLA, GSD optional, one-driver rule | ✓ VERIFIED | CONTRIBUTING "Workflow", "Commits and PR titles", "Review" (24 h / 48 h), "GSD" (one-driver rule) |
| 01-09.5 | Phase branch pushed with the gate green, no secrets, CODEOWNERS 0 errors | ✓ VERIFIED | Clone `check:all` components all exit 0; history-wide token/PEM regex scan → 0 hits; codeowners/errors → 0 |

**Score:** 42/42 truths verified (41 VERIFIED + 1 PASSED by override; 0 present-but-behavior-unverified)

### Prohibitions (ADR-550)

| Plan | Prohibition (must-NOT) | Tier | Enforcement | Verifier evidence | Disposition |
|------|------------------------|------|-------------|-------------------|-------------|
| 01-05 | No NestJS or framework code/deps in apps/api | test | none wired | 0 framework deps in manifests and lockfile | **unverified-prohibition, human review recommended** |
| 01-05 | No product name in apps/api or its Dockerfile | test | `name-guard` required check + 21 tests | guard clean | ✓ verified (wired) |
| 01-06 | No Next.js/React/UI framework in apps/web | test | none wired | 0 hits (as above) | **unverified-prohibition, human review recommended** |
| 01-07 | No automatic release/deploy path; release.yml only on human-published release | test | none wired | only trigger `release: [published]`; no `gh release`, `git tag` or `git push` in any workflow | **unverified-prohibition, human review recommended** |
| 01-07 | No product name in any workflow or composite action | test | `name-guard` covers all tracked files | guard clean | ✓ verified (wired) |
| 01-08 | No visibility change, collaborators, teams, GitHub Apps or webhooks | judgment | n/a | repo still private; 0 direct and 0 outside collaborators (the read users are org members via org default `read`); 0 hooks; 0 org app installations | LLM verdict: honored (non-authoritative), **flagged** |
| 01-08 | No ruleset bypass permitting direct push to main (`always`/`exempt`) | test | none wired | `main.json` bypass = `OrganizationAdmin/pull_request` only | **unverified-prohibition, human review recommended** |
| 01-09 | Docs must not claim main is protected while 403 persists | judgment | n/a | README: "`main` is **not** protected…"; CODEOWNERS and CONTRIBUTING say the same | LLM verdict: honored (non-authoritative), **flagged** |
| 01-09 | No secret printed, committed or pushed | test | none wired in CI (one-time pre-push scan) | `git log -p --all` token/PEM/AWS/Slack/sk- regex → 0 hits | **unverified-prohibition, human review recommended** |

Complete with 7 flagged prohibitions (5 test-tier with no wired enforcement, 2 judgment-tier). Deterministic evidence shows none of the must-NOTs happened; the flags exist because no wired test keeps them true in the future.

### Required Artifacts

`gsd-tools verify.artifacts`, all exit 0: 01-01 7/7, 01-02 5/5, 01-03 3/3, 01-04 5/5, 01-05 4/4, 01-06 3/3, 01-07 4/4, 01-08 6/6, 01-09 2/2. **39/39 artifacts pass.** All artifacts are wired: each is consumed by a script, workflow or package and was exercised in the clone run or on GitHub. No ORPHANED or STUB artifacts. The placeholder apps are intentional per D-02 and the goal text.

### Key Link Verification

`gsd-tools verify.key-links`, all exit 0: 3/3, 3/3, 3/3, 3/3, 2/2, 2/2, 4/4, 3/3, 3/3. **26/26 links WIRED.** Links confirmed by running code: root scripts → turbo (14 tasks); ci.yml → setup action and the name guard (live check runs); release.yml → `apps/${{ matrix.app }}/Dockerfile` (live images); ruleset contexts → CI job names (identical strings); apply script → rulesets/*.json and repo-settings.json (stub probe call log).

### Data-Flow Trace (Level 4)

| Artifact | Data | Source | Real data | Status |
|----------|------|--------|-----------|--------|
| release.yml image name | `ghcr.io/<owner>/<slug>-<app>` | `github.repository_owner` + `vars.PRODUCT_SLUG \|\| repo name` | Live GHCR packages `ulbigram-web` / `ulbigram-api` under the org | ✓ FLOWING |
| name-guard `--expect-image-prefix` | repo-derived slug vs `PRODUCT_IMAGE_PREFIX` | same expression as release.yml | CI green, so they match | ✓ FLOWING |
| apps/*/src/main.ts | PRODUCT_NAME / APP_VERSION | Docker build-args → ENV | Image printed the build-arg values | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| SC1 pipeline from a clean clone | `git clone` → `pnpm install --frozen-lockfile` → `pnpm turbo run lint typecheck test build --force` | exit 0 / 14 of 14 successful, 0 cached | ✓ PASS |
| Remaining required-job steps | `format:check`, `check:pins`, `lint:root`, `check:name`, `test:root` | all exit 0; test:root 51 pass, 0 fail, 0 skipped | ✓ PASS |
| Release-age gate | young typescript-eslint 8.72.1 + install | ERR_PNPM_NO_MATURE_MATCHING_VERSION | ✓ PASS |
| Engine-strict gate | `--config.node-version=25.9.0` | ERR_PNPM_UNSUPPORTED_ENGINE | ✓ PASS |
| Pre-commit blocks a lint error | commit a staged explicit `any` | exit 1, reverted | ✓ PASS |
| Apply script plan-gap path | stub `gh` returns the 403 text | exit 3, GAP message | ✓ PASS |
| api image | `docker build` + `run` | uid 1000, 2 files, read-only code, correct output | ✓ PASS |
| Built contracts at runtime | `import dist/index.js` | UL-12 true / UL-01 false | ✓ PASS |
| Live CI / release / GHCR | read-only `gh api` | facts reproduced (see SC2, SC5) | ✓ PASS |

All probe edits were made in the scratch clone and reverted (`git status` clean). The local test image was removed. No GitHub writes were made.

### Probe Execution

No `scripts/*/tests/probe-*.sh` exist and no plan declares one. Step 7c is not applicable. The ad-hoc probes above were run by the verifier itself.

### Requirements Coverage

All 21 IDs appear in at least one plan's `requirements:` field. REQUIREMENTS.md maps exactly these 21 IDs to Phase 1, so no requirement is ORPHANED.

| Requirement | Plan(s) | Description | Status | Evidence |
|-------------|---------|-------------|--------|----------|
| TZ-FE-02 / TZ-BE-02 | 01-01, 01-04, 01-05, 01-06 | typescript | ✓ SATISFIED | TS 6.0.3 pinned, shared base, typecheck in all packages |
| TZ-FE-10 / TZ-BE-10 | 01-01 | Eslint | ✓ SATISFIED | Shared flat config, `lint` required check |
| TZ-FE-11 / TZ-BE-11 | 01-02 | prettier | ✓ SATISFIED | `@app/config/prettier`, format:check in lint job |
| TZ-FE-12 / TZ-BE-12 | 01-02 | husky | ✓ SATISFIED | Pre-commit probe blocked a lint error |
| TZ-FE-16 / TZ-BE-15 | 01-01, 01-06 | pnpm | ✓ SATISFIED | pnpm 12.15.0 packageManager + engines |
| TZ-BE-16 | 01-02, 01-03, 01-07 | Mandatory linting | ✓ SATISFIED | lint in CI on every PR and push |
| TZ-FE-18 / TZ-BE-17 | 01-08, 01-09 | Mandatory code review for every task | ✓ SATISFIED as code; enforcement under the G1 override | Ruleset requires 1 approval + code-owner review; template + CONTRIBUTING review rules. Not enforced until the rulesets apply |
| TZ-FE-20 / TZ-BE-19 / TZ-CICD-02 | 01-07 | CI pipeline; lint/tests/build/typecheck on every PR | ✓ SATISFIED | ci.yml, live green runs on the PR and on main |
| TZ-CICD-03 | 01-05, 01-06, 01-07, 01-09 | Releases via cut branch + release button | ✓ SATISFIED (build half; deploy is Phase 4 per the traceability "Also: 4") | release/0.0 + pre-release → live images |
| TZ-CICD-04 | 01-08, 01-09 | No direct push to main, only PR with review | ✓ SATISFIED as code; **enforcement PASSED (override)** | Ruleset + apply script; 403 platform gap; closing action in G1 |
| TZ-CICD-05 | 01-08, 01-09 | Trunk-based | ✓ SATISFIED | Squash only + auto-delete applied live; CONTRIBUTING branch lifetime rules |
| TZ-PROD-10 | 01-02, 01-07, 01-09 | .env local, GitHub secrets in CI, no secrets committed | ✓ SATISFIED | `.env*` ignored, names-only example, release uses `secrets.GITHUB_TOKEN`, scan 0 hits |
| TZ-PROCESS-06 | 01-01…01-06, 01-09 | Project init and base config | ✓ SATISFIED | Whole monorepo foundation |

**Info:** the REQUIREMENTS.md traceability table still says `Pending` for TZ-FE-18, TZ-FE-20, TZ-BE-17, TZ-BE-19 and TZ-CICD-02…05. The orchestrator should update those rows: Complete for FE-20, BE-19, CICD-02, CICD-03 (build half) and CICD-05, and "Complete (enforcement pending repo public)" or similar for FE-18, BE-17 and CICD-04.

### Decision Coverage

`check.decision-coverage-verify`: **36/36 CONTEXT.md decisions honored** (D-01…D-36), not_honored: []. All trackable CONTEXT.md decisions are honored by shipped artifacts.

### Test Quality Audit

| Test File | Linked Req | Active | Skipped | Circular | Assertion Level | Verdict |
|-----------|-----------|--------|---------|----------|-----------------|---------|
| packages/contracts/src/ticket-key.test.ts | TZ-FE-02, TZ-PROCESS-06 | 13 | 0 | No | Value + compile-time brand | ✓ |
| scripts/check-product-name.test.mjs | TZ-BE-16 / D-35 | 21 | 0 | No (fixtures written to temp dirs, oracle is the planted literal) | Exit code + stderr file:line | ✓ |
| scripts/check-pins.test.mjs | D-07 / T-01-06 | 22 (+ shared) | 0 | No | Exit code on crafted manifests | ✓ |

Disabled tests on requirements: 0. Circular patterns: 0. Insufficient assertions: 0.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| .github/workflows/release.yml | 160, 162 | `TODO(Phase 4)` | ℹ️ Info | Required by D-16 (deploy stub is the deliverable); references a roadmap phase |
| apps/*/package.json | test script | `echo "no tests yet (Phase 1.1)"` | ℹ️ Info | Intentional placeholder per D-02 and the goal text |

No TBD, FIXME or XXX in any phase file, so the debt-marker gate passes. No stubs flow to user-visible output.

### Residual risks (from SECURITY/REVIEW, not gaps)

- Actions `sha_pinning_required` is still `false` live (AR-06). The lead runs `scripts/apply-repo-rules.sh` without `SKIP_SHA_PINNING`. All pins are already 40-hex.
- 11 deferred Info items in 01-REVIEW-DISPOSITION.md (e.g. gha BuildKit cache in the publishing job). None is blocking.

### Human Verification Required

#### 1. PR template pre-fills in the web form

**Test:** Open a compare page for any branch against `main` in the GitHub UI (e.g. `…/compare/main...release/0.0?expand=1`) and look at the description box.
**Expected:** The body contains the template: `## Ticket` / `UL-`, `## Done when…` with checkboxes, `## How to test`, `## Review rules`.
**Why human:** This is web-UI behavior. PR #1 was opened with an explicit body, so the API holds no evidence of the pre-fill.

#### 2. Sign off the 7 flagged prohibitions

**Test:** Read the Prohibitions table above. Confirm each must-NOT against the verifier's evidence, and decide whether to add wired tests for the 5 test-tier items.
**Expected:** All confirmed honored (the verifier's deterministic evidence says they are).
**Why human:** Fail-closed rule: no wired enforcing test (test-tier) or judgment-only (judgment-tier), so they cannot be marked verified automatically.

### Gaps Summary

No code gaps. Every roadmap success criterion and every plan must-have is backed by code, and 9 behavioral probes plus live GitHub evidence confirm them. The one goal clause that is not true at runtime, "`main` accepts changes only through a PR with green checks", is a **GitHub Free + private platform limitation** (HTTP 403 on rulesets and branch protection). The lead's brief accepted it, and it carries an override. The ruleset, apply script and documentation are ready. **Closing action:** the lead makes the repository public → runs `scripts/apply-repo-rules.sh` and confirms exit 0 → confirms a direct `git push origin main` is rejected. No later roadmap phase covers this, so it stays the lead's open action rather than a deferred item.

---

_Verified: 2026-11-08T20:41:17Z_
_Verifier: Claude (gsd-verifier)_
