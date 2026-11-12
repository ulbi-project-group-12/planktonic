# Phase 1: Repo foundation and CI/CD (lead) - Context

**Gathered:** 2026-11-08 (YOLO — decisions taken from the lead's brief and the research reports; no interactive discuss)
**Status:** Ready for planning

<domain>
## Phase Boundary

The lead's share of research Phase 1 plus the image-build half of research ticket 4.2: a pnpm + Turborepo monorepo whose pipeline runs end to end (install → lint → typecheck → test → build) locally and in GitHub Actions, the repo rules around `main`, the PR template, a release workflow that builds Docker images to GHCR on `release: published`, and short English docs (README + CONTRIBUTING).

Research tickets in scope: 1.2 (monorepo), 1.3 root-tooling part (shared eslint/prettier/tsconfig + husky + lint-staged), 1.7 (CI + ruleset + CODEOWNERS), 1.8 PR-template part, 4.2 build half.

NOT in scope (Phase 1.1, the team's learning tickets — do not plan them): kickoff, Next.js skeleton, NestJS skeleton, docker-compose for dev services, CodeRabbit, README *content beyond what this phase needs*, Storybook, Steiger. Also not in scope: the deploy itself (server arrives in roadmap Phase 4).

</domain>

<decisions>
## Implementation Decisions

### Monorepo shape
- **D-01:** pnpm workspaces + Turborepo. Workspace globs `apps/*` and `packages/*`. Layout per STACK §3: `apps/web`, `apps/api`, `packages/contracts`, `packages/config`.
- **D-02:** `apps/web` and `apps/api` are **minimal placeholders only**: a `package.json` with no-op or trivial `lint`, `typecheck`, `test` and `build` scripts (plus whatever tiny source file is needed for typecheck/lint to be meaningful) so the pipeline runs end to end. **No Next.js or NestJS code or dependencies** — those skeletons are the team's Phase 1.1 tickets. Leave a short README/comment in each saying so.
- **D-03:** `packages/contracts` ships **one real zod schema with a test** (Vitest). Suggested: a `TicketKey` schema (`UL-<n>` format, the tracker key used in branch names and PR titles) or a small `HealthResponse` schema the api will later return — planner's choice, but it must be real, exported from the package entry, typed, and tested (valid + invalid cases).
- **D-04:** `packages/config` holds the shared **tsconfig base**, **ESLint flat config** and **Prettier config**; every other package consumes them (no per-package copies). Steiger/FSD presets are Phase 1.1.
- **D-05:** Neutral package scope `@app/*` (`@app/web`, `@app/api`, `@app/contracts`, `@app/config`). The **display name lives in one place** (e.g. `packages/config/src/brand.ts` or a root `brand.json`/`app.config` that docs and workflows read) so the product can be renamed later; GHCR image prefix derives from it or is defined once in the workflow env.

### Versions and supply chain
- **D-06:** Node **26 LTS** and pnpm **12.x** pinned: `.nvmrc` (or `.node-version`) + root `engines` + `packageManager` field (`pnpm@<exact>`). TypeScript **6.0.3** exactly (not 7.x).
- **D-07:** Versions come from STACK §15, **but the supply-chain rule wins: no release younger than ~14 days (cutoff 2026-10-25 for today's date 2026-11-08)**. STACK §15 was read the same day it was published, so several pins are too new — e.g. pnpm 12.18.0 (2026-11-05), eslint 10.14.0 (2026-10-30), vitest 5.1.0 (2026-11-02), typescript-eslint 8.72.1 (2026-10-26). For each such package use the **newest release published on or before the cutoff within the same major**, and record the chosen version + publish date. Exact pins only (no `^`/`~`), committed `pnpm-lock.yaml`, CI installs with `--frozen-lockfile`. Consider pnpm's `minimumReleaseAge` setting (pnpm ≥ 10.16) in `pnpm-workspace.yaml` to enforce the rule for future installs, if it works with exact pins.
- **D-08:** Respect the compatibility traps in STACK §15: typescript-eslint supports TS `<6.1`, so TS 6.0.3 is the pin.

### Root tooling
- **D-09:** husky + lint-staged pre-commit (format + lint only staged files). `.editorconfig`, `.gitignore` (node_modules, .turbo, dist, coverage, .env*, except `.env.example`), `.env.example` with **variable names only** (no values), `.nvmrc`/`engines`.
- **D-10:** Root scripts: `lint`, `typecheck`, `test`, `build`, `format`, `format:check` running through Turbo where applicable.

### CI
- **D-11:** `.github/workflows/ci.yml` on `pull_request` and `push` to `main`: checkout → pnpm setup (version from `packageManager`) → Node from `.nvmrc` with pnpm store cache → `pnpm install --frozen-lockfile` → `pnpm turbo run lint typecheck test build` with Turbo local cache persisted via `actions/cache` (no remote cache / no Vercel token). Also a `format:check`.
- **D-12:** Required status checks must have **stable job names** (e.g. `lint`, `typecheck`, `test`, `build`, or one aggregate `ci` job) so the ruleset can reference them. Planner decides one-job-many-steps vs. separate jobs; prefer separate stable check names matching STACK §14 (`lint`, `typecheck`, `test`, `build`; `steiger` is added by the team in 1.1).
- **D-13:** Pin third-party actions to a **full commit SHA** (with the version in a comment), minimal `permissions:` (`contents: read` in CI), `concurrency` that cancels superseded PR runs, and a timeout per job.
- **D-14:** PR-size warning above ~600 changed lines (STACK §14) — nice-to-have, non-blocking (planner's discretion; skip if it adds complexity).

### CD skeleton
- **D-15:** `.github/workflows/release.yml` triggers on `release: types: [published]`. It builds the web and api Docker images from **placeholder Dockerfiles** and pushes them to **GHCR**: `ghcr.io/ulbi-project-group-12/ulbigram-web` and `…/ulbigram-api`, tagged with the release tag (and `sha-<short>`), using `GITHUB_TOKEN` with `packages: write` only in that job. Use docker/metadata-action + build-push-action pinned by SHA.
- **D-16:** The **deploy job is a clearly marked stub** (echo + `# TODO(Phase 4)` with the planned steps: compose pull → one-shot migrate → up -d api×2 → /health smoke), gated on the `production` environment name only if that doesn't require settings we can't create; otherwise no environment.
- **D-17:** Placeholder Dockerfiles must actually build and run something trivial (e.g. a tiny Node script printing the app name/version) on `node:26-alpine` (pinned by digest or exact tag), non-root user, `.dockerignore`.
- **D-18:** Document the release process in README: cut `release/x.y` from `main`, then draft a GitHub Release targeting that branch with tag `vx.y.0` and press Publish; hotfix = PR to main + cherry-pick to the release branch + `vx.y.1`; rollback = redeploy the previous tag (Phase 4).

### Repo rules
- **D-19:** Ruleset on `main`: PR required (1 approval when the team arrives — set `required_approving_review_count` to 1 but note that the sole current member cannot approve own PRs; see D-21), required status checks = the CI jobs, squash merge only, no force-push, no deletion, linear history. Keep the ruleset **as code** in the repo (`.github/rulesets/main.json`) plus a small script/doc command (`gh api … --input`) to apply it.
- **D-20:** **Known platform gap (verified 2026-11-08):** the org is on GitHub Free and the repo is private, so `GET /repos/…/rulesets` and branch protection both return 403 "Upgrade to GitHub Pro or make this repository public", and org rulesets need GitHub Team. So in this phase: commit the ruleset JSON + apply script, set what IS available via the repo settings API (allow squash merge only, disable merge commits and rebase merge, `delete_branch_on_merge`, squash commit title = PR title), and report the gap. Applying the ruleset happens when the lead makes the repo public.
- **D-21:** With one org member, a ruleset that requires 1 approval would block the lead's own Phase-1 PR. When applying later, either start with 0 required approvals until teammates join, or rely on the admin bypass — document the choice in the apply script.
- **D-22:** CODEOWNERS: `@soadap` on `/.planning/`, `/.github/`, and the root configs (`/package.json`, `/pnpm-workspace.yaml`, `/pnpm-lock.yaml`? — planner decides whether the lockfile needs an owner; `/turbo.json`, `/.nvmrc`, `/packages/config/`, `/.editorconfig`, `/.husky/`, CODEOWNERS itself). Leave commented placeholders for the critical paths the team will own (`packages/contracts/**`, `apps/api/src/core/**`, `apps/api/prisma/**`, `infra/**`) per PROCESS §7.
- **D-23:** PR template `.github/pull_request_template.md`: `UL-n` ticket key line, "Done when…" checklist (keep this exact heading — it is the ticket DoD wording from the tracker), test notes, and a short reminder of the review rules (PR ≤ ~400 lines, one ticket = one PR, author answers AI comments first).
- **D-24:** Branch naming `feat/UL-n-short-slug` / `fix/UL-n-short-slug` (also `chore/`, `docs/` allowed), `UL-n` in the PR title (the tracker webhook moves tickets on it: PR opened → IN_REVIEW, merged → DONE). Documented in README + CONTRIBUTING. A lightweight CI check that the PR title contains `UL-\d+` is planner's discretion — if added it must be **non-blocking or allow an escape** (e.g. `[no-ticket]`) because the lead's GSD phase PRs carry no UL key.

### Docs
- **D-25:** README (English, short): what it is, prerequisites (Node 26, pnpm via corepack is NOT available in Node 26 → install pnpm with `npm i -g pnpm@<pin>` or the standalone script), setup, the scripts, branch/PR/`UL-n` rules, release process, link to `.planning/` and to CONTRIBUTING. CONTRIBUTING.md (English, short): workflow (ticket → branch → PR → review → squash), commit style, review SLA from PROCESS §7, GSD-is-optional note and the one-driver rule for `.planning/` (PROCESS §12).

### Process
- **D-26:** Work happens on the phase branch `gsd/phase-01-repo-foundation-and-ci-cd-lead` and merges into `main` through a PR (squash), so the PR flow itself is exercised. CI must be green on that PR and then on `main`.
- **D-27:** Do not enable CodeRabbit or any GitHub App, do not add collaborators, do not touch webhooks (the org tracker webhook already covers all repos), never print or commit secrets.

### Decisions after research (orchestrator, YOLO, 2026-11-08)
- **D-28:** pnpm **12.15.0** (2026-10-21), not 12.18.0, which is 3 days old. Toolchain pins follow the 01-RESEARCH.md version table (eslint 10.13.0, typescript-eslint 8.72.0, vitest 5.0.5 + explicit vite 8.3.5 peer, @types/node 26.6.5, …), and the same 14-day rule applies to GitHub Action releases.
- **D-29:** Node **26.13.0** is accepted as a documented exception to the 14-day rule. It is the only Node 26 LTS release (11 days old); the rule targets npm packages, and the runtime comes from nodejs.org / the official image. Record the exception in README.
- **D-30:** Visibility stays **private**. Making it public is the lead's call (it would unlock rulesets, environments, secret scanning, unlimited Actions minutes and free CodeRabbit). The phase reports the gap and ships the apply script.
- **D-31:** Ruleset (when applied): the org admin role may bypass approvals **only via pull request** (`bypass_mode: pull_request`), since the other org members have read-only access and cannot approve yet. This supersedes the two options in D-21.
- **D-32:** The test release runs **after** the phase PR merges into `main` (`release.yml` must exist on the released commit): cut `release/0.0`, publish pre-release `v0.0.1-rc.1`, check GHCR, and keep or delete the test release per README guidance.
- **D-33:** **Nothing hardcoded names the product** (lead, 2026-11-08). "ulbigram" is a working name, and renaming must be possible from one place. The package scope stays `@app/*`. The single source is `packages/config/product.ts` (display name, slug, image prefix), plus `PRODUCT_NAME` / `PRODUCT_SLUG` names (no values) in `.env.example`, which the apps read later. This concretizes D-05.
- **D-34:** Workflows and Dockerfiles never contain the literal name. GHCR image names, Docker tags, OCI labels and compose project names derive from `${{ github.repository_owner }}` / `${{ github.event.repository.name }}` (lowercased), or from a repo variable with that fallback. Dockerfiles take the name as a build-arg.
- **D-35:** **CI name guard**: a zero-dependency script reads the slug from the single source and fails when the literal product name (case-insensitive) appears in a tracked file outside an allowlist (the single-source file(s), README.md, CONTRIBUTING.md if needed, `.planning/**`, `.claude/CLAUDE.md`). A stable check name (`name-guard`) goes into the ruleset's required checks, with a test that it fails on a planted literal.
- **D-36:** README says "this project (working name ulbigram)", points to the single source, and has a short **"Renaming the project"** checklist: (1) rename the GitHub repo, (2) update `packages/config/product.ts` + the `PRODUCT_*` env values, (3) `git remote set-url origin <new-url>` in each clone, (4) run the name guard (`pnpm check:name` or the script), (5) do a test release and check the images under the new name. The rename itself will be a later `/gsd-quick` task, not a roadmap phase. The team skeletons stay **Phase 1.1**.

### Claude's Discretion
- Exact zod schema chosen for `@app/contracts` (D-03), file names inside `packages/config`, whether CI uses one matrix job or separate jobs (as long as check names are stable), whether to add the PR-title check and PR-size warning, test runner config details.

</decisions>

<specifics>
## Specific Ideas

- Image names: `ghcr.io/ulbi-project-group-12/ulbigram-web`, `ghcr.io/ulbi-project-group-12/ulbigram-api`.
- The spec (TZ-CICD-03) literally says releases happen by cutting a branch and pressing the release button in GitHub; a release created by a workflow's `GITHUB_TOKEN` does not trigger other workflows, so the human Publish press is the trigger (STACK §14).
- A test release run should be tried at the end of the phase (publish a pre-release like `v0.0.1-rc.1` from a `release/0.0` branch, check the images land in GHCR, then delete the test release/tag if appropriate) — or explained if it can't be done.

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Architecture, stack, versions
- `.planning/research/STACK.md` §0 (decisions), §3 (monorepo layout), §14 (CI/CD and release), §15 (pinned versions + compatibility traps)

### Process
- `.planning/research/PROCESS.md` §7 (code review: CODEOWNERS on critical paths, PR size, `UL-n` in branch/PR title), §12 (GSD in the team: only the lead changes `.planning/` on `main`)

### Scope
- `.planning/ROADMAP.md` Phase 1 and Phase 1.1
- `.planning/research/ROADMAP-RESEARCH.md` §7 Phase 1 table (tickets 1.2, 1.3, 1.7, 1.8) and Phase 4 ticket 4.2
- `.planning/REQUIREMENTS.md` (Phase 1 IDs: TZ-FE-02, TZ-FE-10, TZ-FE-11, TZ-FE-12, TZ-FE-16, TZ-FE-18, TZ-FE-20, TZ-BE-02, TZ-BE-10, TZ-BE-11, TZ-BE-12, TZ-BE-15, TZ-BE-16, TZ-BE-17, TZ-BE-19, TZ-PROD-10, TZ-CICD-02, TZ-CICD-03, TZ-CICD-04, TZ-CICD-05, TZ-PROCESS-06)
- `.planning/research/TZ-SPEC.md` "CI/CD" and "Production" sections (lines ~279–301)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- None — greenfield repo. Only `.planning/` and `.claude/CLAUDE.md` exist.

### Established Patterns
- The lead's tracker (`ulbitv/project-tracker`, not in this repo) runs GitHub Actions CI and a migrate-before-up deploy; nothing to copy directly.

### Integration Points
- GitHub org `ulbi-project-group-12` (Free plan), repo `ulbigram` (private). The org tracker webhook already exists for all repos — reads `UL-n` from branch names and PR titles.
- Local toolchain: Node v26.13.0 is installed; pnpm is NOT installed and corepack is not bundled with Node 26.

</code_context>

<deferred>
## Deferred Ideas

- Steiger as a required check, Storybook build, Postgres/Redis service containers, two-instance socket test, Playwright smoke (STACK §14) — added by later phases.
- Renovate/Dependabot weekly patch bumps (STACK §15) — later; would need to respect the 14-day rule.
- Turbo remote cache.

</deferred>

---

*Phase: 01-repo-foundation-and-ci-cd-lead*
*Context gathered: 2026-11-08*
