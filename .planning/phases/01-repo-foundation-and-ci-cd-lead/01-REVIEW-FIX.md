---
phase: 01-repo-foundation-and-ci-cd-lead
fixed_at: 2026-11-08T18:09:18Z
review_path: .planning/phases/01-repo-foundation-and-ci-cd-lead/01-REVIEW-R2.md
iteration: 2
findings_in_scope: 3
fixed: 3
skipped: 0
info_fixed: 2
status: all_fixed
iteration_1:
  fixed_at: 2026-11-08T17:51:26Z
  review_path: .planning/phases/01-repo-foundation-and-ci-cd-lead/01-REVIEW.md
  findings_in_scope: 11
  fixed: 11
  skipped: 0
---

# Phase 1: Code Review Fix Report

**Fixed at:** 2026-11-08T17:51:26Z
**Source review:** .planning/phases/01-repo-foundation-and-ci-cd-lead/01-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 11 (WR-01..WR-11; there were no criticals, and `fix_scope` is critical_warning, so the 9 info findings are out of scope)
- Fixed: 11
- Skipped: 0

`workflow.use_worktrees` is `false`, so every edit and commit happened in the main checkout on `gsd/phase-01-repo-foundation-and-ci-cd-lead`. No worktree was created. Each commit went through the live husky/lint-staged pre-commit hook, without `--no-verify`.

## Fixed Issues

### WR-01: check-pins false pass when a column-0 comment sits inside `catalog:`

**Files modified:** `scripts/check-pins.mjs`, `scripts/check-pins.test.mjs` (new), `package.json`, `.github/workflows/ci.yml`, `README.md`
**Commit:** 23a46f0
**Applied fix:** I replaced the regex slice with a zero-dependency scanner that splits the file into top-level blocks and fails closed. Blank lines and comments at any indent no longer end a block. Flow-style `catalog:`, duplicate top-level keys, duplicate catalog entries and unparseable lines are now errors. The guard also prints `check-pins: N catalog entries OK`; the existing `check-pins: N manifests OK` line is unchanged, so the plan greps still match. I added `scripts/check-pins.test.mjs` and wired it into `test:root` and the CI `lint` job. The column-0 comment test fails on the old guard and passes on the new one.

### WR-02: check-pins ignored `overrides` and other resolution-changing keys

**Files modified:** `scripts/check-pins.mjs`, `scripts/check-pins.test.mjs`, `README.md`
**Commit:** 4bd8c7f
**Applied fix:**
- **Overrides:** workspace `overrides:`, `pnpm.overrides`, `resolutions` and npm `overrides` in any checked manifest are allowed only when every value is an exact `x.y.z`. That keeps the security-bump case open; ranges, `*`, `npm:` aliases and nested objects fail.
- **Rejected outright:** `packageExtensions`, `patchedDependencies`, `catalogs`, `pnpmfile` / `globalPnpmfile` in the workspace file, `pnpm.packageExtensions` / `pnpm.patchedDependencies` in a manifest, and `.pnpmfile.cjs` / `.pnpmfile.mjs`. The pnpmfile checks go beyond the review: they cover the same class of hook.
- **Manifest list:** it now comes from the `packages:` globs, with `node_modules` filtered out. `!` exclusions are ignored, which only makes the check stricter.

All ten new tests fail on the WR-01 version of the guard and pass now.

### WR-03: release.yml built and pushed images for any published tag

**Files modified:** `.github/workflows/release.yml`, `.github/rulesets/tags.json` (new), `README.md`, `scripts/apply-repo-rules.sh` (header comment only)
**Commit:** e079a7c
**Applied fix:**
- **New `verify` job:** it has only `contents: read` and checks out with `fetch-depth: 0` and `persist-credentials: false`. It fails unless three things hold:
  - the tag matches `^v(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(-[0-9A-Za-z-]+(\.[0-9A-Za-z-]+)*)?$`;
  - `refs/tags/$TAG^{commit}` still equals `github.sha`;
  - the commit is reachable from `origin/main` or `origin/release/<x>`. I followed your direction here: the review asked for release/* only.
- **`images` job:** it now has `needs: verify` and checks out `ref: ${{ github.sha }}`, so it builds exactly the verified commit.
- **Testing:** I extracted the step script and ran it against a scratch repo. A tag on release/0.1 passed, a tag on a feature branch failed, `v0.2` failed the format check, an rc tag on main passed, and a tag that had moved failed.
- **Tag ruleset:** I added `.github/rulesets/tags.json`: `v*` tags get `update` and `deletion` rules, with an OrganizationAdmin bypass in `always` mode, because tags never go through a PR. This differs from D-31's pull_request mode, and I documented why in the apply-script header and the README. `apply-repo-rules.sh` picks the file up automatically.

**Not done:** I did not add the optional "require a green `ci` run on the tagged SHA". `ci.yml` does not run on pushes to `release/*`, so hotfix squash commits on a release branch never get CI and the gate would block every hotfix. Adding it needs `release/**` push CI first, which is the lead's call.

### WR-04: `latest` moved backwards on a hotfix, and parallel releases raced for it

**Files modified:** `.github/workflows/release.yml`, `README.md`
**Commit:** 7a2a58e
**Applied fix:**
- **`latest` dropped:** metadata-action now has `flavor: latest=false`, and the README says deploys name an explicit version (Phase 4).
- **Concurrency kept per tag:** I did not follow the suggested single global group. GitHub cancels a *pending* run when a newer one joins the same group, so three releases published quickly would silently cancel the middle one. Without `latest`, runs for different tags write disjoint tags and cannot race. The workflow comment records this reasoning.

### WR-05: the name guard ignored file and directory names, and UTF-16 text

**Files modified:** `scripts/check-product-name.mjs`, `scripts/check-product-name.test.mjs`
**Commit:** 10cc831
**Applied fix:**
- **Paths:** every tracked path outside the allowlist is now checked, case-insensitively, including tracked files that are missing from the working tree.
- **UTF-16:** files with an `FF FE` / `FE FF` BOM are decoded as UTF-16LE/BE and scanned line by line. Other files that contain a NUL byte are tried in both UTF-16 byte orders.
- **Reporting:** a separate stdout line says how many binary files were checked only as UTF-16. The `N tracked files clean` line is unchanged.
- **Tests:** five new tests cover a path hit, the allowlisted path, UTF-16LE with a BOM (file:line), UTF-16BE with a BOM, and UTF-16LE without a BOM. They fail on the old guard and pass now.

### WR-06: `PRODUCT_IMAGE_PREFIX` was a second, unchecked source of the image name

**Files modified:** `packages/config/product.ts`, `scripts/check-product-name.mjs`, `scripts/check-product-name.test.mjs`, `.github/workflows/ci.yml`, `README.md`, `.planning/phases/01-repo-foundation-and-ci-cd-lead/01-VALIDATION.md`
**Commit:** d6b77ca
**Applied fix:** I chose to remove the hardcoded org rather than drop the export. D-33 lists the image prefix in `product.ts`, and 01-03-PLAN flags the export names as a costly contract.
- **New value:** `PRODUCT_IMAGE_PREFIX = PRODUCT_SLUG`, the bare image-name prefix with no registry and no owner. The owner always comes from `github.repository_owner`.
- **Guard:** it validates the prefix (exit 2 if it holds a `/` or uppercase) and accepts `--expect-image-prefix <name>`, compared case-insensitively. A mismatch exits 1.
- **CI:** the `name-guard` job passes `${{ vars.PRODUCT_SLUG || github.event.repository.name }}`, the same expression `release.yml` builds image names from, so `product.ts` and the pushed images cannot drift.
- **Checked against the live repo (read-only):** the repo is `ulbi-project-group-12/ulbigram` and no repo variables are set, so CI compares against `ulbigram` and passes.
- **Docs and tests:** I updated the VALIDATION D-33 row command and the README (single-source text, plus a rename-checklist note that name-guard fails until `product.ts` is updated) and added three tests.

### WR-07: pnpm-lock.yaml was unowned in CODEOWNERS

**Files modified:** `.github/CODEOWNERS`, `CONTRIBUTING.md`
**Commit:** d560d02
**Applied fix:** I added `/pnpm-lock.yaml @soadap` and replaced the incorrect rationale. CONTRIBUTING now says the catalog and the lockfile are both owned by the lead.

### WR-08: the Dockerfiles made the app code writable by the runtime user

**Files modified:** `apps/api/Dockerfile`, `apps/web/Dockerfile`
**Commit:** fc7879d
**Applied fix:** I dropped `--chown=node:node`. The code is now root-owned (0644 files, 0755 directories), and `USER node` stays. I built both images locally and checked:
- each prints its banner and runs as uid 1000;
- `/app` and `/app/src` are owned by root;
- `touch /app/x` and `touch /app/src/x` fail with "Permission denied".

The temporary images were removed.

### WR-09: the apply-repo-rules.sh upsert could hit an org ruleset, parse stderr as JSON, or fail half-applied

**Files modified:** `scripts/apply-repo-rules.sh`
**Commit:** c4208a8
**Applied fix:**
- **(c) Preflight:** before step 1 changes anything, the script now checks that `gh` and `jq` are installed and that every JSON input is valid with a ruleset name.
- **(a), (d) Listing:** rulesets are listed with `--paginate "repos/$REPO/rulesets?includes_parents=false"` and filtered on `source_type == "Repository"`. The pages are merged with `jq -s`.
- **(b) stderr:** it goes to a temp file, cleaned up by a trap, and the Free-plan gap check reads that file.
- **Duplicates:** all ids are resolved before any write, so a duplicate name aborts cleanly.
- **(e) Step 2:** it reads the current `allowed_actions` and sends it back unchanged.

shellcheck is clean. I ran the script offline against a stubbed `gh` with four scenarios:
- normal run: main was PUT by id, release was created even though an org ruleset with the same name existed, and the `gh` stderr notice did not break parsing;
- Free-plan gap: exit 3;
- duplicate name: exit 1 with no ruleset writes;
- missing jq: exit 1 with zero `gh` calls.

### WR-10: the README test-release cleanup stops working once the rulesets apply

**Files modified:** `README.md`
**Commit:** be0ad0a
**Applied fix:** The README now says release branches are kept: the `release` ruleset forbids deletion, and its PR-mode bypass cannot delete a branch. `release/0.0` may be deleted only while the rulesets are not applied yet; after that it stays. Once the rulesets apply, only an org admin can delete a `v*` tag (`tags.json`, WR-03).

### WR-11: CONTRIBUTING "Before pushing" omitted three CI checks

**Files modified:** `package.json`, `CONTRIBUTING.md`, `README.md`, `.github/workflows/ci.yml` (comment only)
**Commit:** f59b67b
**Applied fix:** I added a root script, `pnpm check:all`. It runs `format:check`, `check:pins`, `lint:root`, `turbo run lint typecheck test build`, `check:name` and `test:root` in CI order. CONTRIBUTING and the README script table point to it, and a `ci.yml` header comment says the script must follow the required jobs. I named it `check:all` rather than `ci` so it cannot clash with pnpm's own `ci` command name.

## Info Findings

None of the info findings were fixed; none fell out of a warning fix for free. IN-01..IN-09 remain open in REVIEW.md.

- **IN-05 / IN-03(a):** the CI concurrency and pr-hygiene triggers are unchanged.
- **IN-07:** the Dockerfiles are still not code-owned. That is an ownership decision for the lead, now more relevant since WR-08 hardened them.

## Verification

All gates ran in the main checkout, at f59b67b, with a clean tree:

| Check | Result |
| --- | --- |
| `pnpm install --frozen-lockfile` | rc 0 |
| `pnpm format:check` | rc 0 |
| `pnpm check:pins` | rc 0: 14 catalog entries, 5 manifests |
| `pnpm lint:root` | rc 0 |
| `pnpm check:name` | rc 0: 56 tracked files clean |
| `node scripts/check-product-name.mjs --expect-image-prefix ulbigram` | rc 0 |
| `pnpm test:root` | 38 pass, 0 fail |
| `pnpm turbo run lint typecheck test build` | 14 of 14 successful |
| `pnpm check:all` | rc 0 |
| actionlint (pinned image `rhysd/actionlint@sha256:b1934ee5…9315667`) on `ci.yml` and `release.yml` | rc 0 |
| `jq` parse of all three rulesets | OK |
| shellcheck on `scripts/*.sh` | clean |

For each guard fix (WR-01, WR-02, WR-05), the new tests were also run against the previous guard. They failed there, which proves each bypass is now caught.

## Residual Notes for the Lead

- **`release/*` branch creation is not restricted.** The `release` ruleset requires status checks on creation (`do_not_enforce_on_create: false`), but a writer can still create `release/anything` at a commit that has passed checks. The verify job then accepts it. `main` reachability remains the strong guarantee.
- **Lockfile ownership adds review load.** Owning the lockfile makes the lead a required reviewer on every dependency PR once the rulesets apply. The review suggested a CI lockfile-only-change check as an alternative.

---

_Fixed: 2026-11-08T17:51:26Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_

## Iteration 2

**Fixed at:** 2026-11-08T18:09:18Z
**Source review:** .planning/phases/01-repo-foundation-and-ci-cd-lead/01-REVIEW-R2.md
**Iteration:** 2

**Summary:**
- Findings in scope: 3 (R2 WR-01..WR-03; there were no criticals, and `fix_scope` is critical_warning)
- Fixed: 3
- Skipped: 0
- Info findings also fixed, at your direction: IN-01 and IN-02 (each 1–3 lines, in the WR-01 commit). IN-03 and IN-04 stay open.

As in iteration 1, `workflow.use_worktrees` is `false`. Every edit and commit happened in the main checkout on `gsd/phase-01-repo-foundation-and-ci-cd-lead`, through the live husky/lint-staged hook, without `--no-verify`. Nothing was pushed, and nothing was written to GitHub.

### R2 WR-01: `verify` accepted a tag on any `release/*` branch and never tied the version to the branch line

**Status:** fixed: requires human verification. The workflow condition is tested. The new ruleset cannot be applied or tested while the repo is private on GitHub Free.
**Files modified:** `.github/workflows/release.yml`, `.github/rulesets/release-create.json` (new), `scripts/apply-repo-rules.sh` (header comment only), `README.md`
**Commit:** 91dfde6
**Applied fix:**
- **Branch pinned to the tag's line.** After the semver match, `line="${BASH_REMATCH[1]}.${BASH_REMATCH[2]}"`. The filter is now `grep -Fx -e main -e "release/${line}"`, so `v0.2.1` needs `main` or exactly `release/0.2`. The error message names the expected branch.
- **Creation rule in a separate ruleset**, as you directed. `release.json` keeps its pull_request-mode bypass: that mode cannot exempt a branch creation, because creating a branch never goes through a PR, and changing it would break the 01-08 plan check, which requires every bypass in `release.json` to be `pull_request`. The new `.github/rulesets/release-create.json` (`release-create`) targets `refs/heads/release/*` with `rules: [{ "type": "creation" }]` and an OrganizationAdmin bypass in `always` mode. `apply-repo-rules.sh` already upserts every `.github/rulesets/*.json`, so only its header changed: it now lists both `always`-mode exceptions (tags, release-branch creation).
- **README.** The release-source bullet (formerly :136-138) describes the line-pinned rule. It says the "never becomes an image" guarantee holds once the rulesets are applied, and that until then any writer can push a `release/X.Y` branch, so the publisher should check the branch first. The repository-rules section no longer says the PR-only admin bypass is the only one: it names the tag and release-creation exceptions.
- **IN-01 (folded in):** the tag-moved check stays as belt and braces. Its comment now says actions/checkout already fails when the tag moved or was deleted.
- **IN-02 (folded in):** pre-release identifiers now follow SemVer 2.0.0 §9: `pre='(0|[1-9][0-9]*|[0-9]*[A-Za-z-][0-9A-Za-z-]*)'`, used as `(-${pre}(\.${pre})*)?`.

**Verification:** I extracted the step script, ran shellcheck on it (clean), and ran it against a scratch bare origin:

| Case | rc |
| --- | --- |
| R2 reproduction: `v0.2.0` on a feature commit pushed as `release/anything` | 1 |
| `v0.2.0` on `release/0.1` | 1 |
| `v5.0.0` on `release/0.1` | 1 |
| `v0.3.0` on a commit that is only on `xrelease/0.3` | 1 |
| `v0.1.0` on `release/0.1` | 0 |
| `v0.1.1-rc.1` on `release/0.1` | 0 |
| `v0.2.0` on `main` | 0 |
| `v0.0.1-rc.1` on `main` | 0 |
| `v1.0.0-rc.0` on `main` | 0 |
| `v1.0.0-0a.1` on `main` | 0 |
| `v1.0.0-rc.01` (IN-02) | 1 |
| `v1.0.0$(id)` | 1 |
| `v0.2` | 1 |

### R2 WR-02: check-pins was a denylist and missed `configDependencies`; it never read `minimumReleaseAge`

**Files modified:** `scripts/check-pins.mjs`, `scripts/check-pins.test.mjs`, `pnpm-workspace.yaml` (comment only), `.github/actions/setup/action.yml`, `README.md`
**Commit:** c0d59c1
**Applied fix:**
- **Allowlist.** `pnpm-workspace.yaml` may hold only `packages`, `catalog`, `overrides`, `minimumReleaseAge`, `engineStrict`, `savePrefix`, `catalogMode` and `updateNotifier`. Any other top-level key fails with "is not on the allowlist (extend scripts/check-pins.mjs in a reviewed PR)".
- **Named denials.** These keys get a clearer "is not allowed" message:
  - the round-1 five;
  - `configDependencies`, `minimumReleaseAgeExclude` and `dangerouslyAllowAllBuilds`, as you directed;
  - `include`, which pnpm 12.15.0 adds (its CHANGELOG headline: `pnpm-workspace.yaml` can delegate settings to other files and to config dependencies).
- **`minimumReleaseAge`.** It must be present, a plain unquoted integer with no nested body, and at least 20160.
- **`minimumReleaseAgeExclude` is forbidden**, as you directed. The README and the commented example in `pnpm-workspace.yaml` used to offer it as the emergency escape. Both now say an urgent security fix means changing the guard and the workspace file together in a reviewed PR.
- **`--ignore-pnpmfile` is kept** in `.github/actions/setup/action.yml`. I checked it with pnpm 12.15.0 on a scratch copy containing a `.pnpmfile.cjs` that writes a marker file:
  - with the flag: install rc 0, and no marker was written;
  - without it: the hook ran.

  Locally, `pnpm install --frozen-lockfile --ignore-pnpmfile` is rc 0 on the real tree, and the lockfile is unchanged. The bundled CHANGELOG (12.0.0-rc.4) says the flag also skips config-dependency pnpmfiles.
- **Tests (+10, 20 → 30):** the denied-key loop now covers `configDependencies`, `include` and `minimumReleaseAgeExclude`. New tests cover flow-style `configDependencies` plus inline `dangerouslyAllowAllBuilds`, an unknown key (`onlyBuiltDependencies`), `minimumReleaseAge` at 0, at 20159, quoted, and missing, and 43200 passing. Against the round-1 guard, 9 of the 10 fail; the 43200 case passes on both.

**R2 reproductions on a scratch clone, each appended on its own:** `configDependencies: { pnpm-plugin-evil: … }`, `dangerouslyAllowAllBuilds: true`, `minimumReleaseAgeExclude: ["*"]`, `onlyBuiltDependencies: [esbuild]` and `include:` each gave rc 1. Editing `minimumReleaseAge` to `0` in place also gave rc 1. The unmodified file still gives rc 0.

### R2 WR-03: one NUL byte disabled the name guard's UTF-8 content scan

**Files modified:** `scripts/check-product-name.mjs`, `scripts/check-product-name.test.mjs`
**Commit:** c42b206
**Applied fix:**
- **`decode()`.** It now returns `lines`: UTF-8, or the BOM's UTF-16 encoding, scanned line by line for `file:line` hits. For every file with a NUL byte it also returns `whole`, which joins these views: UTF-8, Latin-1, and UTF-16LE and UTF-16BE decoded from offset 0 and from offset 1.
- **Whole-file check.** When the line scan finds nothing, a hit in `whole` is reported as `<file>: product name literal in a file with NUL bytes (UTF-8, Latin-1 or UTF-16 view); a real binary that must embed it goes into ALLOWED_FILES`.
- **BOM files with a NUL get the whole-file check too.** This goes beyond the review. Before, `FF FE` + an ASCII name + one NUL was read only as UTF-16LE, so the ASCII bytes were garbled and passed: the same bypass class.
- **Stdout note.** On a green run it now says binary files were "checked as a whole (UTF-8, Latin-1, UTF-16 at both offsets), not line by line" instead of "raw bytes not scanned".
- **Tests (+3, 1 flipped):**
  - The NUL test now expects exit 1. It plants `acme-chat\0binary` plus a `notes.md` that holds the name and a NUL.
  - New: a UTF-16LE name at an odd offset (`\x01` + UTF-16LE) → exit 1.
  - New: `FF FE` + ASCII name + NUL → exit 1.
  - New: a clean PNG-like binary still passes and prints the note.
  - The UTF-16-without-BOM test now matches the new message.
- **Mutation check.** I ran the test file against a variant without the offset-1 decodings, and only the odd-offset test failed. So that test proves the odd-offset views are needed, since Latin-1 alone does not catch the name.

**R2 reproductions on a scratch clone** (name read from `product.ts` at runtime, never typed):

| Case | rc |
| --- | --- |
| `printf 'Welcome to <name>\n\0\n' > notes.md`, then `git add` | 1 |
| `export const name = '<name>'; // \0` in `apps/web/src/x.ts` | 1 |
| `\x01` + the UTF-16LE name in `odd.bin` | 1 |
| Unmodified tree | 0 (57 tracked files clean) |

### Verification (iteration 2)

All gates ran in the main checkout, at c42b206, with a clean tree apart from this file:

| Check | Result |
| --- | --- |
| `pnpm install --frozen-lockfile` | rc 0 (also with `--ignore-pnpmfile`) |
| `pnpm check:all` | rc 0: format OK, 14 catalog entries / 5 manifests, turbo 14/14, 57 tracked files clean, `test:root` 51 pass / 0 fail |
| `pnpm turbo run lint typecheck test build` | 14 of 14 successful |
| `node scripts/check-product-name.mjs --expect-image-prefix <repo name>` | rc 0 |
| actionlint (pinned `rhysd/actionlint@sha256:b1934ee5…9315667`) on `ci.yml` and `release.yml` | rc 0 |
| shellcheck `scripts/*.sh` | clean |
| `jq` on all four rulesets and `repo-settings.json` | OK |

I deleted every scratch copy I made: `wr01`, `r2`, `pf`, `oldpins` and `oldname`. The other entries in the scratchpad were there before this run.

### Residual notes for the lead (iteration 2)

- **The build-script allowlist arrives with Phase 1.1.** Once Next.js, NestJS or Prisma come in, pnpm 12 will want `onlyBuiltDependencies` / `allowBuilds` for packages with install scripts. That key now fails `check:pins` until the allowlist is extended in a reviewed PR. This is deliberate, but the team will hit it.
- **Allowed scalar keys are not value-pinned.** `engineStrict: false`, `savePrefix: '^'` or `catalogMode: manual` would still pass. `savePrefix` and `catalogMode` only affect `pnpm add`, and the guard checks the result anyway. Pinning `engineStrict: true` would be a two-line follow-up.
- **A project `.npmrc` is not checked.** pnpm 12 still reads registry and auth settings from it. The lockfile's integrity hashes limit the damage, but the guard does not reject a committed `.npmrc`.
- **Until the rulesets apply, `release/X.Y` is unprotected.** Any writer can push one at an unreviewed commit, and `verify` will accept a matching `vX.Y.*` tag on it. The README now says so. The publisher (a human) is the remaining check.
- **`release-create` has not been applied.** Like the other rulesets, it is untested against the live API (HTTP 403 on Free/private). After the repo goes public, confirm that a non-admin push creating `release/9.9` is rejected (GH013) and that the lead can still cut a release branch.

---

_Fixed: 2026-11-08T18:09:18Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 2_
