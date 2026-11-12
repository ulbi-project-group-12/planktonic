---
phase: 01-repo-foundation-and-ci-cd-lead
plan: 09
subsystem: docs-and-handoff
tags: [readme, contributing, release-process, plan-gap, renaming, phase-gate, push, sc1, sc4]
status: complete

requires:
  - phase: 01-01..01-08
    provides: "workspace, hooks, name guard, contracts, placeholder apps and images, ci.yml/release.yml, rules as code, CODEOWNERS, PR template"
provides:
  - "README.md: prerequisites, quick start, scripts, layout, dependency rules, product name, 'Renaming the project', branches/PRs, CI, releases, the GitHub Free gap, planning"
  - "CONTRIBUTING.md: ticket -> branch -> PR -> review -> squash, title format, PR rules, review SLA, local checks, deps, name rule, GSD one-driver rule (no product literal)"
  - "01-VALIDATION.md: 17 criterion rows green from the 01-09 gate run, wave_0_complete: true, 3 e2e rows pending for the orchestrator"
  - "Remote branch gsd/phase-01-repo-foundation-and-ci-cd-lead on origin, CODEOWNERS parsed with zero errors"
affects: [phase-1-orchestrator-pr-and-release, phase-1-verify]

actuals:
  tokens: 4700
  tasks: 3
  commits: 3
plan_head_before: e4dda10a0bde6dd9946bbcace3596068ee6122fd
plan_head_after: 8632ea4b70c42d0557d2e810a1f50c019980b02f

tech-stack:
  added: []
  patterns:
    - "Docs state the enforced and the not-enforced parts separately, with the verbatim 403 text, instead of implying protection"
    - "Files outside the name-guard allowlist say 'this project' and use relative links only"

key-files:
  created:
    - README.md
    - CONTRIBUTING.md
  modified:
    - .planning/phases/01-repo-foundation-and-ci-cd-lead/01-VALIDATION.md

key-decisions:
  - "README lists repo-level SHA pinning as 'not applied yet (lead action)', because 01-08 ran the apply script with SKIP_SHA_PINNING=1"
  - "No requirement ticked by 01-09: TZ-PROD-10 and TZ-PROCESS-06 were already complete; TZ-CICD-03/04/05, TZ-FE-18 and TZ-BE-17 need GitHub-side evidence (test release, enforced ruleset) and are left to the orchestrator/verifier"
  - "The VALIDATION CODEOWNERS row was marked green after the push, in the final docs commit, because GitHub's parser needs the ref on origin"

requirements-completed: []

metrics:
  duration: 6min
  completed: 2026-11-08
---

# Phase 1 Plan 09: Docs, phase gate and hand-off Summary

**This plan adds README.md, which takes a newcomer from a clean clone to a green 14-task pipeline. It also covers the release, hotfix, rollback and test-release process, the GitHub Free gap (quoting the 403 verbatim), and the five-step renaming checklist. CONTRIBUTING.md covers the ticket → branch → PR → review → squash flow and passes the name guard without an allowlist entry. The full local gate is green from a fresh clone, with `FULL TURBO` on the second run. The phase branch is pushed to origin at `8632ea4`, and GitHub parses CODEOWNERS on it with zero errors.**

## Performance

- **Duration:** about 6 min
- **Started:** 2026-11-08T17:22:45Z
- **Completed:** 2026-11-08
- **Tasks:** 3 of 3
- **Files:** 2 created, 1 modified

## Accomplishments

- **README.md** (12 `##` sections) covers:
  - "this project (working name ulbigram)".
  - Node 26.13.0 as the D-29 exception, and `npm i -g pnpm@12.15.0` with the pinned standalone-installer alternative.
  - The quick start, then the scripts and layout tables.
  - The catalog and 14-day rules.
  - The `packages/config/product.ts` single source and the name-guard allowlist.
  - `## Renaming the project` with the five D-36 steps.
  - The `feat/UL-n` / `fix/UL-n` branches with `[no-ticket]` and squash merge.
  - The CI checks.
  - The release flow: the `release/x.y` → `vx.y.0` → Publish steps, the GHCR tags, the GITHUB_TOKEN caveat, hotfix, rollback in Phase 4, no laptop pushes, and test-release cleanup with `gh release delete`.
  - The plan gap section, which is described under Gap Reported below.
- **CONTRIBUTING.md** (9 sections) covers:
  - The workflow, with a branch life of at most 2 days (5 at the hard limit).
  - The `type(scope): summary (UL-n)` title format.
  - The PR rules: the template with "Done when…", about 400 lines (CI warns above 600), one ticket = one PR, AI comments answered first, and green CI.
  - The 24 h / 48 h review SLA and Conventional Comments.
  - The local checks, the dependency rules and the product-name rule.
  - The GSD one-driver rule with `/gsd-quick`, `/gsd-debug` and `/gsd-pr-branch`.
  - English for code and docs, Russian for chat.
  - It contains no product literal and no GitHub URL.
- **Phase gate:**
  - Everything was green from a fresh clone and the working repo.
  - Results are recorded in `01-VALIDATION.md`, with `wave_0_complete: true` and the Wave 0 checklist ticked.
  - `status` and `nyquist_compliant` are untouched.
- **Push:** `git push -u origin gsd/phase-01-repo-foundation-and-ci-cd-lead` created the remote branch. It was not a force push, and `main` was not touched.

## Task Commits

1. **Task 1 (tracer): README from clean clone to release, plan gap and renaming.** `75ccac1`
2. **Task 2: CONTRIBUTING with workflow, PR rules, review SLA and GSD note.** `aae22e9`
3. **Task 3: record phase gate results in VALIDATION.** `8632ea4`

All three went through the live husky/lint-staged hook (prettier). None used `--no-verify`.

## Gate Evidence (verbatim)

**Tracer gate (auto mode):** the full Task 1 verify was re-run after the commit. All phrase greps passed, as did `pnpm format:check` and `pnpm check:name` (53 tracked files clean). The clean clone printed `Tasks:    14 successful, 14 total`, rc=0.

**Fresh clone of the branch at `aae22e9`:**

- `pnpm install --frozen-lockfile` → `Done in 385ms using pnpm v12.15.0`
- `pnpm format:check` → `All matched files use Prettier code style!`
- `pnpm check:pins` → `check-pins: 5 manifests OK`
- `pnpm lint:root` → clean
- `pnpm check:name` → `check-product-name: 54 tracked files clean`
- `pnpm test:root` → `# tests 10`, `# pass 10`, `# fail 0`
- Turbo run 1: `Tasks:    14 successful, 14 total`, `Cached:    0 cached, 14 total`
- Turbo run 2: `Tasks:    14 successful, 14 total`, `Cached:    14 cached, 14 total`, `Time:    7ms >>> FULL TURBO`

**Working repo:**

- actionlint (`rhysd/actionlint@sha256:b1934ee5…`): exit 0, no findings.
- Images built with `APP_VERSION=v0.0.0-gate` and `PRODUCT_NAME=acme`:
  - web: `@app/web v0.0.0-gate for acme: placeholder, the Next.js skeleton arrives in Phase 1.1`, `id -u` = 1000, and `/app` holds `package.json src`.
  - api: `@app/api v0.0.0-gate for acme: placeholder, the NestJS skeleton arrives in Phase 1.1`, `id -u` = 1000, and `/app` holds `package.json src`.
- Merge-settings readback: `[true,false,false,true,"PR_TITLE"]`.
- Also green: contracts tests (13 passed), the ruleset jq gate, and the contexts, which are `build lint name-guard test typecheck`. The hooksPath is `.husky/_`, there are no `^`/`~` ranges, every action is SHA-pinned, and the D-33 import check passes.
- **Secret scan (before push):**
  - No tracked env file other than `.env.example`.
  - The `git grep` for `ghp_|gho_|ghs_|github_pat_` followed by 20+ characters, or a PEM private-key header, outside `.planning` finds nothing (`SECRET_SCAN_CLEAN`).
  - `.env.example` holds no values.

**After push:**

- `git ls-remote` head `8632ea4b70c42d0557d2e810a1f50c019980b02f` equals local HEAD.
- `gh api repos/ulbi-project-group-12/ulbigram/codeowners/errors?ref=gsd/phase-01-repo-foundation-and-ci-cd-lead` → `{"errors":[]}`, so the error count is 0.

The plan's verify commands use `mktemp -d` for the clean clone. Per the brief, I made the clones in the session scratchpad and deleted them afterwards. Otherwise the commands were the same.

## Gap Reported (as written in README)

- **Applied now:** squash-only merge, the PR title as the squash commit title, and branch deletion on merge.
- **Not applied yet (lead action):** repo-level SHA pinning. Run `REPO=ulbi-project-group-12/ulbigram scripts/apply-repo-rules.sh` (without `SKIP_SHA_PINNING`), or `gh api -X PUT repos/ulbi-project-group-12/ulbigram/actions/permissions -F enabled=true -f allowed_actions=all -F sha_pinning_required=true`.
- **Blocked while private on Free:** GitHub returns HTTP 403 `Upgrade to GitHub Pro or make this repository public to enable this feature.` As a result:
  - `main` has no ruleset or branch protection, so direct pushes are not blocked.
  - Required reviews, CODEOWNERS review and required checks are not enforced. Reviewers must hand-check `scripts/` and `.github/`.
  - Environments are not available.
  - Secret scanning and push protection are not available.
  - Actions minutes are capped by the $12/month allowance, and each run bills the 5 required jobs plus pr-hygiene on PRs.
- **Fix:** make the repo public (the lead's call), run `scripts/apply-repo-rules.sh` (it should exit 0), and confirm that a direct push to `main` is rejected. Teammates need write access before their approvals count.

## Pending for the orchestrator (post-execution steps in the plan)

- Push the final SUMMARY/STATE commit. This executor pushes it once more at the end.
- Open the PR with a `[no-ticket]` title, watch the five checks, squash-merge, and confirm CI on `main`.
- Run the test release `v0.0.1-rc.1` from `release/0.0`, check the GHCR tags, then clean up as the README describes.
- Human check: on the compare URL, confirm the PR template pre-fills the body (the `UL-` line, "Done when…", How to test and Review rules). The API cannot show this.
- MVP note for the lead: the ROADMAP Goal line is not written as a user story.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] The README intro did not match the case-sensitive working-name phrase**
- **Found during:** Task 1
- **Issue:** The intro started with "This project (working name ulbigram)", but the gate greps `-F 'this project (working name ulbigram)'` with a lowercase "t".
- **Fix:** I reworded it to "Welcome to this project (working name ulbigram), …".
- **Files modified:** README.md
- **Commit:** 75ccac1

**2. [Ordering] The VALIDATION CODEOWNERS row was finalized after the push**
- **Found during:** Task 3
- **Issue:** GitHub's CODEOWNERS parser needs the ref on origin, and the plan commits VALIDATION before the push.
- **Fix:** Commit `8632ea4` carried the row as pending. It turns green in the final docs commit.
- **Files modified:** .planning/phases/01-repo-foundation-and-ci-cd-lead/01-VALIDATION.md

## Known Stubs

None. The README describes `apps/web` and `apps/api` as placeholders, and the placeholder apps themselves come from plans 01-05 and 01-06.

## Threat Flags

None. There is no new surface beyond T-01-31..T-01-34: the secret scan ran before the push, the docs pin the pnpm install, the gap is stated verbatim, and only the phase branch was pushed, without force.

## Self-Check: PASSED

README.md, CONTRIBUTING.md and 01-VALIDATION.md exist. Commits `75ccac1`, `aae22e9` and `8632ea4` are ancestors of HEAD. The remote branch head equals `8632ea4` at the time of the check.
