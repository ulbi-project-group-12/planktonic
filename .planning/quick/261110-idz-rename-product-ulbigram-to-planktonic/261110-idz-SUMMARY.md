---
phase: quick-261110-idz
plan: 01
subsystem: config/docs
tags: [rename, product-name, name-guard]
status: complete
requires: []
provides:
  - "PRODUCT_DISPLAY_NAME / PRODUCT_SLUG / PRODUCT_IMAGE_PREFIX = planktonic"
affects:
  - "CI name-guard (expects image prefix planktonic)"
  - "release.yml image names (planktonic-{web,api}) once the repo is renamed"
tech-stack:
  added: []
  patterns: []
key-files:
  created: []
  modified:
    - packages/config/product.ts
    - README.md
    - .claude/CLAUDE.md
    - .planning/PROJECT.md
    - .planning/REQUIREMENTS.md
    - .planning/ROADMAP.md
    - .planning/research/SUMMARY.md
decisions:
  - "Product renamed from its working name to planktonic; Phase 1 artifacts keep the old name as historical record"
metrics:
  duration: "~2 min"
  completed: 2026-11-10
actuals:
  tokens: 3100
  tasks: 3
  commits: 3
commits: 3
plan_head_before: 9dd35493e44ec22e9f40d32c22e3751387da2d0d
plan_head_after: 3d32df5959b5c1fb9026676e1cde9896a3a00adb
---

# Quick Task 261110-idz: Rename product to planktonic Summary

The product name source (`packages/config/product.ts`) now says `planktonic`. The name guard picks
up the new name with no changes to the guard itself. README, CLAUDE.md and the live `.planning`
docs use the new name, and nothing outside the Phase 1 history still says "working name".

## Tasks

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Rename the single source and prove the guard follows it (tracer) | 8a204c0 | packages/config/product.ts |
| 2 | Rename in README.md and .claude/CLAUDE.md | 8ee09ce | README.md, .claude/CLAUDE.md |
| 3 | Rename in .planning docs + repo-wide sweep | 3d32df5 | .planning/PROJECT.md, REQUIREMENTS.md, ROADMAP.md, research/SUMMARY.md |

## Verification

- `node scripts/check-product-name.mjs` and `--expect-image-prefix planktonic` both exit 0 ("59 tracked files clean").
- `--expect-image-prefix ulbigram` now exits 1, which shows the image prefix moved.
- `node --test scripts/check-product-name.test.mjs`: 21 pass / 0 fail.
- Repo-wide old-name sweep (excluding `.planning/phases/01-*`, this quick dir and STATE.md): empty, down from 19 lines at the start.
- `git diff --quiet 9dd3549` covers `.planning/phases`, STATE.md, scripts, .github, all package.json files, pnpm-lock.yaml, CONTRIBUTING.md and .env.example: no changes.
- `git diff --stat 9dd3549..HEAD`: exactly the 7 planned files. All 3 commits carry the Co-Authored-By trailer. The husky/lint-staged hook ran on each commit.

## Deviations from Plan

**1. [Rule 1 - Formatting] README "Renaming the project" intro wrapped onto two lines**
- **Found during:** Task 2
- **Issue:** The plan gave the new intro as a single line, but it is 101 characters, which breaks
  the 100-column hard wrap the plan also told me to keep.
- **Fix:** Wrapped after "follow this" so the second line reads `checklist:`. The wording is
  unchanged and every Task 2 check passes.
- **Files modified:** README.md
- **Commit:** 8ee09ce

## Notes for the orchestrator

1. Update `.planning/STATE.md`. Note there that the Phase 1 artifacts under `.planning/phases/01-*`
   keep the old name on purpose, as historical record.
2. The PR's CI `name-guard` check only passes after the GitHub repo is renamed to `planktonic` or
   `vars.PRODUCT_SLUG=planktonic` is set. Until then CI compares against the old repo name
   (README checklist step 2). The lead handles the repo rename, `git remote set-url`, repo
   variables and the test release (checklist steps 1, 3 and 5).

## Self-Check: PASSED

- FOUND: all 7 modified files
- FOUND: 8a204c0, 8ee09ce, 3d32df5 (ancestors of HEAD)
