---
phase: 01-repo-foundation-and-ci-cd-lead
plan: 08
subsystem: repo-governance
tags: [github, rulesets, codeowners, pr-template, merge-settings, sc3, sc4]
status: complete

requires:
  - phase: 01-07
    provides: "ci.yml job names lint, typecheck, test, build, name-guard (required contexts) and non-required pr-hygiene"
  - phase: 01-03
    provides: "name guard (pnpm check:name) that every new file must pass"
provides:
  - ".github/repo-settings.json: merge settings as code (PATCH /repos body), live on GitHub"
  - ".github/rulesets/main.json and release.json: rulesets as code, ready to apply once the repo is public"
  - "scripts/apply-repo-rules.sh: idempotent apply; exit 0 all applied / 3 plan gap / other error; env REPO, SKIP_SHA_PINNING"
  - ".github/CODEOWNERS: @soadap on .planning/, .github/, scripts/ and root configs; team placeholders"
  - ".github/pull_request_template.md: UL- line, 'Done when…' checklist, test notes, review rules"
affects: [01-09, phase-1-verify]

actuals:
  tokens: 2367
  tasks: 2
  commits: 2
plan_head_before: 31ba27ea14446bb275a7428746c4d67dc167ceed
plan_head_after: 32f4881e2707e5fbeb477bb7a80aad91dbeec2e8

tech-stack:
  added: []
  patterns:
    - "Repo governance as code under .github/ (settings JSON, ruleset JSON) plus one idempotent gh-api script that upserts by name"
    - "Plan-gated GitHub features are reported with a distinct exit code (3) and a GAP: line, never faked as success"

key-files:
  created:
    - .github/repo-settings.json
    - .github/rulesets/main.json
    - .github/rulesets/release.json
    - scripts/apply-repo-rules.sh
    - .github/CODEOWNERS
    - .github/pull_request_template.md
  modified: []

key-decisions:
  - "apply-repo-rules.sh gained a SKIP_SHA_PINNING=1 opt-out; the lead's brief authorized only the merge-settings PATCH and the ruleset attempt, so the Actions-permissions PUT was not run (needs lead)"
  - "pnpm-lock.yaml stays unowned in CODEOWNERS: every version change already touches the owned pnpm-workspace.yaml catalog"
  - "release.json omits required_linear_history (plan keeps deletion, non_fast_forward, pull_request, required_status_checks), same five contexts and the single pull_request-mode bypass"
  - "No requirement ticked: TZ-CICD-04, TZ-FE-18 and TZ-BE-17 need the ruleset enforced (403 gap); TZ-CICD-05 also relies on the gated linear-history rule and the 01-09 branch docs"

requirements-completed: []

metrics:
  duration: 2min
  completed: 2026-11-08
---

# Phase 1 Plan 08: Repo rules as code Summary

**The repository now merges by squash only, deletes branches on merge, and uses the PR title as the squash commit title. These settings are applied live and read back as `[true,false,false,true,"PR_TITLE"]`. The `main` and `release/*` rulesets (PR with 1 approval, code-owner review, resolved threads, five required checks, no force-push or deletion, single OrganizationAdmin bypass in pull_request mode) are committed as code. `scripts/apply-repo-rules.sh` stops at GitHub's verified 403 "Upgrade to GitHub Pro or make this repository public" with exit 3. CODEOWNERS and the PR template with the 'Done when…' checklist are in place.**

## Performance

- **Duration:** about 2 min
- **Started:** 2026-11-08T17:17:07Z
- **Completed:** 2026-11-08
- **Tasks:** 2 of 2
- **Files:** 6 created, 260 lines

## Accomplishments

- **Merge settings, live:** `.github/repo-settings.json` sets allow_squash_merge true, allow_merge_commit false, allow_rebase_merge false, delete_branch_on_merge true, allow_update_branch true, squash_merge_commit_title `PR_TITLE` and squash_merge_commit_message `PR_BODY`. It was applied with `gh api -X PATCH repos/$REPO --input .github/repo-settings.json`.
- **main ruleset** (`.github/rulesets/main.json`):
  - Targets `~DEFAULT_BRANCH`.
  - Rules: deletion, non_fast_forward, required_linear_history.
  - pull_request: 1 approval, dismiss stale reviews, code-owner review, resolved threads, squash only.
  - required_status_checks: `lint`, `typecheck`, `test`, `build` and `name-guard`, each with integration_id 15368. Strict policy is off.
  - The only bypass actor is `OrganizationAdmin`, actor_id 1, in `pull_request` mode (D-31).
- **release ruleset** (`.github/rulesets/release.json`) targets `refs/heads/release/*`. It has the same PR rule, the same five checks and the same bypass, plus deletion and non_fast_forward.
- **apply script** (`scripts/apply-repo-rules.sh`, mode 100755, 86 lines, shellcheck clean, no xtrace):
  - The repo comes from `REPO` or `gh repo view`.
  - Step 1 PATCHes the settings and prints only the five merge fields.
  - Step 2 PUTs `actions/permissions` with `sha_pinning_required=true`. If GitHub refuses, it prints a `WARN:` line and continues. `SKIP_SHA_PINNING=1` skips the step.
  - Step 3 lists the rulesets. On `Upgrade to GitHub Pro` it prints the `GAP:` line and exits 3. Otherwise it upserts every `.github/rulesets/*.json` by name.
- **CODEOWNERS:**
  - The header explains that the last match wins, that owners need write access, and that enforcement is plan-gated.
  - 16 `@soadap` owner lines, covering `.planning/`, `.github/`, `.husky/`, `.claude/`, `scripts/`, `packages/config/` and 10 root configs.
  - The lockfile is unowned on purpose, with a comment explaining why.
  - Commented team placeholders for `/packages/contracts/`, `/apps/api/src/core/`, `/apps/api/prisma/` and `/infra/`.
- **PR template:**
  - Title comment: `UL-n` example and the `[no-ticket]` escape. The squash commit uses the PR title.
  - `## Ticket` with a bare `UL-` line, then `## Summary`.
  - `## Done when…` with 3 `- [ ]` placeholders, then `## How to test`.
  - `## Review rules`: about 400 lines (CI warns above 600), one ticket = one PR, answer AI comments first, and the five green checks.

## Task Commits

1. **Task 1 (tracer): repo rules as code with idempotent apply script.** `7b56ae2`
2. **Task 2: CODEOWNERS, release ruleset and PR template.** `32f4881`

Both commits went through the live husky/lint-staged hook (prettier on the JSON/MD files). Neither used `--no-verify`.

## GitHub Evidence (verbatim)

**Settings before (read 2026-11-08):** `allow_merge_commit:true, allow_rebase_merge:true, allow_squash_merge:true, allow_update_branch:false, delete_branch_on_merge:false, squash_merge_commit_message:"COMMIT_MESSAGES", squash_merge_commit_title:"COMMIT_OR_PR_TITLE", private:true`.

**Apply script run** (`SKIP_SHA_PINNING=1 scripts/apply-repo-rules.sh`). This is the full stdout and stderr:

```
Repository: ulbi-project-group-12/ulbigram
Step 1: applying merge settings from .github/repo-settings.json
{"allow_merge_commit":false,"allow_rebase_merge":false,"allow_squash_merge":true,"delete_branch_on_merge":true,"squash_merge_commit_title":"PR_TITLE"}
Step 2: requiring SHA-pinned actions
SKIP: SKIP_SHA_PINNING=1, Actions permissions left unchanged
Step 3: applying rulesets from .github/rulesets
GAP: rulesets are unavailable for this private repository on the GitHub Free plan (HTTP 403: Upgrade to GitHub Pro or make this repository public). Settings were applied; re-run this script after the repository is made public.
EXIT=3
```

The tracer gate ran the plan's verify a second time with the same result: rc=3, readback OK, name guard and prettier green.

**Raw 403 on listing rulesets** (`gh api -i repos/<repo>/rulesets`):

```
HTTP/2.0 403 Forbidden
{"message":"Upgrade to GitHub Pro or make this repository public to enable this feature.","documentation_url":"https://docs.github.com/rest/repos/rules#get-all-repository-rulesets","status":"403"}
```

**Raw 403 on creating the main ruleset** (`gh api -i -X POST repos/<repo>/rulesets --input .github/rulesets/main.json`):

```
HTTP/2.0 403 Forbidden
{"message":"Upgrade to GitHub Pro or make this repository public to enable this feature.","documentation_url":"https://docs.github.com/rest/repos/rules#create-a-repository-ruleset","status":"403"}
```

**Readback after apply:**
- `[.allow_squash_merge,.allow_merge_commit,.allow_rebase_merge,.delete_branch_on_merge,.squash_merge_commit_title]` → `[true,false,false,true,"PR_TITLE"]`
- `{allow_update_branch, squash_merge_commit_message}` → `{"allow_update_branch":true,"squash_merge_commit_message":"PR_BODY"}`
- `actions/permissions` → `{"enabled":true,"allowed_actions":"all","sha_pinning_required":false}` (unchanged, not attempted)

## Reported Gap (for README, 01-09, and the lead's D-30 decision)

- **Rulesets (TZ-CICD-04, TZ-FE-18, TZ-BE-17):** these cannot be applied while the repo is private on GitHub Free. GitHub returns HTTP 403 "Upgrade to GitHub Pro or make this repository public to enable this feature." for both GET and POST. Until then:
  - Direct pushes to `main` are not blocked by GitHub.
  - Required reviews and checks are not enforced.
  - CODEOWNERS is advisory only.

  What bounds the risk today is that only the lead has write access; the other 4 members are read-only. Fix: make the repo public (or upgrade the plan), then run `scripts/apply-repo-rules.sh`. It should exit 0 and create `main` and `release`. If GitHub rejects `actor_id: 1` for OrganizationAdmin (assumption A7), set it to `null` and re-run.
- **Actions SHA pinning, needs lead to run:** `REPO=ulbi-project-group-12/ulbigram scripts/apply-repo-rules.sh` (without `SKIP_SHA_PINNING`), or directly: `gh api -X PUT repos/ulbi-project-group-12/ulbigram/actions/permissions -F enabled=true -f allowed_actions=all -F sha_pinning_required=true`. Whether Free accepts it is still unverified (A8). If it doesn't, the script prints `WARN:` and continues.

## Verification Evidence

- **Task 1 verify (full plan command, run twice):**
  - shellcheck is clean.
  - The jq structure gate returns `true`: all 5 rules are present, every bypass is in pull_request mode, every context has 15368.
  - The ruleset contexts (sorted) equal the ci.yml job names minus `pr-hygiene`: `build lint name-guard test typecheck`.
  - The script exits 3, and the readback matches.
  - `pnpm check:name` (50 tracked files clean) and `pnpm format:check` are green.
- **Task 1 acceptance:**
  - `allowed_merge_methods` is `squash`.
  - `git ls-files -s` mode is `100755`.
  - `! grep -q 'set -x'` passes, after a comment was reworded (see Deviations).
- **Task 2 verify:**
  - The release jq gate returns `true`.
  - The CODEOWNERS greps pass: `.planning/`, `.github/` and `pnpm-workspace.yaml` have owner lines, the lockfile has none, and the contracts placeholder is present.
  - The template has the exact `## Done when…` heading, the bare `UL-` line and `[no-ticket]`.
  - Name guard (53 files) and prettier are green.
- **Task 2 acceptance:**
  - 16 `@soadap` owner lines (at least 16 required).
  - 3 `- [ ]` items.
  - `400` and `600` are both present.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Comment tripped the no-xtrace acceptance grep**
- **Found during:** Task 1
- **Issue:** The header comment "Never add `set -x` here" contained the literal string, so `! grep -q 'set -x'` failed.
- **Fix:** I reworded it to "Never enable shell xtrace here".
- **Files modified:** scripts/apply-repo-rules.sh
- **Commit:** 7b56ae2

**2. [Scope - lead brief] Added `SKIP_SHA_PINNING=1` and did not run step 2**
- **Found during:** Task 1
- **Issue:** The plan's step 2 PUTs the Actions permissions. The lead's brief authorized only the merge-settings PATCH and the ruleset attempt on GitHub.
- **Fix:** I added an env opt-out (default off, so the lead's run applies it as planned). I ran the script and the verify with `SKIP_SHA_PINNING=1`. The command is recorded under "needs lead to run". The plan's `WARN:`/accepted outcome for `sha_pinning_required` is therefore "not attempted".
- **Files modified:** scripts/apply-repo-rules.sh
- **Commit:** 7b56ae2

## Known Stubs

None. The three empty `- [ ]` items and the bare `UL-` line in the PR template are intentional fill-in placeholders for PR authors.

## Threat Flags

None. No new surface beyond the plan's threat model (T-01-26..T-01-30).

## Next Phase Readiness

- 01-09 can quote the GAP text above in the README and link `scripts/apply-repo-rules.sh` as the one-command apply for the day the repo goes public.
- Open requirements: TZ-CICD-04, TZ-FE-18 and TZ-BE-17 stay open until the rulesets are enforced. TZ-CICD-05 waits for the 01-09 branch docs and the gated linear-history rule.

## Self-Check: PASSED

All 7 files exist, and both task commits (`7b56ae2`, `32f4881`) are ancestors of HEAD.
