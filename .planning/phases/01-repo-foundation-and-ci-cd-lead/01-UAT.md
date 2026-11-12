---
status: complete
phase: 01-repo-foundation-and-ci-cd-lead
source: [01-01-SUMMARY.md, 01-02-SUMMARY.md, 01-03-SUMMARY.md, 01-04-SUMMARY.md, 01-05-SUMMARY.md, 01-06-SUMMARY.md, 01-07-SUMMARY.md, 01-08-SUMMARY.md, 01-09-SUMMARY.md]
started: 2026-11-08T18:40:00Z
updated: 2026-11-12T06:27:56Z
---

## Current Test

[testing complete]

## Tests

### 1. Cold Start Smoke Test (clean clone → pipeline)
expected: A fresh clone with Node 26.13.0 and pnpm 12.15.0 runs `pnpm install --frozen-lockfile` and `pnpm turbo run lint typecheck test build --force` to 14/14 tasks; `pnpm check:all` is green.
result: pass
source: automated
evidence: "01-VERIFICATION.md (clean clone of 2277304: 14/14, 0 cached; check:name/pins/format/lint:root green; test:root 51/51)"

### 2. Supply-chain gates refuse bad input
expected: A <14-day dependency fails with ERR_PNPM_NO_MATURE_MATCHING_VERSION, a wrong Node fails with ERR_PNPM_UNSUPPORTED_ENGINE, and a non-exact pin or an unknown workspace key fails check:pins.
result: pass
source: automated
evidence: "01-VERIFICATION.md probes; check-pins.test.mjs (30 negative cases); all 184 lockfile packages published ≤ 2026-10-23"

### 3. Pre-commit hook blocks bad staged code
expected: Committing a staged file with an explicit `any` fails in the husky + lint-staged hook.
result: pass
source: automated
evidence: "01-02-SUMMARY.md probe; re-run by the verifier in a scratch clone"

### 4. CI runs the five required checks on PRs and on main
expected: PR #1 shows lint, typecheck, test, build, name-guard (plus the non-blocking pr-hygiene) green on every push; the push to main after the merge is green.
result: pass
source: automated
evidence: "PR ulbi-project-group-12/ulbigram#1: 6/6 on every head; main @2277304 run 42520627484 success (pr-hygiene skipped, PR-only)"

### 5. Product name is renameable from one source and guarded
expected: The name lives only in packages/config/product.ts (plus README/.planning/.claude allowlist); the name-guard check fails on a planted literal (content, path, NUL/UTF-16 tricks) and passes on the clean tree.
result: pass
source: automated
evidence: "check-product-name.test.mjs 21 cases; CI name-guard green; README 'Renaming the project' checklist"

### 6. Publishing a GitHub Release builds images to GHCR
expected: Publishing pre-release v0.0.1-rc.1 from release/0.0 runs release.yml (verify → images web/api → deploy stub) and pushes ghcr.io/ulbi-project-group-12/ulbigram-web and -api, tagged v0.0.1-rc.1, 0.0.1-rc.1, sha-<short>, with no latest tag.
result: pass
source: automated
evidence: "release.yml run 42520726408 success; GHCR packages private, linked to the repo, tags [sha-2277304, v0.0.1-rc.1, 0.0.1-rc.1]; test release and tag deleted afterwards, images and release/0.0 kept"

### 7. Placeholder images are hardened
expected: Both images run as uid 1000, contain only package.json + src, cannot rewrite their own code, and print the build-arg version/name.
result: pass
source: automated
evidence: "01-05/01-06 SUMMARY probes; verifier local build; WR-08 fix"

### 8. Repo rules applied where the plan allows, gap documented
expected: Merge settings live (squash only, PR_TITLE, delete branch on merge); rulesets committed as code with apply script; GitHub returns 403 for rulesets on Free+private and README states that main is not protected yet; CODEOWNERS parses with 0 errors.
result: pass
source: automated
evidence: "gh api readback [true,false,false,true,PR_TITLE]; rulesets/branch-protection GET → 403 'Upgrade to GitHub Pro or make this repository public…'; codeowners/errors → []; SECURITY AR-05"

### 9. PR template pre-fills in the GitHub web form
expected: Opening the compare page for a new PR shows the description pre-filled with the template ("UL-" line, "## Done when…" with three checkboxes, "## How to test", "## Review rules").
result: pass
source: human (lead)

### 10. Lead sign-off on the 7 flagged prohibitions
expected: The lead agrees that none of these happened in Phase 1 (the verifier found no violation; they are flagged only because no automated test or authority enforces them): (1) no NestJS code/deps in apps/api; (2) no Next.js/React code/deps in apps/web; (3) no automatic (non-human) release path; (4) no `always` bypass on the main ruleset; (5) no committed secrets; (6) no visibility/collaborator/app/webhook changes; (7) no docs claiming main is protected.
result: pass
source: human (lead)

### 11. Release to GHCR from the republished repo
expected: Publishing a test pre-release `v0.0.1-rc.1` on `main` runs `release.yml`; `ghcr.io/ulbi-project-group-12/planktonic-web` and `planktonic-api` appear tagged `v0.0.1-rc.1`, `0.0.1-rc.1` and `sha-<short>`, with no `latest`. The test release and tag are deleted afterwards.
result: pass
source: automated (lead approved the test release)
evidence: "release run 43168128460 on 6d63f36: verify, images (web), images (api), deploy = success; GHCR planktonic-web and planktonic-api (private, linked to the repo) carry sha-6d63f36, v0.0.1-rc.1, 0.0.1-rc.1, no latest; release and tag deleted (gh release delete --cleanup-tag)"

### 12. Lead re-confirms the 7 flagged prohibitions after the republish
expected: Same 7 items as test 10, re-checked on the public repo. Making the repo public and giving the `devs` team write access were the lead's own decisions (allowed by the 01-08 rule); the verifier found no violation on 2026-11-12.
result: pass
source: human (lead)

## Summary

total: 12
passed: 12
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

[none yet]
