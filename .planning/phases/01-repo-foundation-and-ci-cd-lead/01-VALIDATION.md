---
phase: "1"
slug: "repo-foundation-and-ci-cd-lead"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
status: draft
nyquist_compliant: false
wave_0_complete: true
created: "2026-11-08"
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution. Source: 01-RESEARCH.md "## Validation Architecture".

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 5.0.5 (in `packages/contracts`) plus shell assertions with `gh`, `docker`, `jq` and actionlint (pinned Docker image) for repo-level criteria |
| **Config file** | `packages/contracts/vitest.config.ts` (Wave 0) |
| **Quick run command** | `pnpm turbo run lint typecheck test build` |
| **Full suite command** | `pnpm install --frozen-lockfile && pnpm format:check && pnpm turbo run lint typecheck test build` |
| **Estimated runtime** | ~60 seconds cold, ~5 seconds cached |

---

## Sampling Rate

- **After every task commit:** run the quick command plus the static greps for the files touched.
- **After every plan wave:** run the full suite, actionlint, and the Docker build loop (once Dockerfiles exist).
- **Before `/gsd-verify-work`:** the full suite is green from a clean clone; CI is green on the PR and on `main`; the merge-settings `gh api` check passes; the test release has run (or is explained).
- **Max feedback latency:** 120 seconds.

---

## Per-Task Verification Map

Filled in by the planner and executors from the plan tasks. Criterion-level map:

| Criterion | Requirement | Test Type | Automated Command | File Exists | Status |
|-----------|-------------|-----------|-------------------|-------------|--------|
| SC1 clean install + pipeline | TZ-PROCESS-06, TZ-FE-02, TZ-BE-02, TZ-FE-16, TZ-BE-15 | smoke | `D=$(mktemp -d) && git clone -q --branch gsd/phase-01-repo-foundation-and-ci-cd-lead . "$D" && cd "$D" && pnpm install --frozen-lockfile && pnpm turbo run lint typecheck test build` | ✅ | ✅ green |
| SC1 exact pins | TZ-PROCESS-06 | static | `! grep -REn '"[~^][0-9]' --include=package.json --exclude-dir=node_modules .` | ✅ | ✅ green |
| SC1 ≥14 days | TZ-PROCESS-06 | static | `grep -q '^minimumReleaseAge: 20160' pnpm-workspace.yaml && pnpm install --frozen-lockfile` | ✅ | ✅ green |
| SC1 lockfile + engines | TZ-FE-16, TZ-BE-15 | static | `git ls-files --error-unmatch pnpm-lock.yaml && grep -q '^engineStrict: true' pnpm-workspace.yaml && grep -q '"packageManager": "pnpm@12.15.0"' package.json && test "$(cat .nvmrc)" = 26.13.0` | ✅ | ✅ green |
| Lint/format configs shared | TZ-FE-10, TZ-FE-11, TZ-BE-10, TZ-BE-11, TZ-BE-16 | static | `pnpm turbo run lint && pnpm format:check` | ✅ | ✅ green |
| Contracts schema | D-03 | unit | `pnpm --filter @app/contracts test` | ✅ | ✅ green |
| Pre-commit hook | TZ-FE-12, TZ-BE-12 | integration | `test "$(git config core.hooksPath)" = .husky/_ && grep -q 'lint-staged' .husky/pre-commit` | ✅ | ✅ green |
| SC2 ci.yml valid + SHA-pinned | TZ-CICD-02, TZ-FE-20, TZ-BE-19 | static | actionlint (pinned image) && `! grep -En 'uses: [^.][^@]*@v[0-9]' .github/workflows/*.yml` | ✅ | ✅ green |
| SC2 green on PR and main | TZ-CICD-02 | e2e (orchestrator) | `gh pr checks <PR#>` shows lint, typecheck, test, build, name-guard = pass (`--required` lists nothing until the ruleset applies) ; `gh run list --workflow ci.yml --branch main --limit 1 --json conclusion --jq '.[0].conclusion'` = `success` | n/a | ⬜ pending |
| SC3 ruleset as code | TZ-CICD-04, TZ-FE-18, TZ-BE-17 | static | `jq -e '.rules \| map(.type) \| (index("pull_request") and index("required_status_checks") and index("non_fast_forward") and index("deletion"))' .github/rulesets/main.json` ; contexts = CI job names (lint, typecheck, test, build, name-guard) ; `scripts/apply-repo-rules.sh` exits 0 or 3 (3 = documented 403 gap) | ✅ | ✅ green |
| SC3 merge settings | TZ-CICD-05 | e2e | `gh api repos/ulbi-project-group-12/ulbigram --jq '[.allow_squash_merge,.allow_merge_commit,.allow_rebase_merge,.delete_branch_on_merge,.squash_merge_commit_title]'` = `[true,false,false,true,"PR_TITLE"]` | n/a | ✅ green |
| SC3 CODEOWNERS | TZ-CICD-04 | static+e2e | `grep -E '^/\.planning/\s+@soadap' .github/CODEOWNERS` ; `gh api repos/ulbi-project-group-12/ulbigram/codeowners/errors --jq '.errors \| length'` = `0` | ✅ | ✅ green (`codeowners/errors?ref=gsd/phase-01-…` = `{"errors":[]}` at 8632ea4) |
| SC4 PR template + rules docs | TZ-FE-18, TZ-CICD-05 | static | `grep -q 'Done when' .github/pull_request_template.md && grep -q 'feat/UL-' README.md && grep -q 'fix/UL-' CONTRIBUTING.md` | ✅ | ✅ green |
| SC5 release.yml | TZ-CICD-03 | static | actionlint && `grep -q 'packages: write' .github/workflows/release.yml && grep -q 'TODO(Phase 4)' .github/workflows/release.yml` | ✅ | ✅ green |
| SC5 images build + non-root | TZ-CICD-03 | integration | `for a in web api; do docker build -q -f apps/$a/Dockerfile --build-arg APP_VERSION=v0.0.0-ci --build-arg PRODUCT_NAME=acme -t local/$a:ci . && docker run --rm local/$a:ci \| grep -q "^@app/$a v0.0.0-ci for acme:" && test "$(docker run --rm local/$a:ci id -u)" = 1000; done` | ✅ | ✅ green |
| SC5 test release in GHCR | TZ-CICD-03 | e2e (after merge) | publish `v0.0.1-rc.1` from `release/0.0`; `gh run list --workflow release.yml --limit 1 --json conclusion` = success | n/a | ⬜ pending |
| No secrets in repo | TZ-PROD-10 | static | `git ls-files \| grep -E '(^\|/)\.env($\|\.)' \| grep -v '\.env\.example$'` is empty ; `! grep -Ev '^[[:space:]]*(#\|$)' .env.example \| grep -E '=.+'` (non-comment lines carry no values) | ✅ | ✅ green |
| D-33 single name source | TZ-PROCESS-06 | static | `node --input-type=module -e "const m = await import('./packages/config/product.ts'); if (m.PRODUCT_IMAGE_PREFIX !== m.PRODUCT_SLUG) process.exit(1)"` (prefix holds no registry or owner since review fix WR-06; CI `name-guard` compares it with the repo-derived image name) | ✅ | ✅ green |
| D-35 name guard | TZ-BE-16 | unit + static | `pnpm check:name && pnpm test:root \| grep -qx '# fail 0'` ; planted-literal throwaway check exits 1 (01-03 Task 1) | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

### 01-09 gate run (2026-11-08)

Fresh clone of `gsd/phase-01-repo-foundation-and-ci-cd-lead` at `aae22e9`: frozen install, `format:check`, `check:pins` (5 manifests OK), `lint:root`, `check:name` (54 tracked files clean), `test:root` (`# pass 10`, `# fail 0`), Turbo `Tasks: 14 successful, 14 total` (cold), then `Cached: 14 cached, 14 total` / `FULL TURBO` (second run). Also: actionlint (pinned image) clean; web and api images print `@app/<app> v0.0.0-gate for acme: …`, run as uid 1000, and `/app` holds only `package.json` and `src`; merge settings read back `[true,false,false,true,"PR_TITLE"]`; secret scan clean (no tracked env file besides `.env.example`, no token prefix or PEM key header outside `.planning`). SC3 ruleset row: the committed JSON passes; applying it exits 3 (the documented Free-plan 403 gap, see 01-08-SUMMARY), not 0. Rows still pending need the PR, `main` or the test release (orchestrator).

---

### Per-task map (from the plans)

| Plan · Task | Wave | Automated command (abridged, full text in the plan) | Covers |
|-------------|------|-----------------------------------------------------|--------|
| 01-01 · T1 tracer | 1 | `pnpm install --frozen-lockfile && pnpm turbo run typecheck` → 1 successful | SC1, TZ-FE/BE-16/15, TZ-FE/BE-02 |
| 01-01 · T2 | 1 | `pnpm turbo run lint typecheck` → 2 successful; `.nvmrc` = 26.13.0; age/engine/catalog probes in a throwaway copy | SC1, TZ-FE/BE-10 |
| 01-02 · T1 tracer | 2 | hooksPath `.husky/_`, `pnpm format:check`, staged-lint-error probe blocks | TZ-FE/BE-11, TZ-FE/BE-12 |
| 01-02 · T2 | 2 | `pnpm check:pins && pnpm lint:root` (+ caret-range probe) | SC1 exact pins |
| 01-02 · T3 | 2 | `.env.example` names only; `.env` ignored; no tracked env files | TZ-PROD-10 |
| 01-03 · T1 tracer | 3 | `pnpm check:name` clean + planted literal → exit 1 | D-33, D-35 |
| 01-03 · T2 | 3 | `pnpm test:root` → `# fail 0`, ≥7 pass | D-35 |
| 01-04 · T1 tracer | 3 | `pnpm turbo run lint typecheck test build --filter=@app/contracts` → 4 successful + dist runtime check | D-03 |
| 01-04 · T2 | 3 | `pnpm --filter @app/contracts test` ≥11 passed; brand via `@ts-expect-error` | D-03 |
| 01-05 · T1 tracer | 4 | `--filter=@app/api` → 4 successful; exact placeholder line | D-02 |
| 01-05 · T2 | 4 | api docker build/run with and without build-args, uid 1000, `/app` contents | D-17, D-34 |
| 01-06 · T1 tracer | 5 | `--filter=@app/web` → 4 successful | D-02 |
| 01-06 · T2 | 5 | web docker loop + clean clone 14/14 | SC1, D-17 |
| 01-07 · T1 tracer | 6 | actionlint + 5 stable job names + SHA pins + clean-clone CI replay | SC2 |
| 01-07 · T2 | 6 | `scripts/pr-hygiene.sh` cases + injection probe + actionlint | D-14, D-24 |
| 01-07 · T3 | 6 | actionlint release.yml + derived-name greps + local image builds | SC5, D-15, D-16, D-34 |
| 01-08 · T1 tracer | 7 | ruleset jq gates + contexts = jobs + apply script exit 0/3 + settings readback | SC3, D-19..D-21, D-31 |
| 01-08 · T2 | 7 | CODEOWNERS / release ruleset / PR template greps | SC3, SC4, D-22, D-23 |
| 01-09 · T1 tracer | 8 | README phrase gates + clean-clone quick start 14/14 | SC4, D-18, D-25, D-36 |
| 01-09 · T2 | 8 | CONTRIBUTING phrase gates + name guard | SC4, D-24, D-25 |
| 01-09 · T3 | 8 | full clean-clone gate, actionlint, secret scan, remote head = HEAD, CODEOWNERS errors = 0 | SC1..SC5 local, D-26 |

## Wave 0 Requirements

- [x] `npm i -g pnpm@12.15.0` on the dev machine (corepack is not bundled with Node 26)
- [x] `packages/contracts/vitest.config.ts` + the schema test file (plan 01-04): covers D-03
- [x] `scripts/check-product-name.test.mjs` (plan 01-03): covers D-35
- [x] actionlint via the pinned Docker image (no install)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| PR template pre-fills in the web UI | TZ-FE-18 | The template only renders in GitHub's PR form | Open the phase PR (or "New pull request") and check the body is pre-filled |
| Pre-commit blocks a bad staged file | TZ-FE-12, TZ-BE-12 | Needs an interactive commit attempt | Stage a file with an `any` lint error → `git commit` fails; unstage it |
| Ruleset enforcement | TZ-CICD-04 | Plan-gated (403 on Free + private) | After the repo goes public, run the apply script and try a direct push to `main` (it must be rejected) |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 120s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
