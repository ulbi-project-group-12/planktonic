---
phase: "1"
review_rounds: 2
critical: 0
warning_total: 14
warning_fixed: 14
info_total: 13
info_fixed: 2
info_deferred: 11
blocking_open: 0
updated: "2026-11-08"
---

# Phase 1 — Code Review Disposition

Two review rounds: `01-REVIEW.md` (round 1, 57 files) and `01-REVIEW-R2.md` (round 2, the 15 files the fixes touched). Fix details are in `01-REVIEW-FIX.md` (iterations 1 and 2). Neither round found anything Critical or High.

## Round 1

| ID | Severity | Finding (short) | Disposition | Commit |
|----|----------|-----------------|-------------|--------|
| WR-01 | warning | check-pins catalog regex stops at a column-0 comment | fixed | 23a46f0 |
| WR-02 | warning | check-pins ignores overrides / packageExtensions / catalogs | fixed | 4bd8c7f |
| WR-03 | warning | release.yml pushes images for any tag on any commit | fixed (extended in R2 WR-01) | e079a7c |
| WR-04 | warning | `latest=auto` regresses and races | fixed (`latest=false`) | 7a2a58e |
| WR-05 | warning | name guard misses paths and UTF-16 | fixed (extended in R2 WR-03) | 10cc831 |
| WR-06 | warning | `PRODUCT_IMAGE_PREFIX` hardcodes the org and is unused | fixed (slug-only; CI compares it) | d6b77ca |
| WR-07 | warning | lockfile has no code owner | fixed | d560d02 |
| WR-08 | warning | `COPY --chown=node` lets the runtime rewrite code | fixed | fc7879d |
| WR-09 | warning | apply script: org rulesets, stderr in JSON, late jq check, no pagination, resets allowed_actions | fixed | c4208a8 |
| WR-10 | warning | README deletes the release branch that the ruleset protects | fixed | be0ad0a |
| WR-11 | warning | CONTRIBUTING pre-push list misses CI steps | fixed (`pnpm check:all`) | f59b67b |
| IN-01 | info | lockfile allowlisted in the name guard needlessly | deferred: harmless; lockfile may hold the name later via workspace metadata |
| IN-02 | info | gha BuildKit cache in the publishing job | deferred: revisit in Phase 4 (release hardening) |
| IN-03 | info | pr-hygiene misses title edits and counts the lockfile | deferred: non-blocking advisory job |
| IN-04 | info | squash commit copies the PR template text | deferred: `squash_merge_commit_message` can switch to BLANK if noisy |
| IN-05 | info | main concurrency cancels pending runs | deferred: acceptable for now |
| IN-06 | info | README release cut doesn't fetch first | deferred: docs nit |
| IN-07 | info | Dockerfiles have no code owner | deferred: team owns apps in Phase 1.1 |
| IN-08 | info | `blockExoticSubdeps` / `trustPolicy` / `strictDepBuilds` unset | deferred: pnpm 12 defaults; revisit with Renovate |
| IN-09 | info | `fail-fast` may push only one image | deferred: re-run the release on failure (documented) |

## Round 2

| ID | Severity | Finding (short) | Disposition | Commit |
|----|----------|-----------------|-------------|--------|
| R2 WR-01 | warning | `verify` accepts any `release/*` branch; tag not tied to its line | fixed (+ `release-create.json`) | 91dfde6 |
| R2 WR-02 | warning | check-pins denylist misses `configDependencies`, `minimumReleaseAge: 0` | fixed (key allowlist, age ≥ 20160, `--ignore-pnpmfile`) | c0d59c1 |
| R2 WR-03 | warning | one NUL byte hides the name from the guard | fixed (latin1 + UTF-16 at both offsets) | c42b206 |
| R2 IN-01 | info | dead "tag moved" check | fixed (comment explains checkout already catches it) | 91dfde6 |
| R2 IN-02 | info | pre-release accepts leading zeros | fixed | 91dfde6 |
| R2 IN-03 | info | image-prefix check missing from `check:all` / release | deferred: CI `name-guard` covers it |
| R2 IN-04 | info | symlinks followed, dangling links skipped silently | deferred: no symlinks tracked |
