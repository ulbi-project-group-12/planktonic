---
phase: 01-repo-foundation-and-ci-cd-lead
round: 2
reviewed: 2026-11-08T18:00:03Z
depth: standard
diff_base: 93ddc6e
head: 888b0f5
files_reviewed: 15
files_reviewed_list:
  - .github/CODEOWNERS
  - .github/rulesets/tags.json
  - .github/workflows/ci.yml
  - .github/workflows/release.yml
  - CONTRIBUTING.md
  - README.md
  - apps/api/Dockerfile
  - apps/web/Dockerfile
  - package.json
  - packages/config/product.ts
  - scripts/apply-repo-rules.sh
  - scripts/check-pins.mjs
  - scripts/check-pins.test.mjs
  - scripts/check-product-name.mjs
  - scripts/check-product-name.test.mjs
findings:
  critical: 0
  warning: 3
  info: 4
  total: 7
  necessity: 0
round1:
  fixed: 9
  partially_fixed: 2
  not_fixed: 0
  regressed: 0
status: issues_found
---

# Phase 1: Code Review Report, Round 2

**Reviewed:** 2026-11-08T18:00:03Z
**Depth:** standard (round-2 re-review of `93ddc6e..888b0f5`)
**Files Reviewed:** 15
**Status:** issues_found

## Summary

I re-ran every round-1 bypass on throwaway copies in the session scratchpad and deleted them afterwards. No repo file was changed. Each guard fix closes the case it was written for:

- **WR-01.** A column-0 comment inside the catalog no longer hides the entries after it (rc 1).
- **WR-02.** Workspace `overrides` with a range or an `npm:` alias, and `pnpm.overrides` / `resolutions` with ranges, all fail. A new `tools/*` workspace is now checked.
- **WR-05.** A product-name path and UTF-16 text with a BOM both fail.
- **WR-06.** A prefix mismatch fails.

`node --test` passes 38 of 38, and shellcheck is clean.

I also tested the new pieces:

- **`verify` job.** I extracted its script and ran it against a scratch origin. The format check works, and so does the feature-branch reachability check. Shell-metacharacter tags such as `v1.0.0$(id)` and `v1.0.0-rc.1;id` are rejected before they reach git. The tag name reaches the shell only through `env:`.
- **`apply-repo-rules.sh`.** I ran it against a stubbed `gh` that returns an org ruleset with the same name, paginated output and a stderr notice. It PUT to the repository ruleset id, POSTed the missing one, and kept `allowed_actions=selected`.
- **Workflow permissions.** `permissions: {}` at the top level, `contents: read` in `verify`, `packages: write` only in `images`, and `needs` chained `verify` → `images` → `deploy`.

**Remaining concerns.** There are no Critical findings and no regressions. Three gaps remain, each next to a fix that now claims more than it delivers:

1. **`verify` accepts any `release/*` branch name.** That includes a branch any writer can push today, and the tag's version is not tied to the branch's line. The README says a tag on an unmerged commit "never becomes an image".
2. **`check-pins` is a denylist.** It misses `configDependencies`, which pnpm 12 uses to load pnpmfile hooks. That is the hook class the README says "is not allowed". The README also says the guard enforces `minimumReleaseAge`, which it never reads.
3. **The name guard still skips the UTF-8 content of any file with a NUL byte.** One NUL byte in a `.md` or `.ts` file hides the name, and a test asserts that this passes.

## Round-1 status

| Round-1 finding | Status | Evidence (round 2) |
| --- | --- | --- |
| WR-01 check-pins column-0 comment | **Fixed** | Repro (`# security bump…` + `  lodash: ^4.17.0`) → `pnpm-workspace.yaml:35: catalog lodash = "^4.17.0"`, rc 1. Also fails closed on flow style, `---`, quoted/anchored keys, a missing catalog. |
| WR-02 check-pins ignores overrides | **Fixed** (residual gap: new WR-02) | Workspace `overrides` (range and `npm:` alias), `pnpm.overrides: *` and `resolutions: ^4` → rc 1. The `tools/*` glob is checked. `configDependencies` is not denied (see WR-02 below). |
| WR-03 release.yml publishes from any tag/commit | **Partially fixed** (new WR-01) | (a) The tag format is enforced, and `v0.3` → rc 1. (b) Reachability works for feature branches, but any `release/<anything>` passes. (c) A CI gate was deliberately not added (documented in REVIEW-FIX). The tag ruleset was added. |
| WR-04 `latest` moves backwards / races | **Fixed** | `flavor: latest=false`. Per-tag concurrency is now safe because the tag sets are disjoint. |
| WR-05 name guard skips paths and UTF-16 | **Partially fixed** (new WR-03) | Path hit → rc 1. UTF-16LE/BE with a BOM → rc 1. A NUL byte in a UTF-8 file still disables the content scan → rc 0. |
| WR-06 `PRODUCT_IMAGE_PREFIX` second source | **Fixed** (follow-up: IN-03) | The prefix is now `PRODUCT_SLUG` with no owner. `--expect-image-prefix other-repo` → rc 1. CI passes the same expression `release.yml` uses. |
| WR-07 lockfile unowned | **Fixed** | `/pnpm-lock.yaml @soadap`, with a corrected rationale. |
| WR-08 runtime user can write code | **Fixed** | `--chown` removed. The files are root-owned, and `USER node` comes after the COPYs. |
| WR-09 apply-repo-rules upsert | **Fixed** | Stubbed-`gh` run: `includes_parents=false` + `source_type == "Repository"` picked id 7 over org id 1. The stderr notice did not reach jq, preflight runs before step 1, and `allowed_actions=selected` was preserved. |
| WR-10 README cleanup blocked by ruleset | **Fixed** | The README now says release branches are kept, and `release/0.0` can be deleted only before the rulesets are applied. This is consistent with `release.json` and with the `always` bypass in `tags.json`. |
| WR-11 CONTRIBUTING omits CI checks | **Fixed** (minor gap: IN-03) | `pnpm check:all` runs every CI step except the `--expect-image-prefix` comparison. |

## Warnings

### WR-01: `verify` accepts a tag on any `release/*` branch, including a writer-pushed `release/anything`, and never ties the version to the branch line

**File:** `.github/workflows/release.yml:60-65`; `.github/rulesets/release.json:18-46`; `README.md:136-138`
**Issue:** The reachability filter is `grep -E '^(main|release/[^/]+)$'`, so any branch named `release/<x>` counts as a release source. I reproduced this on a scratch origin. I pushed a feature-only commit as `release/anything` (`git push origin <feat-sha>:refs/heads/release/anything`) and ran the extracted verify script with `TAG=v0.2.0`. It printed `Tagged commit … is on: release/anything`, rc 0. The images job would then build and push that unreviewed commit.
- **Today:** while the repository is private on GitHub Free, no ruleset exists, so any writer can do this.
- **After the rulesets are applied:** `release.json` still has no `creation` rule, so creating `release/<x>` is limited only by the required status checks. A commit that is the head of any open PR already has those checks.
- **Version line:** the tag's `X.Y` is never compared with the branch. `v0.2.0` tagged on a hotfix commit of `release/0.1` passes, and so does `v5.0.0` on `release/0.1`.

The README states, without the plan-gap caveat, "A tag on a feature branch or an unmerged commit never becomes an image". REVIEW-FIX lists this only as a residual note.
**Fix:** Pin the branch to the tag's line in the verify step, and restrict release-branch creation in a ruleset:
```bash
line="${BASH_REMATCH[1]}.${BASH_REMATCH[2]}"   # capture right after the semver match
branches=$(git for-each-ref --contains "$GITHUB_SHA" --format='%(refname:lstrip=3)' refs/remotes/origin \
  | grep -Fx -e main -e "release/${line}" || true)
```
Then add a separate ruleset, for example `.github/rulesets/release-create.json`. It targets `refs/heads/release/*`, has `rules: [{ "type": "creation" }]` and an OrganizationAdmin bypass in `always` mode. Keep it separate because the existing `release` ruleset's `pull_request`-mode bypass cannot create a branch. Until the rulesets can be applied, qualify the README sentence ("once the rulesets are applied").

### WR-02: check-pins is a denylist and misses `configDependencies`, which pnpm 12 uses to load pnpmfile hooks; the README also overstates what it enforces

**File:** `scripts/check-pins.mjs:27-35, 128-134`; `README.md:65-72`
**Issue:** The guard rejects five named workspace keys and the two root `.pnpmfile.*` files, and it ignores every other top-level key. pnpm 12.15.0 supports `configDependencies` and loads pnpmfiles from them. The bundled CHANGELOG (`/opt/homebrew/lib/node_modules/pnpm/CHANGELOG.md:3275`) says: "neither the workspace `.pnpmfile.cjs` nor the pnpmfiles of config dependencies are loaded, so no `readPackage`, `updateConfig`, `afterAllResolved`, custom resolver, or custom fetcher runs". Line 3645 lists config dependencies as a pnpmfile source.

So a `readPackage` hook, which rewrites any manifest, including versions, during resolution, can come in through a key the guard never reads. That is exactly what README:70 says "is not allowed". I reproduced it on a copy by appending each of these to `pnpm-workspace.yaml`. Each one returned `check-pins: … OK`, rc 0:
- `configDependencies: { pnpm-plugin-evil: 1.0.0+sha512-… }`
- `dangerouslyAllowAllBuilds: true`
- `minimumReleaseAgeExclude: ["*"]`
- `onlyBuiltDependencies: [esbuild]`

Editing `minimumReleaseAge: 20160` to `0` in place also passes, yet README:71 says `check:pins` "enforces the rules above", and the bullets above it include the 14-day rule. CODEOWNERS owns `pnpm-workspace.yaml`, but that review is not enforced until the rulesets can be applied. The guard header says "fail closed", which a denylist cannot be.
**Fix:** Switch to an allowlist of known top-level keys, and pin the supply-chain settings:
```js
const ALLOWED_KEYS = new Set(['packages', 'catalog', 'overrides', 'minimumReleaseAge',
  'minimumReleaseAgeExclude', 'engineStrict', 'savePrefix', 'catalogMode', 'updateNotifier']);
for (const [key, block] of blocks) {
  if (!ALLOWED_KEYS.has(key)) errors.push(`${WORKSPACE}:${block.line}: \`${key}:\` is not on the allowlist`);
}
if (Number(blocks.get('minimumReleaseAge')?.inline) < 20160) errors.push(`${WORKSPACE}: minimumReleaseAge must be >= 20160`);
```
Also check that every `minimumReleaseAgeExclude` entry is `name@x.y.z` (no wildcard). Add tests for `configDependencies` and `minimumReleaseAge: 0`. As defense in depth, CI could install with `pnpm install --frozen-lockfile --ignore-pnpmfile` in `.github/actions/setup/action.yml:15`.

### WR-03: one NUL byte in a text file disables the name guard's content scan; a test asserts that it passes

**File:** `scripts/check-product-name.mjs:111-126, 150-156`; `scripts/check-product-name.test.mjs:147-152`
**Issue:** `decode()` treats any buffer containing a `0x00` byte, without a BOM, as "binary". It then scans only the two UTF-16 decodings, never the UTF-8 or ASCII bytes. So a normal UTF-8 file with the name in it passes as soon as it gains a single NUL byte. I reproduced this on a copy:
- `printf 'Welcome to ulbigram\n\0\n' > notes.md`, `git add` → `57 tracked files clean`, rc 0.
- `export const name = 'ulbigram'; // \0` in `apps/web/src/x.ts` → rc 0.

The new test `skips the raw bytes of binary files and reports that it did` writes `'acme-chat\0binary\n'` and asserts exit 0, so it locks the bypass in. A UTF-16 run at an odd byte offset inside a binary file (`\x01` + UTF-16LE name) also passes, because both decodings are misaligned. The stdout note ("raw bytes not scanned") is printed on a green run, and nobody reads it in CI. Round 1 named this case ("any file containing a NUL byte is treated as binary and skipped"). The fix added UTF-16 decoding but kept the skip for everything else.
**Fix:** Also scan the single-byte view of NUL-containing files. The terms are ASCII today, and `latin1` maps bytes 1:1:
```js
return {
  text: [bytes.toString('latin1'),
         new TextDecoder('utf-16le').decode(bytes), new TextDecoder('utf-16le').decode(bytes.subarray(1)),
         new TextDecoder('utf-16be').decode(bytes), new TextDecoder('utf-16be').decode(bytes.subarray(1))].join('\n'),
  binary: true,
};
```
A real binary that embeds the name (PNG metadata, a font) is a true positive under D-33. Add it to `ALLOWED_FILES` explicitly. Flip the test so it expects exit 1 for `acme-chat\0binary`, and add an odd-offset UTF-16 case.

## Info

### IN-01: The verify step's "tag moved" check is unreachable in CI; actions/checkout fails first

**File:** `.github/workflows/release.yml:40-43, 55-59`
**Issue:** The `verify` job's checkout uses the default ref (`refs/tags/<tag>`) with `fetch-depth: 0`. In actions/checkout `3d3c42e…` (v7.0.1), `git-source-provider.ts:188-210` fetches all tags. It then calls `testRef` (`ref-helper.ts`: `commit === revParse(ref^{commit})`) and throws "The ref … does not point to the expected commit … may have been updated after the workflow was triggered" when the tag has moved. A deleted tag fails the targeted fetch the same way. So `tag_sha != GITHUB_SHA` can never be true when the step runs. REVIEW-FIX's "a tag that had moved failed" was tested on a plain repo, without checkout's behaviour. This is harmless, but the comment and README credit the step with protection that checkout provides.
**Fix:** Keep the check as a belt-and-braces guard, but say in the comment that checkout already enforces it. Or drop it.

### IN-02: The pre-release regex accepts identifiers that are not valid SemVer, so the bare-version tag can be silently missing

**File:** `.github/workflows/release.yml:50`, `:134`; `README.md:130-131`
**Issue:** `(-[0-9A-Za-z-]+(\.[0-9A-Za-z-]+)*)?` accepts numeric identifiers with leading zeros. The extracted script accepted `v1.0.0-rc.01` (rc 0), but SemVer 2.0.0 §9 forbids leading zeros in numeric identifiers. metadata-action's `type=semver` uses the `semver` parser, so such a tag would probably get no `{{version}}` tag, and the README promises one. I did not run metadata-action to confirm this.
**Fix:** Reject leading zeros in numeric pre-release identifiers, e.g. `(-((0|[1-9][0-9]*|[0-9]*[A-Za-z-][0-9A-Za-z-]*)(\.(0|[1-9][0-9]*|[0-9]*[A-Za-z-][0-9A-Za-z-]*))*))?`.

### IN-03: The image-prefix comparison runs only in CI on PRs and main pushes, not in `check:all` and not at release time

**File:** `package.json:22`; `.github/workflows/ci.yml:94-96`; `.github/workflows/release.yml:89-114`; `CONTRIBUTING.md:52`
**Issue:** `check:all` calls `pnpm check:name` without `--expect-image-prefix`, so the local run skips the WR-06 comparison, although CONTRIBUTING says it runs "every check the required CI jobs run". Also, `release.yml` never compares `product.ts` with `vars.PRODUCT_SLUG || repo name`. If an admin sets or changes `vars.PRODUCT_SLUG` after the last CI run on the released commit, the release pushes under a name `product.ts` disagrees with. `vars.PRODUCT_NAME` is never compared with `PRODUCT_DISPLAY_NAME` at all.
**Fix:** In the `verify` job, run `node scripts/check-product-name.mjs --expect-image-prefix "$SLUG"` with `setup-node`, the same step as `name-guard`. Reword CONTRIBUTING to "every CI check except the image-prefix comparison". A local clone cannot see `vars.PRODUCT_SLUG`, so it cannot run the same comparison.

### IN-04: A tracked symlink is resolved, not read as a link, so its target text is never checked and a dangling link is skipped silently

**File:** `scripts/check-product-name.mjs:140-147`
**Issue:** `readFileSync` follows the link. The link's own content, the target path stored in git, is never scanned. A dangling link hits the `catch` and is skipped, without being counted or reported. On a copy, `ln -s ../ulbigram-missing link` + `git add` → `56 tracked files clean`, rc 0. The path check passes because the link is named `link`.
**Fix:** Use `lstatSync`. For a symlink, scan `readlinkSync(path)` as text instead of following it, and count it as scanned.

---

_Reviewed: 2026-11-08T18:00:03Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
