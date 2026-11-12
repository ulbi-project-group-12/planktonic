---
phase: 01-repo-foundation-and-ci-cd-lead
reviewed: 2026-11-08T17:36:42Z
depth: standard
files_reviewed: 57
files_reviewed_list:
  - .claude/CLAUDE.md
  - .dockerignore
  - .editorconfig
  - .env.example
  - .gitattributes
  - .github/CODEOWNERS
  - .github/actions/setup/action.yml
  - .github/pull_request_template.md
  - .github/repo-settings.json
  - .github/rulesets/main.json
  - .github/rulesets/release.json
  - .github/workflows/ci.yml
  - .github/workflows/release.yml
  - .gitignore
  - .husky/pre-commit
  - .nvmrc
  - .prettierignore
  - CONTRIBUTING.md
  - README.md
  - apps/api/Dockerfile
  - apps/api/README.md
  - apps/api/eslint.config.js
  - apps/api/package.json
  - apps/api/src/main.ts
  - apps/api/tsconfig.build.json
  - apps/api/tsconfig.json
  - apps/web/Dockerfile
  - apps/web/README.md
  - apps/web/eslint.config.js
  - apps/web/package.json
  - apps/web/src/main.ts
  - apps/web/tsconfig.build.json
  - apps/web/tsconfig.json
  - eslint.config.js
  - package.json
  - packages/config/eslint.config.js
  - packages/config/eslint/index.js
  - packages/config/package.json
  - packages/config/prettier/index.js
  - packages/config/product.ts
  - packages/config/tsconfig.json
  - packages/config/tsconfig/base.json
  - packages/contracts/eslint.config.js
  - packages/contracts/package.json
  - packages/contracts/src/index.ts
  - packages/contracts/src/ticket-key.test.ts
  - packages/contracts/src/ticket-key.ts
  - packages/contracts/tsconfig.build.json
  - packages/contracts/tsconfig.json
  - packages/contracts/vitest.config.ts
  - pnpm-workspace.yaml
  - scripts/apply-repo-rules.sh
  - scripts/check-pins.mjs
  - scripts/check-product-name.mjs
  - scripts/check-product-name.test.mjs
  - scripts/pr-hygiene.sh
  - turbo.json
findings:
  critical: 0
  warning: 11
  info: 9
  total: 20
  necessity: 1
status: issues_found
---

# Phase 1: Code Review Report

**Reviewed:** 2026-11-08T17:36:42Z
**Depth:** standard
**Files Reviewed:** 57
**Status:** issues_found

## Summary

I reviewed all 57 files in scope against the locked decisions D-01..D-36 in 01-CONTEXT.md. Intended placeholders were not flagged: the no-op app scripts, the deploy stub, the plan-gated rulesets that can't apply on GitHub Free, and the README/CLAUDE.md allowlist entries. I checked the findings below against the real files. The two guard bypasses (WR-01, WR-02, WR-05) were reproduced on throwaway copies in the session scratchpad, and no repo file was changed.

What holds up:
- **Workflow security.** Every action is pinned to a full SHA. Permissions are minimal (`contents: read` in CI; `packages: write` only in the `images` job). The CI uses `pull_request`, not `pull_request_target`, and sets `persist-credentials: false`. The PR title reaches the script only through `env:` and is never echoed into a workflow command. The `names` step rejects a multi-line `PRODUCT_NAME`.
- **Shell scripts.** shellcheck reports nothing. `apply-repo-rules.sh` uses `set -euo pipefail`. `pr-hygiene.sh` is deliberately non-failing.
- **Ruleset JSON.** It matches the REST schema: `OrganizationAdmin` with `actor_id: 1`, `bypass_mode: pull_request`, `integration_id: 15368` (GitHub Actions), `allowed_merge_methods` and `~DEFAULT_BRANCH`.
- **Local runs.** `check:pins`, `check:name` and `format:check` all pass on the tree.

Key concerns:
1. **The pin guard gives false passes.** `check-pins` stops reading the catalog at a column-0 YAML comment, and it never looks at `overrides`.
2. **`release.yml` publishes from any published tag.** It doesn't check the tag format, which branch the commit is on, or whether CI passed. `latest=auto` also moves `latest` backwards on a hotfix to an older line.
3. **The name guard ignores file paths and UTF-16 files.** `PRODUCT_IMAGE_PREFIX` is a second, unchecked source of the image name.
4. **Supply-chain review gaps.** The lockfile is left unowned on an incorrect premise, and the Dockerfiles give the runtime user write access to the app code.
5. **Doc commands that fail or don't match CI.** The release-branch cleanup is blocked once the rulesets are applied, and the CONTRIBUTING pre-push list omits three checks that CI runs.

There are no Critical findings. The only workflow with write access (`release.yml`) needs write access to the repo to trigger, and no deploy exists yet.

## Warnings

### WR-01: check-pins false pass — a column-0 comment inside `catalog:` hides every entry after it

**File:** `scripts/check-pins.mjs:29`
**Issue:** The catalog is cut out with `workspace.split(/^catalog:[ \t]*$/m)[1]?.split(/^\S/m)[0]`, so the block ends at the first line that starts with any non-space character, `#` included. In YAML, a comment at column 0 does not end a block mapping, so pnpm still reads the entries after it as catalog entries. I reproduced this on a copy: I appended `# security bump, remove later` and then `  lodash: ^4.17.0` to the catalog. `check-pins` printed `check-pins: 1 manifests OK` and exited 0, while `yaml.parse` returned `catalog.lodash === '^4.17.0'`. This is exactly the kind of comment the README invites ("Emergency escape for a security fix"). 01-01-SUMMARY notes the catalog has no comments "so the 01-02 pin guard can parse it line by line", so this is a known fragility that does not fail closed.
**Fix:** Parse real YAML instead of using regex slicing. `yaml` is already in the lockfile (a vite peer), but the guard is meant to have zero dependencies, so the minimal fix is to skip comment lines rather than end the block on them:
```js
const after = workspace.split(/^catalog:[ \t]*$/m)[1];
const catalogLines = [];
for (const line of (after ?? '').split('\n')) {
  if (/^\s*(#.*)?$/.test(line)) continue;      // blank or comment at any indent: keep scanning
  if (/^\S/.test(line)) break;                  // next top-level key
  catalogLines.push(line);
}
```
Add a regression case with a column-0 comment, either to a node:test file for `check-pins` or to the existing negative-proof script.

### WR-02: check-pins ignores `overrides` and other resolution-changing keys

**File:** `scripts/check-pins.mjs:11-16, 28-29`
**Issue:** The guard checks only the four dependency fields of `{apps,packages}/*/package.json` and the `catalog:` block. It never reads `overrides:`, `packageExtensions:`, `patchedDependencies:` or `catalogs:` in `pnpm-workspace.yaml`, or `pnpm.overrides` / `resolutions` in the root `package.json`. pnpm honours all of these. I reproduced it on a copy: appending `overrides: { zod: ^4.0.0, esbuild: npm:evil-pkg@latest }` to the workspace file and adding `pnpm.overrides {"vite>esbuild": "*"}` and `resolutions` to `package.json` still printed `OK`, exit 0. An `npm:` alias override swaps a transitive package for a different one entirely. The manifest glob is also a hand-kept copy of the `packages:` globs, so a future `tools/*` workspace would go unchecked.
**Fix:** Fail when any override-like key is present, unless every value is an exact version. Derive the manifest list from the `packages:` globs:
```js
for (const key of ['overrides', 'packageExtensions', 'patchedDependencies', 'catalogs']) {
  if (new RegExp(`^${key}:`, 'm').test(workspace)) errors.push(`pnpm-workspace.yaml: \`${key}:\` is not allowed (or must hold exact pins only)`);
}
const root = JSON.parse(readFileSync('package.json', 'utf8'));
if (root.pnpm?.overrides || root.resolutions || root.overrides) errors.push('package.json: overrides/resolutions are not allowed');
```

### WR-03: release.yml builds and pushes images for any published tag, from any commit, with no CI gate

**File:** `.github/workflows/release.yml:11-13, 34-36, 77-84`; `.github/rulesets/` (no tag ruleset)
**Issue:** Anyone with write access can publish a release whose tag points at any commit: a feature branch, an unmerged commit, or a commit whose CI is red. The workflow then pushes `ghcr.io/<owner>/<slug>-{web,api}` and possibly `latest` (see WR-04). Nothing checks that:
- (a) the tag matches the documented `vX.Y.Z[-pre]` format. A non-semver tag such as `v0.2` quietly gets no bare-version tag, which contradicts the README's tag list.
- (b) the commit is reachable from `release/*`.
- (c) the commit passed `ci`.

Tags are not protected either. Neither ruleset targets `tag`, so a writer can delete a `v*` tag and recreate it on another commit. This becomes a real supply-chain hole once the Phase 4 deploy pulls these images. D-15 and D-18 describe the release as being cut from a `release/x.y` branch, but the workflow does not enforce that.
**Fix:** Add a guard step before login (checkout with `fetch-depth: 0`) and a tag ruleset:
```yaml
- name: verify release source
  env:
    TAG: ${{ github.event.release.tag_name }}
  run: |
    [[ "$TAG" =~ ^v(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(-[0-9A-Za-z.-]+)?$ ]] \
      || { echo "::error::tag must be vX.Y.Z[-pre]"; exit 1; }
    git branch -r --contains "$GITHUB_SHA" | grep -qE '^\s*origin/release/' \
      || { echo "::error::tagged commit is not on a release/* branch"; exit 1; }
```
Also add `.github/rulesets/tags.json` (`"target": "tag"`, `refs/tags/v*`, rules `creation`/`update`/`deletion` with the same PR-only admin bypass). Optionally require a successful `ci` check run on `$GITHUB_SHA` via `gh api repos/$REPO/commits/$GITHUB_SHA/check-runs`.

### WR-04: `latest` moves backwards on a hotfix to an older line, and parallel releases race for it

**File:** `.github/workflows/release.yml:17-19, 77-84`; `README.md:123, 129-130`
**Issue:** With the default `flavor: latest=auto`, metadata-action adds `latest` to every non-prerelease semver tag. It does not compare that tag with tags already in GHCR. The README's own hotfix flow breaks this: after `v0.2.0` ships, publishing `v0.1.1` from `release/0.1` retags `latest` to the 0.1 line. The concurrency group is keyed per tag (`release-${{ tag_name }}`), so two releases published close together run in parallel. Whichever push finishes last owns `latest`, even if it is the older version. The CI/CD checklist calls this out for deploy workflows: an older run finishes last and overwrites the newer one.
**Fix:** Either drop `latest` (`flavor: latest=false`; Phase 4 deploys by explicit tag, which also matches the README rollback text), or compute it. Set `latest=${{ steps.guard.outputs.is_newest }}`, where the guard step compares `$TAG` with `git tag -l 'v*' --sort=-v:refname | grep -v -- - | head -1`. Use one global group for `latest` (`group: release-latest`, `cancel-in-progress: false`), or simply serialize all releases with `group: release`.

### WR-05: name-guard false pass — file and directory names, and UTF-16 text, are never checked

**File:** `scripts/check-product-name.mjs:78-99` (path never tested), `:91` (NUL means binary)
**Issue:** The guard scans file contents only. A tracked path such as `docs/ulbigram-notes/a.txt` or `apps/ulbigram-bot/…` passes. I reproduced this in a fixture repo: the guard printed `4 tracked files clean` and exited 0. Directory and file names block a rename (D-33, D-36) just as much as content does. Separately, any file containing a NUL byte is treated as binary and skipped, so a UTF-16 text file containing the name also passes (reproduced). The guard prints "N tracked files clean" in both cases, which reads as proof.
**Fix:**
```js
for (const file of files) {
  if (!allowlisted(file) && terms.some((t) => file.toLowerCase().includes(t))) {
    hits.push(`${file}: product name in a path`);
  }
  // ...content scan as today
}
```
For text that contains NULs, also decode as UTF-16LE when the buffer starts with a BOM (`FF FE`), or at least report the skipped files instead of counting them as scanned. Add a test case for each fix.

### WR-06: `PRODUCT_IMAGE_PREFIX` is a second, unchecked source of the image name, and the "repo name == PRODUCT_SLUG" invariant is unenforced

**File:** `packages/config/product.ts:6-7, 21`; `.github/workflows/release.yml:44`
**Issue:** `release.yml` derives the image from `vars.PRODUCT_SLUG || github.event.repository.name`. `product.ts` separately hardcodes `ghcr.io/ulbi-project-group-12/${PRODUCT_SLUG}`, with the org name as a literal. Nothing reads `PRODUCT_IMAGE_PREFIX` (git grep finds only its definition and the guard's "must export" check), yet README:72-73 presents it as the single source of the GHCR prefix. If someone sets `vars.PRODUCT_SLUG`, renames the repo before editing `product.ts`, or transfers the org, the real image names drift from the constant, and no check catches it. The comment's invariant ("the GitHub repository name must stay equal to PRODUCT_SLUG") is documentation only. D-05 asks for the prefix to be defined once.
**Fix:** Either delete `PRODUCT_IMAGE_PREFIX` (and its entry in the guard's required exports), or enforce it. In the `name-guard` CI job, compare the slug read from `product.ts` with `${{ vars.PRODUCT_SLUG || github.event.repository.name }}` and fail on a mismatch. Build the owner part from `github.repository_owner` instead of the literal org.

### WR-07: pnpm-lock.yaml is deliberately unowned in CODEOWNERS, on an incorrect premise

**File:** `.github/CODEOWNERS:29-31`
**Issue:** The rationale says "every version change already touches the owned catalog in pnpm-workspace.yaml". That is false for lockfile-only edits. Changing a transitive dependency's resolved version or its `resolution: {integrity, tarball}` changes what `pnpm install --frozen-lockfile` installs in CI and in images, with no catalog or manifest change. The lockfile is the supply-chain artifact that actually gets installed. Once the rulesets apply, `require_code_owner_review` will still let such a PR merge with any one teammate's approval.
**Fix:** Add `/pnpm-lock.yaml @soadap`. If review load is the worry, keep it owned and add a CI check that fails when `pnpm-lock.yaml` changes without a `package.json` or `pnpm-workspace.yaml` change in the same PR.

### WR-08: Dockerfiles make the application code writable by the runtime user

**File:** `apps/api/Dockerfile:10-12`, `apps/web/Dockerfile:10-12`
**Issue:** `COPY --chown=node:node` gives ownership of `/app/package.json` and `/app/src` to the same non-root user the process runs as. A compromised process (RCE, path-traversal write) can then rewrite its own code, and the change persists across `docker restart` of the same container. Running as non-root (D-17) is undercut by owner-writable code. Phase 1.1 and Phase 4 will copy this pattern into the real multi-stage builds.
**Fix:** Keep the files root-owned and read-only. `node` only needs read access:
```dockerfile
COPY apps/api/package.json ./package.json
COPY apps/api/src ./src
USER node
```
If a writable directory is needed later, create one explicitly (`RUN mkdir /app/tmp && chown node:node /app/tmp`) and run with `--read-only` plus a tmpfs.

### WR-09: apply-repo-rules.sh ruleset upsert can target an org ruleset, parse stderr as JSON, and fail half-applied

**File:** `scripts/apply-repo-rules.sh:49-50, 58, 75-76`
**Issue:**
- (a) `GET repos/$REPO/rulesets` defaults to `includes_parents=true`, so org-level rulesets come back too. If one shares a name (`main`, `release`), `select(.name == $name) | .id` returns the org ruleset's id. If both match, it returns two ids joined by a newline. Either way, `PUT repos/$REPO/rulesets/$id` fails or hits the wrong URL. This is unlikely while the org is on Free, but the org rulesets that a Team plan unlocks would trigger it.
- (b) `existing="$(gh api … 2>&1)"` folds stderr into the JSON on success, so any `gh` notice breaks the `jq` parse.
- (c) The external `jq` binary is not checked up front. Step 1, and step 2 when it is not skipped, have already changed the repo by the time a missing `jq` aborts with status 127.
- (d) No `--paginate`.
- (e) Step 2 PUTs `allowed_actions=all`, which silently resets a stricter existing policy (`selected` / `local_only`) to `all`.
**Fix:**
```bash
command -v jq >/dev/null || { echo "ERROR: jq is required" >&2; exit 1; }   # before step 1
existing="$(gh api --paginate "repos/$REPO/rulesets?includes_parents=false" 2>"$errf")" || { existing="$(<"$errf")"; …; }
id="$(jq -r --arg name "$name" '[.[] | select(.name == $name and .source_type == "Repository") | .id] | first // empty' <<<"$existing")"
```
For step 2, read the current `allowed_actions` and send it back unchanged with only `sha_pinning_required=true`.

### WR-10: README test-release cleanup stops working once the rulesets are applied

**File:** `README.md:135-138`; `.github/rulesets/release.json:18-20`
**Issue:** The README says to delete the test branch with `git push origin --delete release/0.0`. `release.json` has a `deletion` rule on `refs/heads/release/*`, and the only bypass is `OrganizationAdmin` in `pull_request` mode, which cannot exempt a branch deletion. Once the lead runs `apply-repo-rules.sh`, as the README itself instructs at :166-168, the documented command is rejected (GH013) and there is no documented way out. It works today only because the rulesets are not applied.
**Fix:** Either exclude the throwaway line (`"exclude": ["refs/heads/release/0.0"]`), or document that the cleanup must happen before the rulesets are applied (or by temporarily disabling the ruleset). Alternatively, run test releases from a branch name the ruleset does not cover.

### WR-11: CONTRIBUTING "Before pushing, run" omits three checks that CI enforces

**File:** `CONTRIBUTING.md:51-57`; compare `.github/workflows/ci.yml:36-39, 88-89`
**Issue:** The list is `turbo run lint typecheck test build`, `check:pins` and `check:name`. The required `lint` check also runs `pnpm format:check` and `pnpm lint:root`, and the required `name-guard` check also runs the guard tests (`pnpm test:root`). A contributor who follows the doc can push a branch that fails a required check. For example, a file the pre-commit hook didn't touch, such as an unstaged rename or a file committed with `--no-verify`, fails `format:check`, and a `scripts/` change fails `lint:root`.
**Fix:**
```sh
pnpm format:check
pnpm check:pins
pnpm lint:root
pnpm turbo run lint typecheck test build
pnpm check:name
pnpm test:root
```
Better still, add a root `"ci": "…"` script that runs exactly the CI steps, and reference it from both the README and CONTRIBUTING.

## Info

### IN-01: Phantom requirement — `pnpm-lock.yaml` exemption in the name-guard allowlist

**File:** `scripts/check-product-name.mjs:22`
**Category:** necessity
**Issue:** The lockfile contains the name 0 times (`grep -ci` gives 0), and every workspace package uses the neutral `@app/*` scope (D-05), so no package name can carry it. The only way the name could get into the lockfile is through importer paths such as `apps/<name>-bot`, which is exactly the drift the guard should catch. This rests on judgment: a future third-party dependency could contain the string.
**Fix:** Remove `'pnpm-lock.yaml'` from `ALLOWED_FILES` (and from the README list at :79-80), or keep it with a comment that names the concrete case it covers.

### IN-02: The release workflow's GHA layer cache never hits across releases and adds a poisoning surface

**File:** `.github/workflows/release.yml:96-97`
**Issue:** Actions caches are scoped to the ref. Each release runs on its own `refs/tags/v…` ref, which can read only its own caches and the default branch's caches, and no run on `main` writes `scope=web` / `scope=api`. `cache-to: mode=max` therefore fills the 10 GB quota with entries only a re-run of the same tag can use. Restoring caches into a publishing job is also a known cache-poisoning pattern.
**Fix:** Drop `cache-from` / `cache-to` from the release job (images are small and builds are clean). Alternatively, warm the cache from a `push: main` workflow, if speed matters later.

### IN-03: The pr-hygiene title check goes stale, is looser than `TicketKey`, and counts the lockfile

**File:** `.github/workflows/ci.yml:10-11`; `scripts/pr-hygiene.sh:21-29`; `.github/pull_request_template.md:29`
**Issue:**
- (a) `pull_request` without `types:` does not include `edited`, so fixing the title leaves the old warning on the PR.
- (b) `UL-[0-9]+` is unanchored and accepts `UL-0`, `UL-01` and `FOUL-12`, while `@app/contracts` `TICKET_KEY_PATTERN` rejects them.
- (c) The 600-line count includes `pnpm-lock.yaml`, but the template and CONTRIBUTING:32 say the lockfile is excluded, so every dependency bump warns.
**Fix:** Run pr-hygiene from a separate small workflow with `types: [opened, edited, synchronize, reopened]`. Use `(^|[^A-Za-z])UL-[1-9][0-9]*([^0-9]|$)`. Either reword the doc, or subtract lockfile lines using `gh pr diff --name-only` / the files API.

### IN-04: `squash_merge_commit_message: PR_BODY` copies the PR template boilerplate into every commit on main

**File:** `.github/repo-settings.json:8`
**Issue:** The template body (the HTML comment, empty `- [ ]` items and the "Review rules" list) becomes part of every squash commit message on `main`.
**Fix:** Use `"squash_merge_commit_message": "BLANK"` (or `COMMIT_MESSAGES`), or trim the template so that what remains is worth keeping in history.

### IN-05: The CI concurrency group on main cancels pending push runs, so some main commits never get checks

**File:** `.github/workflows/ci.yml:18-20`
**Issue:** With `cancel-in-progress: false`, GitHub still cancels any pending run in the group when a newer one queues. When merges land in quick succession, the middle commits on `main` end up with cancelled checks. A release cut from such a commit has no green CI on record, which matters for WR-03(c).
**Fix:** For push events, key the group on `github.sha` (`ci-${{ github.event.pull_request.number || github.sha }}`), so every main commit gets its own run.

### IN-06: The README release-cut command branches from a possibly stale `origin/main`

**File:** `README.md:116-117`
**Issue:** `git switch -c release/x.y origin/main` uses the local remote-tracking ref. Without a fetch, the release branch can miss the latest merges.
**Fix:** `git fetch origin && git switch -c release/x.y origin/main && git push -u origin release/x.y`.

### IN-07: Dockerfiles are not code-owned, though they define the published images

**File:** `.github/CODEOWNERS:17-27`
**Issue:** `release.yml` and `.dockerignore` are lead-owned, but `apps/*/Dockerfile`, which sets the base image, build steps and runtime user of what goes to GHCR, is not. A change to `FROM` or a new `RUN curl … | sh` needs only one approval from anyone.
**Fix:** Add `/apps/*/Dockerfile @soadap`, or route it to the future `infra` team line.

### IN-08: Exotic-source and trust-downgrade protections are not set explicitly in pnpm-workspace.yaml

**File:** `pnpm-workspace.yaml:5-13`
**Issue:** `pnpm config get` reports `blockExoticSubdeps`, `trustPolicy` and `strictDepBuilds` as unset. I could not confirm pnpm 12's defaults from the repo. Without these settings, a transitive git or tarball dependency, or a package whose publish provenance weakens, would install as long as it is at least 14 days old.
**Fix:** Make the intent explicit after checking pnpm 12 support: `blockExoticSubdeps: true`, `trustPolicy: no-downgrade`, `strictDepBuilds: true` (with an empty `onlyBuiltDependencies` allowlist).

### IN-09: A matrix `fail-fast` release can leave a half-published version

**File:** `.github/workflows/release.yml:29-32`
**Issue:** If the `api` build fails after `web` has pushed, or the other way round, GHCR holds `vX.Y.Z` for one app only. With `fail-fast: true`, the other leg may also be cancelled midway. A Phase 4 deploy that pulls both tags would then fail or run mismatched versions.
**Fix:** Build both images with `push: false` (load or output to a cache), then push in a final step only after both succeed. At minimum, document that a failed release must be re-run, not superseded.

---

_Reviewed: 2026-11-08T17:36:42Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
