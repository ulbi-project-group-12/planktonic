---
phase: quick-261110-idz
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - packages/config/product.ts
  - README.md
  - .claude/CLAUDE.md
  - .planning/PROJECT.md
  - .planning/REQUIREMENTS.md
  - .planning/ROADMAP.md
  - .planning/research/SUMMARY.md
autonomous: true
requirements: [QUICK-261110-idz]

estimate:
  tokens: 25000
  raw_tokens: 25000
  tasks: 3
  confidence: low

must_haves:
  truths:
    - "packages/config/product.ts exports PRODUCT_DISPLAY_NAME = 'planktonic' and PRODUCT_SLUG = 'planktonic' (PRODUCT_IMAGE_PREFIX follows the slug)"
    - "`node scripts/check-product-name.mjs` and `node scripts/check-product-name.mjs --expect-image-prefix planktonic` both exit 0; the 21 name-guard tests still pass"
    - "README shows the title planktonic, clones https://github.com/ulbi-project-group-12/planktonic.git into `cd planktonic`, names images ghcr.io/ulbi-project-group-12/planktonic-{web,api}, and its Renaming section is a checklist for any future rename, not a promise of a later task"
    - "No case-insensitive old-name hit remains anywhere in the tree except .planning/phases/01-*, this quick-task directory, and .planning/STATE.md"
    - ".planning/phases/**, scripts/**, .github/**, package.json files and pnpm-lock.yaml are byte-identical to the base commit"
  artifacts:
    - path: packages/config/product.ts
      provides: "Single source of the product name (D-33) set to planktonic"
      contains: "PRODUCT_SLUG = 'planktonic'"
    - path: README.md
      provides: "Public entry doc using the new name, clone URL and GHCR path"
      contains: "ulbi-project-group-12/planktonic.git"
    - path: .claude/CLAUDE.md
      provides: "Agent instructions using the new name"
      contains: "**planktonic**"
    - path: .planning/PROJECT.md
      provides: "Project doc + key-decision row recording the rename"
      contains: "renamed to planktonic on 2026-11-10"
  key_links:
    - from: packages/config/product.ts
      to: scripts/check-product-name.mjs
      via: "dynamic import of PRODUCT_DISPLAY_NAME / PRODUCT_SLUG / PRODUCT_IMAGE_PREFIX; guard terms follow the source"
      pattern: "PRODUCT_IMAGE_PREFIX = PRODUCT_SLUG"
    - from: .github/workflows/ci.yml (name-guard job)
      to: packages/config/product.ts
      via: "--expect-image-prefix ${{ vars.PRODUCT_SLUG || github.event.repository.name }} must equal PRODUCT_IMAGE_PREFIX"
      pattern: "expect-image-prefix"
---

<!-- planner-discipline-allow: ulbigram -->
<!-- planner-discipline-allow: (working name) -->
<!-- planner-discipline-allow: working name -->

<objective>
Rename the product from its working name `ulbigram` to the team's chosen name `planktonic`, everywhere outside the Phase 1 historical record.

Purpose: the name lives in one source (Phase 1 D-33) and the `name-guard` check (D-35) derives its banned terms from that source, so the code change is one file. The rest is docs that still say the old name or call it a working name.
Output: updated `packages/config/product.ts`, README.md, .claude/CLAUDE.md, .planning/PROJECT.md, .planning/REQUIREMENTS.md, .planning/ROADMAP.md and .planning/research/SUMMARY.md, in three atomic commits.

Scope notes:
- Work only in this worktree, on branch `claude/rename-planktonic-15a633`. Do NOT rename any folder on disk. The worktree's own absolute path contains the old name, but the guard checks only repo-relative tracked paths, so that is fine.
- Out of scope, done separately by the lead: renaming the GitHub repo to `ulbi-project-group-12/planktonic`, `git remote set-url`, repo variables, and the test release (README checklist steps 1, 3 and 5). The orchestrator, not the executor, updates `.planning/STATE.md`.
- Leave `.planning/phases/**` untouched. Phase 1 artifacts keep the old name as historical record.
- Do NOT edit `scripts/check-product-name.mjs`, its tests or its allowlist (`ALLOWED_FILES` / `ALLOWED_PREFIXES`). The guard must pass on its own rules.
- No package.json, lockfile, Dockerfile, workflow, CONTRIBUTING.md or .env.example edits. The orchestrator grep found no old-name hits there, and Task 3's sweep confirms it.
- Do not run `pnpm install`, lint, typecheck or build. Run only the guard and its tests; the orchestrator runs the full suite afterwards.
- Every path below is relative to the repo root; run commands from the checkout root.

Baseline at HEAD 9dd3549 (recorded at plan time): `node scripts/check-product-name.mjs` exits 0 ("59 tracked files clean"), `--expect-image-prefix planktonic` exits 1 (prefix mismatch), `node --test scripts/check-product-name.test.mjs` gives 21 pass / 0 fail, and the repo-wide old-name sweep (Task 3) finds 19 lines.
</objective>

<execution_context>
@~/.claude/gsd-core/workflows/execute-plan.md
@~/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.claude/CLAUDE.md
@packages/config/product.ts
@scripts/check-product-name.mjs
@README.md
</context>

<tasks>

<task type="tracer">
  <name>Task 1: Rename the single source to planktonic and prove the guard follows it</name>
  <files>packages/config/product.ts</files>
  <read_first>packages/config/product.ts, scripts/check-product-name.mjs (lines 27-95: SOURCE, ALLOWED_FILES, the --expect-image-prefix check)</read_first>
  <action>
This is the end-to-end tracer. One source edit flows through the guard's term derivation, its tracked-file scan and its image-prefix check, which is the same path CI's `name-guard` job runs.

In packages/config/product.ts:
1. Set `PRODUCT_DISPLAY_NAME` to `'planktonic'` (line 17).
2. Set `PRODUCT_SLUG` to `'planktonic'` (line 20). This is lowercase letters only, so it matches the guard's slug regex.
3. Leave `PRODUCT_IMAGE_PREFIX = PRODUCT_SLUG` unchanged. It follows the slug, so the images become `planktonic-web` / `planktonic-api` under the repo owner (D-34).
4. Replace the two comment lines 3-4, which start with `// "ulbigram" is a working name.`, with exactly these two lines:
   - `// The product name is "planktonic". To rename it, follow the README section`
   - `// "Renaming the project"; the code change is this one file plus the PRODUCT_* env values.`
   The README pointer stays for future renames. The old name must not appear in this file afterwards. product.ts is on the guard allowlist, but Task 3's sweep allows the old name only in the Phase 1 history, this quick dir and STATE.md, and that sweep wins over the orchestrator's suggested wording.
5. Leave every other comment line (D-33/D-34/D-35 notes, the type-stripping note) unchanged.

Then run the guard. The new terms are `planktonic`. README.md, .claude/CLAUDE.md and `.planning/**` (including this plan) are allowlisted, so nothing else needs to change for the guard to pass. If it reports a hit, fix that file, not the guard.

Commit only this file: `git add packages/config/product.ts && git commit -m "chore(config): rename product to planktonic [no-ticket]" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`. The husky pre-commit hook runs lint-staged (prettier + eslint); node_modules is present in this worktree.
  </action>
  <verify>
    <automated>node scripts/check-product-name.mjs && node scripts/check-product-name.mjs --expect-image-prefix planktonic && ! node scripts/check-product-name.mjs --expect-image-prefix ulbigram && node --test scripts/check-product-name.test.mjs && test "$(grep -c "^export const PRODUCT_DISPLAY_NAME = 'planktonic';$" packages/config/product.ts)" = 1 && test "$(grep -c "^export const PRODUCT_SLUG = 'planktonic';$" packages/config/product.ts)" = 1 && test "$(grep -ci 'ulbigram' packages/config/product.ts)" = 0 && test "$(grep -c 'Renaming the project' packages/config/product.ts)" = 1</automated>
  </verify>
  <done>Both guard invocations exit 0; the old-prefix invocation now fails (exit 1), which proves the prefix moved; 21/21 guard tests pass; product.ts holds both planktonic exports, no old-name text and the README pointer; one commit `chore(config): rename product to planktonic [no-ticket]` touching only packages/config/product.ts.</done>
</task>

<task type="auto">
  <name>Task 2: Rename the product in README.md and .claude/CLAUDE.md</name>
  <files>README.md, .claude/CLAUDE.md</files>
  <read_first>README.md (lines 1-30 and 94-140), .claude/CLAUDE.md (lines 1-20)</read_first>
  <action>
README.md. Keep the 100-column hard wrap the file already uses (printWidth 100):
1. Line 1: change the title to `# planktonic`.
2. Lines 3-4: replace the two intro lines with these two lines, which drop the working-name parenthetical:
   - `Welcome to planktonic, a Slack-like work messenger for development teams, built by`
   - `ulbi-project-group-12. Status: Phase 1 foundation (monorepo, CI, release pipeline).`
   Leave line 5, about `apps/web` / `apps/api` placeholders, unchanged.
3. Quick start, lines 25-26: change the clone URL to `https://github.com/ulbi-project-group-12/planktonic.git` and the next line to `cd planktonic`.
4. "Renaming the project", line 98 (the line that begins `The rename itself will be` and ends `The checklist:`): replace it with this single line: `The product name lives in `packages/config/product.ts`. To rename the product, follow this checklist:`. The intro no longer promises a later task. Keep checklist items 1-5 as they are, so any future rename can use them.
5. Releases, line 136: change the GHCR line so it reads `` `ghcr.io/ulbi-project-group-12/planktonic-{web,api}`. Each image is tagged with the release tag `` and the rest of the line stays the same.
6. Change nothing else in README.md.

.claude/CLAUDE.md (the Project block mirrors .planning/PROJECT.md "What This Is", so Task 3 makes the same wording change there):
1. Line 5: `**planktonic**`.
2. Line 7: replace the leading `ulbigram (working name) is` with `planktonic is`. The rest of the paragraph stays.
3. Line 18 (Release constraint): change the GHCR path to `ghcr.io/ulbi-project-group-12/planktonic-*`.
4. Do not touch the managed "Developer Profile" block or any other line.

Run the guard again. Both files are allowlisted, so the new name is allowed there. Commit both files: `git add README.md .claude/CLAUDE.md && git commit -m "docs(repo): rename product to planktonic in README and CLAUDE.md [no-ticket]" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`.
  </action>
  <verify>
    <automated>node scripts/check-product-name.mjs --expect-image-prefix planktonic && test "$(grep -ci 'ulbigram' README.md)" = 0 && test "$(grep -ci 'ulbigram' .claude/CLAUDE.md)" = 0 && test "$(grep -c '^# planktonic$' README.md)" = 1 && test "$(grep -c '^git clone https://github.com/ulbi-project-group-12/planktonic.git$' README.md)" = 1 && test "$(grep -c '^cd planktonic$' README.md)" = 1 && test "$(grep -cF 'ghcr.io/ulbi-project-group-12/planktonic-{web,api}' README.md)" = 1 && test "$(grep -ci 'working name' README.md)" = 0 && test "$(grep -c 'later `/gsd-quick` task' README.md)" = 0 && test "$(grep -c '^## Renaming the project$' README.md)" = 1 && test "$(grep -c '^5\. Publish a test release' README.md)" = 1 && test "$(grep -c '^\*\*planktonic\*\*$' .claude/CLAUDE.md)" = 1 && test "$(grep -c '^planktonic is a Slack-like work messenger' .claude/CLAUDE.md)" = 1 && test "$(grep -cF '(working name)' .claude/CLAUDE.md)" = 0 && test "$(grep -cF 'ghcr.io/ulbi-project-group-12/planktonic-*' .claude/CLAUDE.md)" = 1</automated>
  </verify>
  <done>README title, intro, clone URL, `cd`, GHCR line and Renaming intro use planktonic. The 5-step checklist is intact and there is no working-name or later-task wording. CLAUDE.md lines 5, 7 and 18 use planktonic with the "(working name)" note gone. The guard passes; one docs commit touches only these two files.</done>
</task>

<task type="auto">
  <name>Task 3: Rename the product in the .planning docs and run the repo-wide sweep</name>
  <files>.planning/PROJECT.md, .planning/REQUIREMENTS.md, .planning/ROADMAP.md, .planning/research/SUMMARY.md</files>
  <read_first>.planning/PROJECT.md (lines 1-6, 55-75 and the last line), .planning/ROADMAP.md (line 1 and line 44)</read_first>
  <action>
.planning/PROJECT.md:
1. Line 1: `# planktonic`.
2. Line 5: replace the leading `ulbigram (working name) is` with `planktonic is`, the same wording as CLAUDE.md line 7. The rest of the paragraph stays.
3. Line 60 (Release constraint): change the GHCR path to `ghcr.io/ulbi-project-group-12/planktonic-*`.
4. Line 70 (key-decision row "Product name in one source ... + CI name guard"): keep the Decision cell. Set the Rationale cell to `The working name had to be replaceable in one place; rename via `/gsd-quick` (README checklist)` and the Outcome cell to `✓ Good — renamed to planktonic on 2026-11-10 (quick task 261110-idz)`. Keep the table pipes aligned the way the neighbouring rows are. Cite the quick task by ID only, because its directory slug contains the old name.
5. Last line: change the footer to `*Last updated: 2026-11-10 after quick task 261110-idz (product renamed to planktonic)*`.

.planning/REQUIREMENTS.md line 1: `# Requirements: planktonic`.

.planning/ROADMAP.md:
1. Line 1: `# Roadmap: planktonic`.
2. Line 44 (Phase 1 success criterion 5): change only the image path to `ghcr.io/ulbi-project-group-12/planktonic-{web,api}:<tag>`. Do not touch the Phase 1.1 "App skeletons (team)" entry, plan lists or checkboxes. There is no Phase 1.1 rename item, and none should be added.

.planning/research/SUMMARY.md line 3: change only the name, to `**Project:** planktonic (Slack-like work messenger, Ulbi TV stream 3, group 12)`. Leave the rest of the research verbatim.

Do NOT edit anything under .planning/phases/, and do not edit .planning/STATE.md (the orchestrator owns it).

Then run the repo-wide sweep in <verify>. It must print nothing for the old name outside the three allowed locations. If it finds a stray hit in any other file, fix that file with the same kind of rename and add the fix to this task's commit. Never fix a hit by editing the guard or its allowlist.

Commit these files: `git add .planning/PROJECT.md .planning/REQUIREMENTS.md .planning/ROADMAP.md .planning/research/SUMMARY.md && git commit -m "docs(planning): rename product to planktonic in project docs [no-ticket]" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`. Do not stage this quick-task directory; the orchestrator commits the PLAN and SUMMARY.
  </action>
  <verify>
    <automated>test -z "$(git grep --untracked -n -i ulbigram -- . ':(exclude).planning/phases/01-*' ':(exclude).planning/quick/261110-idz-*' ':(exclude).planning/STATE.md')" && test -z "$(git grep --untracked -n 'ulbi-project-group-12/ulbigram' -- . ':(exclude).planning/phases/01-*' ':(exclude).planning/quick/261110-idz-*')" && git diff --quiet 9dd3549 -- .planning/phases .planning/STATE.md scripts .github package.json apps/web/package.json apps/api/package.json packages/config/package.json packages/contracts/package.json pnpm-lock.yaml CONTRIBUTING.md .env.example && test "$(grep -c '^# planktonic$' .planning/PROJECT.md)" = 1 && test "$(grep -cF '(working name)' .planning/PROJECT.md)" = 0 && test "$(grep -cF 'renamed to planktonic on 2026-11-10 (quick task 261110-idz)' .planning/PROJECT.md)" = 1 && test "$(grep -c '^# Requirements: planktonic$' .planning/REQUIREMENTS.md)" = 1 && test "$(grep -c '^# Roadmap: planktonic$' .planning/ROADMAP.md)" = 1 && test "$(grep -cF 'ghcr.io/ulbi-project-group-12/planktonic-{web,api}:<tag>' .planning/ROADMAP.md)" = 1 && test "$(grep -c '^\*\*Project:\*\* planktonic (' .planning/research/SUMMARY.md)" = 1 && node scripts/check-product-name.mjs --expect-image-prefix planktonic && node --test scripts/check-product-name.test.mjs</automated>
  </verify>
  <done>The repo-wide sweep is empty (baseline was 19 lines), with no old-name repo URL left outside history. The Phase 1 directory, STATE.md, scripts, workflows, package manifests, lockfile, CONTRIBUTING.md and .env.example are unchanged since 9dd3549. PROJECT.md records the rename in its key-decision row and footer. The guard and its 21 tests pass. The commit `docs(planning): rename product to planktonic in project docs [no-ticket]` touches only the four .planning docs, plus any stray-hit fix.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| product.ts → CI `name-guard` → `release.yml` | The single source must agree with the repo-derived image name; a mismatch blocks merges or pushes images under an unexpected name |
| repo docs → contributors/agents | README clone URL and CLAUDE.md are copied into clones and agent prompts; a stale URL or name sends people to the wrong remote |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-261110-01 | Tampering | scripts/check-product-name.mjs allowlist | medium | mitigate | Plan forbids editing the guard, its tests or ALLOWED_FILES/ALLOWED_PREFIXES; Task 3 `git diff --quiet 9dd3549 -- scripts .github` proves they are unchanged |
| T-261110-02 | Spoofing | GHCR image names (`planktonic-{web,api}`) | low | accept | Images are only pushed by `release.yml` with `GITHUB_TOKEN` under the repo owner; the new packages link to the repo on first push. The old `ulbigram-*` packages stay until the lead deletes them, and nothing deploys from them yet (Phase 4) |
| T-261110-03 | Repudiation | .planning/phases/01-* historical record | low | mitigate | Plan forbids edits there; Task 3 diff check proves the Phase 1 directory and STATE.md are byte-identical to 9dd3549 |
| T-261110-04 | Denial of Service | CI `name-guard` on this branch's PR | low | accept | Until the lead renames the GitHub repo (or sets `vars.PRODUCT_SLUG=planktonic`), CI compares against the old repo name and `name-guard` fails. This is expected and already documented in README checklist step 2; merge after the repo rename |
| T-261110-SC | Tampering | npm/pip/cargo installs | low | accept | No package installs, dependency, lockfile or manifest changes in this plan (Task 3 diff check covers pnpm-lock.yaml and package.json files) |
</threat_model>

<verification>
Run from the checkout root after all three commits:
- `node scripts/check-product-name.mjs` and `node scripts/check-product-name.mjs --expect-image-prefix planktonic` exit 0.
- `node --test scripts/check-product-name.test.mjs` gives 21 pass / 0 fail.
- `git grep --untracked -n -i ulbigram -- . ':(exclude).planning/phases/01-*' ':(exclude).planning/quick/261110-idz-*' ':(exclude).planning/STATE.md'` prints nothing.
- `git log --oneline 9dd3549..HEAD` shows the three commits (chore(config), docs(repo), docs(planning)), each ending with the Co-Authored-By trailer (`git log -3 --format=%B | grep -c 'Co-Authored-By: Claude Opus 5.5'` gives 3).
- `git diff --stat 9dd3549..HEAD` lists only the seven files in `files_modified`, plus any stray-hit fix from Task 3.
</verification>

<success_criteria>
- The product is named planktonic in the single source, README, .claude/CLAUDE.md and the live .planning docs.
- The name guard passes with the new image prefix; its code, tests and allowlist are untouched.
- The old name survives only in the Phase 1 historical record, this quick-task directory and STATE.md history.
- The README "Renaming the project" checklist remains usable for any future rename.
</success_criteria>

<output>
Create `.planning/quick/261110-idz-rename-product-ulbigram-to-planktonic/261110-idz-SUMMARY.md` when done, with `status: complete` in its frontmatter. Note for the orchestrator: (1) update STATE.md, including that Phase 1 artifacts under .planning/phases/01-* keep the old name as historical record; (2) the PR's `name-guard` check passes only after the GitHub repo is renamed to planktonic (or `vars.PRODUCT_SLUG` is set).
</output>
